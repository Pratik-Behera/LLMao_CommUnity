import { mockPaymentEngine } from './PaymentEngine';
import { triggerEngine } from './TriggerEngine';
import { clickhouseService } from './ClickHouseClient';

// ─── Types ──────────────────────────────────────────────────────

interface AuditLog {
  alertId: string;
  disbursementId: string;
  amount: number;
  status: string;
  timestamp: string;
  aiReasoning: string;
  aiConfidence: number;
  zone: string;
  severities?: Record<string, number>;
}

// ─── Distribution Engine ────────────────────────────────────────

/**
 * Production Distribution Engine.
 * Handles fund disbursement logic, writes audit logs to both
 * in-memory (for UI) and ClickHouse (for persistence/analytics).
 */
class DistributionEngine {
  private auditLogs: AuditLog[] = [
    {
      alertId: "AI-PREC-091",
      disbursementId: "D-9921",
      amount: 450,
      status: "COMPLETED",
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      aiReasoning: "Localized PSI spike in West Singapore (185) with low visibility. AI recommended immediate mask subsidy disbursement.",
      aiConfidence: 94,
      zone: "West",
      severities: { west: 85, central: 40, north: 35, south: 30, east: 25 }
    },
    {
      alertId: "AI-PREC-088",
      disbursementId: "D-9915",
      amount: 1200,
      status: "COMPLETED",
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
      aiReasoning: "Island-wide rainfall forecast exceeding 50mm/h. High correlation with past flash flood trigger patterns.",
      aiConfidence: 89,
      zone: "Island-wide",
      severities: { west: 65, central: 75, north: 80, south: 70, east: 60 }
    }
  ];

  private fundPools = {
    totalPool: 45000,
    communityReserve: 35000,
    emergencyReserve: 10000,
  };

  constructor() {
    this.loadPersistedLogs();
  }

  private loadPersistedLogs() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('comm_unity_audit_logs');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with demo logs, keeping uniqueness by disbursementId
            const existingIds = new Set(this.auditLogs.map(l => l.disbursementId));
            parsed.forEach((l: AuditLog) => {
                if (!existingIds.has(l.disbursementId)) this.auditLogs.push(l);
            });
            // Sort by timestamp desc
            this.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      }
    } catch (e) {
      console.warn('[DistributionEngine] Failed to load logs from localStorage');
    }
  }

  private persistLogs() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('comm_unity_audit_logs', JSON.stringify(this.auditLogs));
      }
    } catch (e) {
      console.warn('[DistributionEngine] Failed to save logs to localStorage');
    }
  }

  /**
   * Calculate disbursement amounts for an alert.
   */
  async calculateDisbursement(alertId: string, basePayout: number) {
    console.log(`[DistributionEngine] Calculating for: ${alertId}`);
    await new Promise(r => setTimeout(r, 1200));

    const affectedUserCount = Math.floor(Math.random() * 20) + 5;
    const totalDisbursement = parseFloat((affectedUserCount * basePayout).toFixed(2));

    return {
      alertId,
      userCount: affectedUserCount,
      payoutPerUser: basePayout,
      totalDisbursement,
    };
  }

  /**
   * Execute payouts — writes to in-memory, localStorage, AND ClickHouse.
   */
  async executePayouts(alertId: string, amount: number) {
    console.log(`[DistributionEngine] Executing Payouts for: ${alertId}`);

    // Simulate payment authorization
    const result = await mockPaymentEngine.authorizePayment(`DISB-${alertId}`);

    // Fetch AI reasoning from TriggerEngine
    const alerts = await triggerEngine.getActiveAlerts();
    const currentAlert = alerts.find(a => a.id.startsWith('AI-') || a.id === alertId);

    const disbursementId = `D-${Date.now()}`;
    const auditLog: AuditLog = {
      alertId,
      disbursementId,
      amount,
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      aiReasoning: currentAlert?.reasoning || 'Manual Triggered by Admin',
      aiConfidence: currentAlert?.confidence || 100,
      zone: currentAlert?.zone || 'Island-wide',
      severities: currentAlert?.severities,
    };

    // Write to in-memory + localStorage
    this.auditLogs.unshift(auditLog);
    this.persistLogs();
    this.fundPools.totalPool -= amount;

    // Write to ClickHouse (fire-and-forget, don't block UI)
    try {
      await clickhouseService.insertDisbursement({
        decision_id: '00000000-0000-0000-0000-000000000000', // Would be real UUID from trigger_decisions
        amount,
        recipient_count: Math.ceil(amount / 50),
        status: 'COMPLETED',
        payment_hash: disbursementId,
        zone: currentAlert?.zone || 'Island-wide',
      });
      console.log(`[DistributionEngine] ClickHouse write successful: ${disbursementId}`);
    } catch (e) {
      console.warn('[DistributionEngine] ClickHouse write failed (non-blocking):', e);
    }

    return {
      status: 'SUCCESSFUL',
      summary: auditLog,
      remainingPool: this.fundPools.totalPool,
    };
  }

  /**
   * Get all audit logs (from in-memory / localStorage for UI).
   */
  async getAuditLogs(): Promise<AuditLog[]> {
    return this.auditLogs;
  }

  /**
   * Get audit logs from ClickHouse (for persistent analytics).
   */
  async getClickHouseAuditLogs(limit: number = 20) {
    try {
      const dbLogs = await clickhouseService.getRecentDisbursements(limit);
      if (dbLogs.length > 0) return dbLogs;
      return this.auditLogs;
    } catch (e) {
      console.warn('[DistributionEngine] ClickHouse query failed, falling back to in-memory');
      return this.auditLogs;
    }
  }

  /**
   * Returns current fund health health
   * Ref: cursor_docs/api_documentation.md
   */
  async getFundHealth() {
      return this.fundPools;
  }
}

export const mockDistributionEngine = new DistributionEngine();
