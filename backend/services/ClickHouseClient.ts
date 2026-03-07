import { createClient, ClickHouseClient as CHClient } from '@clickhouse/client';

/**
 * ClickHouse Client Wrapper for CommUnity.
 * Provides typed methods for inserting sensor data, AI decisions,
 * and querying trends for the Trigger Engine and Dashboard.
 */
class ClickHouseService {
  private client: CHClient;

  constructor() {
    this.client = createClient({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'community_admin',
      password: process.env.CLICKHOUSE_PASSWORD || 'comm_unity_2026',
      database: process.env.CLICKHOUSE_DB || 'community',
    });
  }

  // ─── Sensor Readings ─────────────────────────────────────────

  async insertSensorReadings(readings: Array<{
    timestamp: string;
    source: string;
    region: string;
    station_id?: string;
    metric: string;
    value: number;
    data_quality?: string;
  }>) {
    if (readings.length === 0) return;
    await this.client.insert({
      table: 'sensor_readings',
      values: readings.map(r => ({
        ...r,
        station_id: r.station_id || '',
        data_quality: r.data_quality || 'OK',
      })),
      format: 'JSONEachRow',
    });
  }

  // ─── Sensor Trend Queries ────────────────────────────────────

  async getSensorTrend(
    metric: string,
    region: string,
    hours: number = 3
  ): Promise<Array<{ hour: string; avg_value: number }>> {
    const result = await this.client.query({
      query: `
        SELECT
          toStartOfHour(timestamp) AS hour,
          avg(value) AS avg_value
        FROM sensor_readings
        WHERE metric = {metric: String}
          AND region = {region: String}
          AND timestamp > now() - INTERVAL {hours: UInt32} HOUR
        GROUP BY hour
        ORDER BY hour ASC
      `,
      query_params: { metric, region, hours },
      format: 'JSONEachRow',
    });
    return result.json();
  }

  async getLatestReadings(): Promise<Array<{
    source: string;
    region: string;
    metric: string;
    value: number;
    timestamp: string;
    data_quality: string;
  }>> {
    const result = await this.client.query({
      query: `
        SELECT source, region, metric, value,
               toString(timestamp) AS timestamp, data_quality
        FROM sensor_readings
        WHERE timestamp > now() - INTERVAL 2 HOUR
        ORDER BY timestamp DESC
        LIMIT 200
      `,
      format: 'JSONEachRow',
    });
    return result.json();
  }

  // ─── Trigger Decisions ───────────────────────────────────────

  async insertTriggerDecision(decision: {
    trigger: boolean;
    confidence: number;
    reasoning: string;
    model_used: string;
    input_snapshot: object;
    data_integrity_score: number;
    zones: string[];
    psi_at_decision: number;
    pm25_at_decision: number;
    rainfall_at_decision: number;
    temperature_at_decision: number;
    data_concerns: string[];
  }) {
    await this.client.insert({
      table: 'trigger_decisions',
      values: [{
        timestamp: new Date().toISOString(),
        trigger: decision.trigger,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        model_used: decision.model_used,
        input_snapshot: JSON.stringify(decision.input_snapshot),
        data_integrity_score: decision.data_integrity_score,
        zones: decision.zones,
        psi_at_decision: decision.psi_at_decision,
        pm25_at_decision: decision.pm25_at_decision,
        rainfall_at_decision: decision.rainfall_at_decision,
        temperature_at_decision: decision.temperature_at_decision,
        data_concerns: decision.data_concerns,
      }],
      format: 'JSONEachRow',
    });
  }

  async getRecentDecisions(limit: number = 20): Promise<any[]> {
    const result = await this.client.query({
      query: `
        SELECT *, toString(timestamp) as ts
        FROM trigger_decisions
        ORDER BY timestamp DESC
        LIMIT {limit: UInt32}
      `,
      query_params: { limit },
      format: 'JSONEachRow',
    });
    return result.json();
  }

  // ─── Disbursements ───────────────────────────────────────────

  async insertDisbursement(record: {
    decision_id: string;
    amount: number;
    recipient_count: number;
    status: string;
    payment_hash: string;
    zone: string;
  }) {
    await this.client.insert({
      table: 'disbursements',
      values: [{
        timestamp: new Date().toISOString(),
        ...record,
        currency: 'SGD',
      }],
      format: 'JSONEachRow',
    });
  }

  async getRecentDisbursements(limit: number = 20): Promise<any[]> {
    const result = await this.client.query({
      query: `
        SELECT d.*, toString(d.timestamp) as ts,
               t.reasoning as ai_reasoning,
               t.confidence as ai_confidence
        FROM disbursements d
        LEFT JOIN trigger_decisions t ON d.decision_id = t.id
        ORDER BY d.timestamp DESC
        LIMIT {limit: UInt32}
      `,
      query_params: { limit },
      format: 'JSONEachRow',
    });
    return result.json();
  }

  // ─── Ingestion Errors ────────────────────────────────────────

  async logIngestionError(error: {
    source: string;
    error_type: string;
    error_message: string;
    http_status?: number;
    retry_count?: number;
  }) {
    await this.client.insert({
      table: 'ingestion_errors',
      values: [{
        timestamp: new Date().toISOString(),
        ...error,
        http_status: error.http_status || 0,
        retry_count: error.retry_count || 0,
      }],
      format: 'JSONEachRow',
    });
  }

  // ─── Analytics ───────────────────────────────────────────────

  async getDashboardAnalytics(days: number = 30) {
    const [triggerStats, disbursementStats] = await Promise.all([
      this.client.query({
        query: `
          SELECT
            count() as total_evaluations,
            countIf(trigger = true) as total_triggers,
            avg(confidence) as avg_confidence
          FROM trigger_decisions
          WHERE timestamp > now() - INTERVAL {days: UInt32} DAY
        `,
        query_params: { days },
        format: 'JSONEachRow',
      }),
      this.client.query({
        query: `
          SELECT
            count() as total_disbursements,
            sum(amount) as total_amount,
            sum(recipient_count) as total_recipients
          FROM disbursements
          WHERE timestamp > now() - INTERVAL {days: UInt32} DAY
            AND status = 'COMPLETED'
        `,
        query_params: { days },
        format: 'JSONEachRow',
      }),
    ]);

    const triggers = await triggerStats.json();
    const disbursements = await disbursementStats.json();

    return {
      triggers: triggers[0] || {},
      disbursements: disbursements[0] || {},
    };
  }

  async close() {
    await this.client.close();
  }
}

export const clickhouseService = new ClickHouseService();
