# Mock API & Engine Documentation

For the rapid prototyping phase, all external API calls will be simulated using local asynchronous JavaScript classes/services. These act as placeholders so the frontend UI can be built rapidly without waiting for backend dependencies.

## 1. Mock Payment Engine (`services/PaymentEngine.ts`)

This engine simulates the Open Payments API using dummy test wallets.

### Methods:
- `async resolvePaymentPointer(paymentPointer)`
  - **Action**: Simulates fetching the Open Payments server URL and metadata for a given pointer (e.g., `$ilp.rafiki.money/alice`).
  - **Returns**: `{"authServer": "https://auth.rafiki.money", "assetCode": "USD", "walletAddress": "https://ilp.rafiki.money/alice"}`.
- `async createIncomingPayment(walletId, amount)`
  - **Returns**: A mock incoming payment URL or ID.
- `async generateQuote(senderWalletId, receiverWalletId, amount)`
  - **Returns**: A mock quote object `{"quoteId": "Q-1234", "amount": amount, "fee": 0.50}`.
- `async authorizePayment(quoteId)`
  - **Returns**: `{"status": "success", "transactionId": "OP-TX-9821-X", "timestamp": "2023-10-12T14:30:00Z"}`.
  - *Used in the `payment_success` flow.*

## 2. Mock Trigger Engine (AI-Enhanced)
`services/TriggerEngine.ts`

### AI Decision Flow
Instead of hardcoded thresholds, the engine evaluates multidimensional environmental signals via LLM.

**Inputs:**
- `psi_current`: Current reading
- `psi_trend_3h`: Array of readings over 3 hours
- `rainfall`: mm/h
- `temperature`: Celsius
- `historical_pattern_match`: Correlation with past disaster months

**Decision Schema (`DecisionJSON`):**
```json
{
  "trigger": boolean,
  "confidence": number, (0-100)
  "reasoning": string, (Displayed on audit UI)
  "recommended_zone_boundaries": string[]
}
```

### Methods
- `evaluateTrigger(sensors: EnvironmentData): Promise<DecisionJSON>`
- `getPublicReasoning(): string`
- `async getActiveAlerts()`
  - **Returns**: Array of active alerts, e.g., `[{"zone": "Brooklyn Heights", "type": "Severe Weather", "status": "Active"}]`.
- `async simulateManualTrigger(zone, severity, grantType)`
  - **Action**: Pushes a new alert into the mock state and triggers the Distribution Engine.
  - **Returns**: `{"status": "triggered", "eventId": "EV-5542"}`.

## 3. Mock Distribution Engine (`services/DistributionEngine.ts`)

Handles the business logic for calculating aid and disbursing funds.

### Methods:
- `async calculateDisbursement(eventId, totalPool)`
  - **Action**: Reads the event severity, determines how many mock users are affected, and calculates the payout per user.
  - **Returns**: Total disbursement amount and an array of `affectedUsers`.
- `async executePayouts(eventId)`
  - **Action**: Calls `PaymentEngine.authorizePayment()` for each affected user. Updates the `payment_audit` log database.
  - **Returns**: `{"successCount": 12, "failedCount": 0, "totalDisbursed": 4500}`.

## Data Models (Mock State)
- **Dummy Users**: Array of user objects with `walletId`, `name`, `role` (Admin/Member), `zone`.
- **Audit Logs**: Array of transaction objects to populate the `payment_audit` screen.
- **Fund Health**: Object tracking `totalPool`, `communityReserve`, `adminReserve`.
