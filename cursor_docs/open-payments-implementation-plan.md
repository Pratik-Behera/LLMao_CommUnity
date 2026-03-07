# Open Payments Implementation Plan - CommUnity Portal

This document outlines the step-by-step technical plan to integrate the Interledger Open Payments protocol into the CommUnity React Native application.

## Overview
Open Payments is a standard API built on top of the Interledger Protocol (ILP). It allows apps to facilitate payments between wallets without knowing the underlying banking details, using only a human-readable **Payment Pointer** (e.g., `$ilp.rafiki.money/alex`).

---

## Phase 1: Environment Setup
1.  **Library Installation**: Add the Open Payments SDK to the project.
    ```bash
    npm install @interledger/open-payments
    ```
2.  **Key Provisioning**: Open Payments requires Ed25519 keys for signing requests.
    - Generate a public/private key pair.
    - Host the public key as a JWKS (JSON Web Key Set) at a reachable URL (e.g., `https://community-app.com/jwks.json`).
3.  **Client Initialization**: Create an `AuthenticatedClient` in the `PaymentEngine`.
    ```typescript
    const client = await createAuthenticatedClient({
      walletAddressUrl: 'https://community-app.com/portal',
      keyId: 'f00-b4r',
      privateKey: PRIVATE_KEY_ENV
    });
    ```

---

## Phase 2: Wallet Discovery & Setup
1.  **Resolve Pointers**: When a user enters a wallet address (Payment Pointer), the app must resolve it to get the `authServer` and `resourceServer`.
2.  **Create Incoming Payment (Receiver Side)**:
    - The portal requests a grant to the receiver's (Circle Fund) wallet.
    - Create an `IncomingPayment` resource defining the amount expected (e.g., "S$10").

---

## Phase 3: Quote & Consent
1.  **Generate Quote (Sender Side)**:
    - Request a grant from the sender's (Member) wallet.
    - Create a `Quote` to calculate the exact ILP amount to be debited, including network fees.
2.  **Outgoing Payment Grant (User Consent)**:
    - Request an `OutgoingPayment` grant.
    - **Redirect Flow**: The app must open a browser/InAppBrowser to the `interact.redirect` URL.
    - The member signs in to their wallet provider and clicks "Approve".

---

## Phase 4: Finalization & Execution
1.  **Grant Continuation**: Capture the `interact_ref` from the redirect URI.
2.  **Finalize Token**: Call `client.grant.continue` to get the final access token.
3.  **Execute Payout**: Create the `OutgoingPayment` resource on the member's wallet.
4.  **Verification**: Poll the status until it changes from `PENDING` to `COMPLETED`.

---

## Phase 5: Error Handling & Security
- **Retry Logic**: Handle transient network failures during ILP packet forwarding.
- **Nonce Verification**: Ensure all grant requests include a unique nonce to prevent replay attacks.
- **Audit Logging**: Store every `transactionId` returned by the `OutgoingPayment` in the `DistributionEngine` logs.

---

## Phase 6: Testing & Sandbox
1.  **Test Wallet**: Use [https://wallet.interledger-test.dev](https://wallet.interledger-test.dev) to create sandbox accounts and generate test payment pointers (e.g., `$razor.test/alice`).
2.  **Reference Flow**: Study the [Test Boutique](https://boutique.interledger-test.dev) to observe a production-like checkout using the Open Payments SDK.
3.  **Mock Integration**: Until production keys are provisioned, use these test pointers with the `PaymentEngine` to simulate successful grants.

## Implementation Checklist
- [ ] Setup JWKS endpoint.
- [ ] Implement `resolvePointer` in `PaymentEngine`.
- [ ] Implement browser redirect logic for user consent.
- [ ] Wire the "Pay Now" button to trigger Phases 2-4.
- [ ] Validate flow against the **Interledger Test Wallet**.
