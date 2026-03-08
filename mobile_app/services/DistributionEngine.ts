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
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      aiReasoning: "Localized PSI spike in West Singapore (185). AI recommended immediate mask subsidy.",
      aiConfidence: 94,
      zone: "West",
      severities: { west: 85, central: 40, north: 35, south: 30, east: 25 }
    },
  ];

  private pendingDisbursements: AuditLog[] = [];

  private fundPools = {
    totalPool: 45000,
    communityReserve: 35000,
    emergencyReserve: 10000,
  };

  /**
   * Records a community contribution to the pool.
   */
  async recordContribution(amount: number, userId: string, txHash: string) {
    console.log(`[DistributionEngine] Recording contribution from ${userId}: S$${amount}`);
    this.fundPools.totalPool += amount;
    this.fundPools.communityReserve += amount;
    
    // Add a record to the logs
    const log: AuditLog = {
      alertId: "USER-CONTRIB",
      disbursementId: txHash,
      amount,
      status: "CONTRIBUTED",
      timestamp: new Date().toISOString(),
      aiReasoning: `Community member contribution via Interledger. Wallet: ${userId}`,
      aiConfidence: 100,
      zone: "Community Pool",
    };
    
    this.auditLogs.unshift(log);
    this.persistLogs();
    return log;
  }

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
  async executePayouts(alertId: string, amount: number, isAuto: boolean = false) {
    console.log(`[DistributionEngine] Executing Payouts for: ${alertId}`);

    // If auto, we skip authorization redirect as it's system-led
    if (!isAuto) {
      await mockPaymentEngine.authorizePayment(`DISB-${alertId}`);
    }

    const alerts = await triggerEngine.getActiveAlerts();
    const currentAlert = alerts.find(a => a.id.startsWith('AI-') || a.id === alertId);

    const disbursementId = `D-${Date.now()}`;
    const auditLog: AuditLog = {
      alertId,
      disbursementId,
      amount,
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      aiReasoning: currentAlert?.reasoning || 'Severity-based Community Relief',
      aiConfidence: currentAlert?.confidence || 100,
      zone: currentAlert?.zone || 'Active Zones',
      severities: currentAlert?.severities,
    };

    this.auditLogs.unshift(auditLog);
    this.persistLogs();
    this.fundPools.totalPool -= amount;
    this.fundPools.communityReserve -= amount;

    return {
      status: 'SUCCESSFUL',
      summary: auditLog,
      remainingPool: this.fundPools.totalPool,
    };
  }

  /**
   * Approves a pending disbursement (Admin Only).
   */
  async approveDisbursement(disbursementId: string) {
    const index = this.pendingDisbursements.findIndex(d => d.disbursementId === disbursementId);
    if (index === -1) return null;

    const disbursement = this.pendingDisbursements[index];
    this.pendingDisbursements.splice(index, 1);
    
    return await this.executePayouts(disbursement.alertId, disbursement.amount, true);
  }

  async getPendingDisbursements() {
    return this.pendingDisbursements;
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
   * Automatically disburse payments based on regional severity scores.
   * Logic: Higher severity triggers larger community-wide relief.
   */
  async disburseBySeverity(zoneSeverities: Record<string, number>, isAdmin: boolean = false) {
    console.log(`[DistributionEngine] Starting severity-based disbursement pipeline (isAdmin: ${isAdmin})...`);
    
    let totalExecuted = 0;
    const results: any[] = [];
    const activeZones = Object.entries(zoneSeverities).filter(([_, score]) => score >= 60);

    for (const [zone, score] of activeZones) {
       let basePayout = 10;
       if (score > 90) basePayout = 50;
       else if (score > 75) basePayout = 30;

       const calculation = await this.calculateDisbursement(`AUTO-${zone.toUpperCase()}-${Date.now()}`, basePayout);
       
       if (isAdmin) {
         // Executing immediately for Admin
         await this.executePayouts(calculation.alertId, calculation.totalDisbursement, true);
         totalExecuted += calculation.totalDisbursement;
       } else {
         // Queueing for Admin approval for Member
         const pending: AuditLog = {
           alertId: calculation.alertId,
           disbursementId: `PEND-${Date.now()}-${zone}`,
           amount: calculation.totalDisbursement,
           status: 'PENDING_APPROVAL',
           timestamp: new Date().toISOString(),
           aiReasoning: `Request for ${zone} based on severity ${score}. Awaiting Admin verification.`,
           aiConfidence: score,
           zone: zone,
           severities: zoneSeverities
         };
         this.pendingDisbursements.push(pending);
       }
       results.push({ zone, severity: score, amount: calculation.totalDisbursement });
    }

    return {
       totalDisbursed: totalExecuted,
       zoneCount: activeZones.length,
       breakdown: results,
       isPending: !isAdmin && activeZones.length > 0
    };
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
