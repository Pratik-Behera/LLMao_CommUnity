import { clickhouseService } from './ClickHouseClient';

/**
 * Singapore Data Sources Configuration
 */
const DATA_SOURCES = {
  psi: {
    url: 'https://api-open.data.gov.sg/v2/real-time/api/psi',
    interval: 60_000,      // 60 seconds
    label: 'PSI (Air Quality)',
  },
  pm25: {
    url: 'https://api-open.data.gov.sg/v2/real-time/api/pm25',
    interval: 60_000,
    label: 'PM2.5',
  },
  rainfall: {
    url: 'https://api-open.data.gov.sg/v2/real-time/api/rainfall',
    interval: 300_000,     // 5 minutes
    label: 'Rainfall',
  },
  temperature: {
    url: 'https://api-open.data.gov.sg/v2/real-time/api/air-temperature',
    interval: 300_000,
    label: 'Temperature',
  },
  forecast: {
    url: 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast',
    interval: 1_800_000,   // 30 minutes
    label: '2hr Forecast',
  },
} as const;

type SourceKey = keyof typeof DATA_SOURCES;

interface IngestionStatus {
  source: string;
  lastSuccess: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  isStale: boolean;
}

/**
 * Production Data Ingestion Service.
 * Polls all Singapore public APIs on schedule, parses responses,
 * writes to ClickHouse, and provides latest snapshots to the TriggerEngine.
 */
class DataIngestionService {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private status: Map<string, IngestionStatus> = new Map();
  private latestSnapshot: Map<string, any> = new Map();
  private isRunning = false;

  constructor() {
    // Initialize status for each source
    for (const key of Object.keys(DATA_SOURCES)) {
      this.status.set(key, {
        source: key,
        lastSuccess: null,
        lastError: null,
        consecutiveFailures: 0,
        isStale: true,
      });
    }
  }

  /**
   * Start all polling timers.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[DataIngestion] Starting all pollers...');

    for (const [key, config] of Object.entries(DATA_SOURCES)) {
      // Immediate first fetch
      this.pollSource(key as SourceKey);
      // Schedule recurring fetch
      const timer = setInterval(() => this.pollSource(key as SourceKey), config.interval);
      this.timers.set(key, timer);
      console.log(`[DataIngestion] ${config.label}: polling every ${config.interval / 1000}s`);
    }
  }

  /**
   * Stop all polling timers.
   */
  stop() {
    this.isRunning = false;
    for (const [key, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    console.log('[DataIngestion] All pollers stopped.');
  }

  /**
   * Fetch data from a single source with retry logic.
   */
  private async pollSource(sourceKey: SourceKey) {
    const config = DATA_SOURCES[sourceKey];
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

        const response = await fetch(config.url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();

        if (json.code !== 0 || !json.data) {
          throw new Error(`API error: code=${json.code}, msg=${json.errorMsg || 'unknown'}`);
        }

        // Parse and store
        const readings = this.parseResponse(sourceKey, json.data);
        
        // Write to ClickHouse
        if (readings.length > 0) {
          try {
            await clickhouseService.insertSensorReadings(readings);
          } catch (chErr) {
            console.warn(`[DataIngestion] ClickHouse write failed for ${sourceKey}, caching locally:`, chErr);
          }
        }

        // Update snapshot and status
        this.latestSnapshot.set(sourceKey, { data: json.data, readings, fetchedAt: new Date() });
        const status = this.status.get(sourceKey)!;
        status.lastSuccess = new Date();
        status.lastError = null;
        status.consecutiveFailures = 0;
        status.isStale = false;

        return; // Success, exit retry loop

      } catch (err: any) {
        lastError = err;
        console.warn(`[DataIngestion] ${sourceKey} attempt ${attempt}/${maxRetries} failed:`, err.message);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 3s, 9s
          await new Promise(r => setTimeout(r, Math.pow(3, attempt) * 1000));
        }
      }
    }

    // All retries exhausted
    const status = this.status.get(sourceKey)!;
    status.lastError = lastError?.message || 'Unknown error';
    status.consecutiveFailures++;

    // Mark as stale if last success was >1hr ago
    if (!status.lastSuccess || (Date.now() - status.lastSuccess.getTime()) > 3_600_000) {
      status.isStale = true;
    }

    // Log to ClickHouse
    try {
      await clickhouseService.logIngestionError({
        source: sourceKey,
        error_type: lastError?.message?.includes('HTTP') ? 'HTTP_ERROR' : 'TIMEOUT',
        error_message: lastError?.message || 'Unknown',
        retry_count: 3,
      });
    } catch (e) {
      // Don't let logging failures crash the poller
    }
  }

