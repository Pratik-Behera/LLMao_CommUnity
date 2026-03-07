/**
 * MOCK Data Ingestion Service for Mobile/Frontend Demo.
 */
class DataIngestionService {
  start() { console.log('[DataIngestion] Mock started.'); }
  stop() { }

  getLatestSnapshot() {
    return {
      psi: { 
        data: { items: [{ readings: { psi_twenty_four_hourly: { central: 52 } }, updatedTimestamp: new Date().toISOString() }] },
        readings: [] 
      },
      pm25: { 
        data: { items: [{ readings: { pm25_one_hourly: { central: 18 } }, updatedTimestamp: new Date().toISOString() }] },
        readings: [] 
      },
      temperature: { 
        data: { readings: [{ data: [{ value: 28.5 }] }] },
        readings: []
      },
      rainfall: { 
        data: { readings: [{ data: [{ value: 0 }] }] },
        readings: []
      },
      forecast: {
        data: { items: [{ forecasts: [{ area: 'Central', forecast: 'Partly Cloudy' }] }] }
      },
      status: {
        psi: { isStale: false, lastSuccess: new Date(), consecutiveFailures: 0 },
        pm25: { isStale: false, lastSuccess: new Date(), consecutiveFailures: 0 },
        rainfall: { isStale: false, lastSuccess: new Date(), consecutiveFailures: 0 },
        temperature: { isStale: false, lastSuccess: new Date(), consecutiveFailures: 0 },
        forecast: { isStale: false, lastSuccess: new Date(), consecutiveFailures: 0 }
      }
    };
  }

  getDataIntegrityScore() { return 100; }
  getSystemMode() { return 'NOMINAL'; }
  canMakeDecision() { return true; }
}

export const dataIngestionService = new DataIngestionService();
