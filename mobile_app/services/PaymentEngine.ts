/**
 * State of the current payment transaction.
 */
export type PaymentState = 'IDLE' | 'RESOLVING' | 'GRANNING_ACCESS' | 'QUOTING' | 'WAITING_CONSENT' | 'EXECUTING' | 'COMPLETED' | 'ERROR';

export interface PaymentFlowProgress {
  state: PaymentState;
  message: string;
  transactionId?: string;
  redirectUrl?: string;
}

/**
 * Mock Payment Engine simulating Open Payments (ILP) protocols.
 * Follows the 7-step flow: Discovery -> Grant -> Quote -> Consent -> Payout.
 */
class PaymentEngine {
  private currentState: PaymentState = 'IDLE';

  /**
   * Resolves a payment pointer (e.g., $ilp.rafiki.money/alex).
   * Documented Demo Data Reference: cursor_docs/api_documentation.md
   */
  async resolvePaymentPointer(paymentPointer: string) {
    this.currentState = 'RESOLVING';
    console.log(`[PaymentEngine] Phase 1 - Resolving: ${paymentPointer}`);
    await new Promise(r => setTimeout(r, 800));
    
    // Return standard demo data if it's the alice example pointer
    if (paymentPointer === '$ilp.rafiki.money/alice') {
        return {
            authServer: "https://auth.rafiki.money",
            assetCode: "USD",
            walletAddress: "https://ilp.rafiki.money/alice"
        };
    }

    return {
      authServer: "https://auth.rafiki.money",
      assetCode: "SGD",
      walletAddress: `https://ilp.rafiki.money/wallet/${paymentPointer.replace('$', '')}`,
      paymentAccount: "https://rafiki.money/accounts/comm-unity-fund"
    };
  }

  /**
   * High-level method to orchestrate the entire payment flow.
   * Useful for the UI to consume via a single entry point.
   */
  async *startPaymentFlow(amount: string, receiverPointer: string): AsyncGenerator<PaymentFlowProgress> {
    try {
      // 1. Discovery & Resolve
      yield { state: 'RESOLVING', message: 'Discovering Wallet Address...' };
      const receiver = await this.resolvePaymentPointer(receiverPointer);
      
      // 2. Request Incoming Payment Grant
      yield { state: 'GRANNING_ACCESS', message: 'Requesting Incoming Payment Grant...' };
      await new Promise(r => setTimeout(r, 1000));
      
      // 3. Create Incoming Payment (Receiver Side) - Documented in API Docs
      yield { state: 'QUOTING', message: 'Generating Transaction Quote...' };
      const fee = (parseFloat(amount) * 0.02).toFixed(2);
      await new Promise(r => setTimeout(r, 1200));

      // 4. Outreach for Consent (Simulated Redirect)
      yield { 
        state: 'WAITING_CONSENT', 
        message: 'Awaiting Wallet Authorization...',
        redirectUrl: `https://wallet.interledger-test.dev/auth/approve?amount=${amount}&receiver=${receiverPointer}`
      };
      
      // In a real app, the component would pause here and resume after capturing the redirect.
      await new Promise(r => setTimeout(r, 3000));

      // 5. Final Execution
      yield { state: 'EXECUTING', message: 'Executing Interledger Packets...' };
      await new Promise(r => setTimeout(r, 1500));

      // 6. Completion - Using Transaction ID format from Docs
      const txId = paymentPointerMatches(receiverPointer, 'alice') ? 'OP-TX-9821-X' : `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      yield { 
        state: 'COMPLETED', 
        message: 'Payment Completed via Open Payments', 
        transactionId: txId 
      };

    } catch (error) {
      yield { state: 'ERROR', message: 'Payment Failed: ' + (error as Error).message };
    }
  }

  /**
   * Standard authorization for backend processes (like DistributionEngine).
   * Ref: cursor_docs/api_documentation.md
   */
  async authorizePayment(memo: string) {
    console.log(`[PaymentEngine] Backend Authorization for: ${memo}`);
    await new Promise(r => setTimeout(r, 1500));
    
    return {
      status: "success",
      transactionId: `OP-TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString()
    };
  }

  // --- API Compatibility Methods from Documentation ---
  
  async createIncomingPayment(walletId: string, amount: string) {
      console.log(`[Mock] Creating incoming payment for ${walletId} of ${amount}`);
      await new Promise(r => setTimeout(r, 500));
      return `https://ilp.rafiki.money/incoming-payments/${Math.random().toString(36).substr(2, 9)}`;
  }

  async generateQuote(senderWalletId: string, receiverWalletId: string, amount: string) {
      console.log(`[Mock] Generating quote between ${senderWalletId} and ${receiverWalletId}`);
      await new Promise(r => setTimeout(r, 500));
      return {
          quoteId: `Q-${Math.floor(Math.random() * 9000 + 1000)}`,
          amount: parseFloat(amount),
          fee: 0.50
      };
  }
}

function paymentPointerMatches(pointer: string, name: string) {
    return pointer.toLowerCase().includes(name.toLowerCase());
}

export const mockPaymentEngine = new PaymentEngine();
