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
   */
  async resolvePaymentPointer(paymentPointer: string) {
    this.currentState = 'RESOLVING';
    console.log(`[PaymentEngine] Phase 1 - Resolving: ${paymentPointer}`);
    await new Promise(r => setTimeout(r, 800));
    
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
      
      // 3. Create Incoming Payment (Receiver Side)
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
      // For the mock, we simulate a 2-second user "approval" delay.
      await new Promise(r => setTimeout(r, 3000));

      // 5. Final Execution
      yield { state: 'EXECUTING', message: 'Executing Interledger Packets...' };
      await new Promise(r => setTimeout(r, 1500));

      // 6. Completion
      const txId = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
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
   */
  async authorizePayment(memo: string) {
    console.log(`[PaymentEngine] Backend Authorization for: ${memo}`);
    await new Promise(r => setTimeout(r, 1500));
    return {
      status: "success",
      transactionId: `BATCH-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }
}

export const mockPaymentEngine = new PaymentEngine();
