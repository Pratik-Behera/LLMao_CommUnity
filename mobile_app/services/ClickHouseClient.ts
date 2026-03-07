/**
 * MOCK ClickHouse Client for Mobile/Frontend Demo.
 */
class ClickHouseService {
  async insertSensorReadings(readings: any[]) { return; }
  async getSensorTrend(metric: string, region: string, hours: number = 3) { 
    return [{ hour: new Date().toISOString(), avg_value: 50 }]; 
  }
  async getLatestReadings() { return []; }
  async insertTriggerDecision(decision: any) { return; }
  async getRecentDecisions(limit: number = 20) { return []; }
  async insertDisbursement(record: any) { return; }
  async getRecentDisbursements(limit: number = 20) { return []; }
}

export const clickhouseService = new ClickHouseService();
