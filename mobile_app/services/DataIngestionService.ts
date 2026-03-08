// Real-time Data Ingestion Service pulling from actual Singapore Government APIs (data.gov.sg)

export interface SourceStatus {
  isStale: boolean;
  lastSuccess: Date | null;
  consecutiveFailures: number;
}

export interface LiveSnapshot {
  psi: any;
  pm25: any;
  rainfall: any;
  temperature: any;
  forecast: any;
  status: Record<string, SourceStatus>;
  psiTrendBuffer: number[];
}

class DataIngestionService {
  private isRunning: boolean = false;
  private pollInterval: any = null;
  
  // Storage for the latest successful API responses
  private currentData: LiveSnapshot = {
    psi: null,
    pm25: null,
    rainfall: null,
    temperature: null,
    forecast: null,
    status: {
      psi: { isStale: true, lastSuccess: null, consecutiveFailures: 0 },
      pm25: { isStale: true, lastSuccess: null, consecutiveFailures: 0 },
      rainfall: { isStale: true, lastSuccess: null, consecutiveFailures: 0 },
      temperature: { isStale: true, lastSuccess: null, consecutiveFailures: 0 },
      forecast: { isStale: true, lastSuccess: null, consecutiveFailures: 0 }
    },
    psiTrendBuffer: [] // Stores historical max PSI readings
  };

  /**
   * Starts the background polling interval (every 60 seconds)
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[DataIngestion] Starting live polling from data.gov.sg');
    this.pollAll();
    this.pollInterval = setInterval(() => this.pollAll(), 60000);
  }

  stop() {
    this.isRunning = false;
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  getLatestSnapshot(): LiveSnapshot {
    return this.currentData;
  }

  getDataIntegrityScore(): number {
    let score = 100;
    const statuses = Object.values(this.currentData.status);
    
    statuses.forEach(source => {
      // Deduct 20 points for every offline/stale API
      if (source.isStale || source.consecutiveFailures > 2) {
        score -= 20;
      }
    });

    return Math.max(0, score);
  }

  getSystemMode(): 'NOMINAL' | 'DEGRADED' | 'OFFLINE' {
    const score = this.getDataIntegrityScore();
    if (score === 100) return 'NOMINAL';
    if (score >= 50) return 'DEGRADED';
    return 'OFFLINE';
  }

  // --- API Fetchers ---

  private async fetchAPI(endpoint: string, key: keyof LiveSnapshot['status']) {
    try {
      const response = await fetch(`https://api.data.gov.sg/v1/environment/${endpoint}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      this.currentData[key as keyof typeof this.currentData] = data;
      this.currentData.status[key].isStale = false;
      this.currentData.status[key].lastSuccess = new Date();
      this.currentData.status[key].consecutiveFailures = 0;
      
      return data;
    } catch (e) {
      console.warn(`[DataIngestion] Failed to fetch ${endpoint}:`, e);
      this.currentData.status[key].consecutiveFailures++;
      if (this.currentData.status[key].consecutiveFailures > 2) {
        this.currentData.status[key].isStale = true;
      }
      return null;
    }
  }

  private async pollAll() {
    if (!this.isRunning) return;
    
    await Promise.allSettled([
      this.fetchAPI('psi', 'psi'),
      this.fetchAPI('pm25', 'pm25'),
      this.fetchAPI('rainfall', 'rainfall'),
      this.fetchAPI('air-temperature', 'temperature'),
      this.fetchAPI('2-hour-weather-forecast', 'forecast')
    ]);

    this.updateTrendBuffer();
  }

  /**
   * Maintains a rolling window of historical PSI values (e.g. max PSI per hour)
   */
  private updateTrendBuffer() {
    if (!this.currentData.psi || this.currentData.status.psi.isStale) return;
    
    const readings = this.currentData.psi?.items?.[0]?.readings?.psi_twenty_four_hourly;
    if (readings) {
      const maxPsi = Math.max(...(Object.values(readings) as number[]), 0);
      
      // Store current reading
      this.currentData.psiTrendBuffer.push(maxPsi);
      
      // Keep only last 3 items for a 3-point trend (simplification for demo)
      if (this.currentData.psiTrendBuffer.length > 3) {
        this.currentData.psiTrendBuffer.shift();
      }
    }
  }
}

export const dataIngestionService = new DataIngestionService();