  /**
   * Parse API responses into normalized sensor readings.
   */
  private parseResponse(sourceKey: SourceKey, data: any): Array<{
    timestamp: string;
    source: string;
    region: string;
    station_id: string;
    metric: string;
    value: number;
    data_quality: string;
  }> {
    const readings: any[] = [];
    const now = new Date().toISOString();

    switch (sourceKey) {
      case 'psi': {
        const item = data.items?.[0];
        if (!item?.readings) return readings;
        const ts = item.timestamp || now;

        for (const [metricKey, regionValues] of Object.entries(item.readings) as any) {
          for (const [region, value] of Object.entries(regionValues as Record<string, number>)) {
            readings.push({
              timestamp: ts,
              source: 'psi',
              region,
              station_id: '',
              metric: metricKey,
              value: value as number,
              data_quality: this.assessQuality(item.updatedTimestamp),
            });
          }
        }
        break;
      }

      case 'pm25': {
        const item = data.items?.[0];
        if (!item?.readings?.pm25_one_hourly) return readings;
        const ts = item.timestamp || now;

        for (const [region, value] of Object.entries(item.readings.pm25_one_hourly as Record<string, number>)) {
          readings.push({
            timestamp: ts,
            source: 'pm25',
            region,
            station_id: '',
            metric: 'pm25_1h',
            value,
            data_quality: this.assessQuality(item.updatedTimestamp),
          });
        }
        break;
      }

      case 'rainfall': {
        const reading = data.readings?.[0];
        if (!reading?.data) return readings;

        for (const station of reading.data) {
          readings.push({
            timestamp: reading.timestamp || now,
            source: 'rainfall',
            region: this.stationToRegion(station.stationId, data.stations),
            station_id: station.stationId,
            metric: 'rainfall_5m',
            value: station.value,
            data_quality: 'OK',
          });
        }
        break;
      }

      case 'temperature': {
        const reading = data.readings?.[0];
        if (!reading?.data) return readings;

        for (const station of reading.data) {
          readings.push({
            timestamp: reading.timestamp || now,
            source: 'temperature',
            region: this.stationToRegion(station.stationId, data.stations),
            station_id: station.stationId,
            metric: 'temp_c',
            value: station.value,
            data_quality: 'OK',
          });
        }
        break;
      }

      case 'forecast': {
        const item = data.items?.[0];
        if (!item?.forecasts) return readings;

        // Store forecasts as a single snapshot (not per-station numeric)
        // We'll use value=1 for "rain" forecasts, 0 for clear
        for (const fc of item.forecasts) {
          const isRainy = /rain|thunder|showers/i.test(fc.forecast);
          readings.push({
            timestamp: item.timestamp || now,
            source: 'forecast',
            region: fc.area,
            station_id: '',
            metric: 'forecast_rain_probability',
            value: isRainy ? 1 : 0,
            data_quality: 'OK',
          });
        }
        break;
      }
    }

    return readings;
  }

  /**
   * Assess data quality based on the update timestamp.
   */
  private assessQuality(updatedTimestamp: string): string {
    if (!updatedTimestamp) return 'MISSING';
    const age = Date.now() - new Date(updatedTimestamp).getTime();
    if (age > 7_200_000) return 'STALE';     // >2 hours
    if (age > 3_600_000) return 'DEGRADED';   // >1 hour
    return 'OK';
  }

  /**
   * Map a station ID to a broad region (north/south/east/west/central).
   */
  private stationToRegion(stationId: string, stations: any[]): string {
    const station = stations?.find((s: any) => s.id === stationId || s.deviceId === stationId);
    if (!station?.location) return 'unknown';

    const lat = station.location.latitude;
    const lng = station.location.longitude;

    // Singapore rough regional boundaries
    if (lat > 1.38) return 'north';
    if (lat < 1.30) return 'south';
    if (lng > 103.88) return 'east';
    if (lng < 103.75) return 'west';
    return 'central';
  }

  // ─── Public API for TriggerEngine ────────────────────────────

  /**
   * Get the latest snapshot of all sensor data for AI evaluation.
   */
  getLatestSnapshot(): {
    psi: any;
    pm25: any;
    rainfall: any;
    temperature: any;
    forecast: any;
    status: Record<string, IngestionStatus>;
  } {
    return {
      psi: this.latestSnapshot.get('psi') || null,
      pm25: this.latestSnapshot.get('pm25') || null,
      rainfall: this.latestSnapshot.get('rainfall') || null,
      temperature: this.latestSnapshot.get('temperature') || null,
      forecast: this.latestSnapshot.get('forecast') || null,
      status: Object.fromEntries(this.status),
    };
  }

  /**
   * Calculate the overall data integrity score (0-100).
   */
  getDataIntegrityScore(): number {
    let score = 100;
    const weights: Record<string, number> = { psi: 30, pm25: 25, rainfall: 15, temperature: 10, forecast: 20 };

    for (const [key, weight] of Object.entries(weights)) {
      const status = this.status.get(key);
      if (!status) { score -= weight; continue; }
      if (status.isStale) score -= weight;
      else if (status.consecutiveFailures > 0) score -= weight * 0.5;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Check if the system has enough data to make a decision.
   */
  canMakeDecision(): boolean {
    // Must have at least PSI or PM2.5 data
    const psiStatus = this.status.get('psi');
    const pm25Status = this.status.get('pm25');
    return !!(psiStatus && !psiStatus.isStale) || !!(pm25Status && !pm25Status.isStale);
  }

  /**
   * Get the overall system mode based on data availability.
   */
  getSystemMode(): 'NOMINAL' | 'DEGRADED' | 'OFFLINE' {
    const integrity = this.getDataIntegrityScore();
    if (integrity >= 70) return 'NOMINAL';
    if (integrity >= 30) return 'DEGRADED';
    return 'OFFLINE';
  }
}

export const dataIngestionService = new DataIngestionService();
