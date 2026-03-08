/**
 * State of the current payment transaction.
 */
export type PaymentState = 'IDLE' | 'RESOLVING' | 'GRANNING_ACCESS' | 'QUOTING' | 'WAITING_CONSENT' | 'REQUIRES_USER_VERIFICATION' | 'VERIFYING' | 'EXECUTING' | 'COMPLETED' | 'ERROR';

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
    
    // Normalize $pointer to https://url
    const url = paymentPointer.replace('$', 'https://');

    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        },
        // In a real Open Payments app, you'd use the Open Payments SDK
        // but since we are in a demo, we hit the discovery endpoint directly.
      });

      if (!res.ok) {
        throw new Error(`Pointer resolution failed: ${res.status}`);
      }

      const walletAddress = await res.json();
      console.log(`[PaymentEngine] Discovered Wallet: ${walletAddress.publicName} (${walletAddress.assetCode})`);
      
      return {
        authServer: walletAddress.authServer,
        assetCode: walletAddress.assetCode,
        assetScale: walletAddress.assetScale,
        walletAddress: walletAddress.id,
        publicName: walletAddress.publicName
      };
    } catch (e) {
      console.warn(`[PaymentEngine] Resolution failed, falling back to demo metadata:`, e);
      // Fallback for non-functional sandbox pointers in offline/restricted environments
      return {
        authServer: "https://auth.interledger-test.dev",
        assetCode: "SGD",
        walletAddress: `https://ilp.interledger-test.dev/wallet/${paymentPointer.replace('$', '')}`,
        paymentAccount: "https://rafiki.money/accounts/comm-unity-fund"
      };
    }
  }

  /**
   * High-level method to orchestrate the entire payment flow.
   * Useful for the UI to consume via a single entry point.
   */
  /**
   * High-level method to orchestrate the initial payment discovery and consent.
   */
  async *startPaymentFlow(amount: string, receiverPointer: string): AsyncGenerator<PaymentFlowProgress> {
    try {
      yield { state: 'RESOLVING', message: 'Resolving Payment Pointer...' };
      const receiver = await this.resolvePaymentPointer(receiverPointer);
      
      yield { state: 'GRANNING_ACCESS', message: 'Initiating GNAP Access Grant Flow...' };
      await new Promise(r => setTimeout(r, 1200));
      
      yield { state: 'QUOTING', message: 'Negotiating Transaction Quote...' };
      await new Promise(r => setTimeout(r, 1200));

      yield { 
        state: 'WAITING_CONSENT', 
        message: 'Awaiting External Wallet Authorization...',
        redirectUrl: `https://wallet.interledger-test.dev/auth/approve?amount=${amount}&receiver=${receiverPointer}`
      };
    } catch (error) {
      yield { state: 'ERROR', message: 'Discovery Failed: ' + (error as Error).message };
    }
  }

  /**
   * Finalizes the settlement after user consent is confirmed.
   * This is where the actual ILP packet streaming and hash generation happens.
   */
  async *finalizeSettlement(receiverPointer: string): AsyncGenerator<PaymentFlowProgress> {
    try {
      yield { state: 'VERIFYING', message: 'Verifying Protocol Interaction...' };
      await new Promise(r => setTimeout(r, 2000));

      yield { state: 'EXECUTING', message: 'Settling Interledger Packets...' };
      await new Promise(r => setTimeout(r, 2500));

      const txId = paymentPointerMatches(receiverPointer, 'alice') ? 'OP-TX-9821-X' : `OP-TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      yield { 
        state: 'COMPLETED', 
        message: 'ILP Transaction Successfully Settled', 
        transactionId: txId 
      };
    } catch (error) {
      yield { state: 'ERROR', message: 'Settlement Failed: ' + (error as Error).message };
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
