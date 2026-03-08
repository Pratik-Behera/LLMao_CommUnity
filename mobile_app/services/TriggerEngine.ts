import { dataIngestionService } from './DataIngestionService';
import { clickhouseService } from './ClickHouseClient';

// ─── Types ──────────────────────────────────────────────────────

interface SensorSnapshot {
  psi: Record<string, number>;
  pm25: Record<string, number>;
  rainfall_avg: number;
  temperature_avg: number;
  forecast_summary: string;
  psi_trend_3h: number[];
  data_integrity_score: number;
  data_concerns: string[];
  rss_advisories: string[];
  historical_pattern_match: number; // Correlation (0-1.0)
}

interface DecisionJSON {
  trigger: boolean;
  confidence: number;
  reasoning: string;
  recommended_zones: string[];
  zone_severities: Record<string, number>; // 0-100 score per zone
  data_concerns: string[];
  historical_pattern_match?: number;
}

interface TriggerResult {
  decision: DecisionJSON;
  snapshot: SensorSnapshot;
  model_used: string;
  system_mode: string;
}

// ─── Trigger Engine ─────────────────────────────────────────────

/**
 * Production Trigger Engine — 3-Stage Pipeline:
 *   Stage 1: Collect real-time data from DataIngestionService
 *   Stage 2: Cross-validate sources and compute data integrity
 *   Stage 3: AI reasoning via GPT-4o to make trigger decision
 */
class TriggerEngine {
  private lastDecision: DecisionJSON | null = null;
  private lastSnapshot: SensorSnapshot | null = null;
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  }

  // ─── Stage 1: Data Collection ────────────────────────────────

  private async collectData(): Promise<SensorSnapshot> {
    const rawData = dataIngestionService.getLatestSnapshot();
    const concerns: string[] = [];

    // Map PSI
    const psi_items = rawData.psi?.items?.[0]?.readings?.psi_twenty_four_hourly;
    const psi: Record<string, number> = psi_items || { central: 0, north: 0, south: 0, east: 0, west: 0 };
    if (!psi_items) concerns.push('PSI data missing or format changed');

    // Map PM2.5
    const pm25_items = rawData.pm25?.items?.[0]?.readings?.pm25_one_hourly;
    const pm25: Record<string, number> = pm25_items || { central: 0, north: 0, south: 0, east: 0, west: 0 };
    if (!pm25_items) concerns.push('PM2.5 data missing or format changed');

    // Calculate Average Rainfall across all stations
    let rainfallAvg = 0;
    const rainfallReadings = rawData.rainfall?.items?.[0]?.readings;
    if (rainfallReadings && Array.isArray(rainfallReadings) && rainfallReadings.length > 0) {
      const sum = rainfallReadings.reduce((acc: number, r: any) => acc + (r.value || 0), 0);
      rainfallAvg = Number((sum / rainfallReadings.length).toFixed(2));
    } else {
      concerns.push('Rainfall data missing or format changed');
    }

    // Calculate Average Temperature across all stations
    let tempAvg = 0;
    const tempReadings = rawData.temperature?.items?.[0]?.readings;
    if (tempReadings && Array.isArray(tempReadings) && tempReadings.length > 0) {
      const sum = tempReadings.reduce((acc: number, r: any) => acc + (r.value || 0), 0);
      tempAvg = Number((sum / tempReadings.length).toFixed(1));
    } else {
       concerns.push('Temperature data missing or format changed');
    }

    // Map Forecasts (Deduplicate)
    let forecastSummary = '';
    const forecastsArray = rawData.forecast?.items?.[0]?.forecasts;
    if (forecastsArray && Array.isArray(forecastsArray)) {
       const uniqueForecasts = new Set(forecastsArray.map((f: any) => f.forecast));
       forecastSummary = Array.from(uniqueForecasts).join(', ');
    } else {
       forecastSummary = 'Forecast unavailable';
       concerns.push('Forecast data missing');
    }

    // 3-hour PSI trend
    const psiTrend = [...rawData.psiTrendBuffer];

    return {
      psi,
      pm25,
      rainfall_avg: rainfallAvg,
      temperature_avg: tempAvg,
      forecast_summary: forecastSummary,
      psi_trend_3h: psiTrend,
      data_integrity_score: dataIngestionService.getDataIntegrityScore(),
      data_concerns: concerns,
      rss_advisories: [], // Needs actual RSS parsing, empty array for now
      historical_pattern_match: 0.92, // Mocked for historical comparison
    };
  }

  // ─── Stage 2: Cross-Validation ───────────────────────────────

  private crossValidate(snapshot: SensorSnapshot): SensorSnapshot {
    const concerns = [...snapshot.data_concerns];

    // Check PSI vs PM2.5 correlation
    const psiCentral = snapshot.psi.central || 0;
    const pm25Central = snapshot.pm25.central || 0;

    // PSI is heavily weighted by PM2.5. If PSI is high but PM2.5 is low, something is off.
    if (psiCentral > 100 && pm25Central < 20) {
      concerns.push('PSI high but PM2.5 low — possible data discrepancy');
    }

    // Check if forecast says rain but rainfall is 0
    if (/rain|thunder|showers/i.test(snapshot.forecast_summary) && snapshot.rainfall_avg === 0) {
      concerns.push('Forecast predicts rain but current rainfall is 0mm — forecast may be preemptive');
    }

    // Check for anomalous regional spikes
    const psiValues = Object.values(snapshot.psi);
    if (psiValues.length > 1) {
      const max = Math.max(...psiValues);
      const min = Math.min(...psiValues);
      if (max > 3 * min && min > 0) {
        concerns.push(`Large PSI regional disparity (${min}-${max}) — possible localized event or sensor anomaly`);
      }
    }

    // Check trend direction
    if (snapshot.psi_trend_3h.length >= 2) {
      const first = snapshot.psi_trend_3h[0];
      const last = snapshot.psi_trend_3h[snapshot.psi_trend_3h.length - 1];
      if (last > first * 2) {
        concerns.push(`PSI has doubled in the last 3 hours (${first} → ${last})`);
      }
    }

    return { ...snapshot, data_concerns: concerns };
  }

  // ─── Stage 3: AI Reasoning ───────────────────────────────────

  private async aiReason(snapshot: SensorSnapshot): Promise<{ decision: DecisionJSON; model_used: string }> {
    const maxPsi = Math.max(...Object.values(snapshot.psi), 0);

    // Cost optimization: use gpt-4o-mini for routine checks, gpt-4o for elevated situations
    const model = maxPsi > 80 ? 'gpt-4o' : 'gpt-4o-mini';

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'Asia/Singapore' });
    const currentHour = new Date().toLocaleString('en-US', { hour: '2-digit', hour12: true, timeZone: 'Asia/Singapore' });

    const prompt = `You are a disaster response analyst for Singapore.
Analyze the following real-time environmental data and determine if a disaster trigger should be activated for community emergency fund disbursement.

CURRENT READINGS (Live from data.gov.sg):
- PSI (24hr): ${JSON.stringify(snapshot.psi)}
- PM2.5 (1hr): ${JSON.stringify(snapshot.pm25)}
- Rainfall (5min avg): ${snapshot.rainfall_avg}mm
- Temperature: ${snapshot.temperature_avg}°C
- Weather Forecast: "${snapshot.forecast_summary}"

3-HOUR PSI TREND: ${JSON.stringify(snapshot.psi_trend_3h)} ${snapshot.psi_trend_3h.length >= 2 ? (snapshot.psi_trend_3h[snapshot.psi_trend_3h.length - 1] > snapshot.psi_trend_3h[0] ? '(RISING)' : '(FALLING/STABLE)') : '(INSUFFICIENT DATA)'}

DATA INTEGRITY SCORE: ${snapshot.data_integrity_score}/100
HISTORICAL PATTERN MATCH: ${snapshot.historical_pattern_match} (Correlation coefficient)
DATA CONCERNS: ${snapshot.data_concerns.length > 0 ? snapshot.data_concerns.join('; ') : 'None'}
RSS ADVISORIES: ${snapshot.rss_advisories.length > 0 ? snapshot.rss_advisories.join('; ') : 'None'}

CURRENT TIME: ${currentHour}, ${currentMonth}

SINGAPORE PSI THRESHOLDS:
- 0-50: Good | 51-100: Moderate | 101-200: Unhealthy
- 201-300: Very Unhealthy | 300+: Hazardous

CRITICAL RULES:
1. If data_integrity_score < 50, you MUST NOT trigger (set confidence to 0).
2. Consider trend direction — a slowly rising PSI is more concerning than a static high reading.
3. Low rainfall means haze is unlikely to clear naturally.
4. September-October is historically the worst haze period in Singapore.
5. Address any data concerns in your reasoning.
6. Must explain WHY or WHY NOT to trigger, citing specific numbers.

Return ONLY this JSON. No markdown, no text outside the JSON:
{
  "trigger": true or false,
  "confidence": 0-100,
  "reasoning": "detailed multi-sentence analysis",
  "recommended_zones": ["zone1", "zone2"],
  "zone_severities": {
    "central": 0-100,
    "north": 0-100,
    "south": 0-100,
    "east": 0-100,
    "west": 0-100
  },
  "data_concerns": ["any issues you noticed"]
}`;

    // Check if we have OpenAI API key
    if (!this.openaiApiKey) {
      console.warn('[TriggerEngine] No OpenAI API key — using mock reasoning');
      return { decision: this.mockAIReasoning(snapshot), model_used: 'MOCK' };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,  // Low temp for consistent reasoning
          max_tokens: 500,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) throw new Error('Empty AI response');

      const decision: DecisionJSON = JSON.parse(content);

      // Safety: block trigger if data integrity is below threshold
      if (snapshot.data_integrity_score < 50 && decision.trigger) {
        decision.trigger = false;
        decision.confidence = 0;
        decision.reasoning = `BLOCKED: Data integrity score (${snapshot.data_integrity_score}/100) is too low for automated triggering. Original AI reasoning: ${decision.reasoning}`;
      }

      return { decision, model_used: model };

    } catch (err: any) {
      console.error('[TriggerEngine] AI reasoning failed:', err.message);
      // Fallback to mock reasoning
      return { decision: this.mockAIReasoning(snapshot), model_used: 'MOCK_FALLBACK' };
    }
  }

  /**
   * Fallback mock reasoning when OpenAI API is unavailable.
   */
  private mockAIReasoning(snapshot: SensorSnapshot): DecisionJSON {
    // 1. Base Score calculation
    const maxPsi = Math.max(...Object.values(snapshot.psi), 0);
    const maxPm25 = Math.max(...Object.values(snapshot.pm25), 0);
    
    // Weightings
    let score = 0;
    
    // PSI (up to 40 pts)
    score += Math.min(40, (maxPsi / 200) * 40);
    
    // PM2.5 (up to 20 pts)
    score += Math.min(20, (maxPm25 / 150) * 20);
    
    // Rainfall (inverse - up to 15 pts if dry)
    if (snapshot.rainfall_avg < 0.5) score += 15;
    else if (snapshot.rainfall_avg < 2) score += 5;
    
    // Trend (up to 15 pts if rising)
    const isRising = snapshot.psi_trend_3h.length >= 2 && 
      snapshot.psi_trend_3h[snapshot.psi_trend_3h.length - 1] > snapshot.psi_trend_3h[0];
    if (isRising) score += 15;
    
    // Seasonality (up to 10 pts)
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 7 && currentMonth <= 9) score += 10; // Aug-Oct is haze season
    
    const shouldTrigger = score > 75; // Activate if we score over 75/100
    
    // Confidence = how certain the AI is about its decision
    // If danger score is very low or very high, we are very confident.
    // If it's near the threshold (75), we are less certain.
    const distanceFromThreshold = Math.abs(score - 75);
    const confidence = Math.min(99, Math.round(50 + distanceFromThreshold * 2));

    let reasoning = '';
    if (shouldTrigger) {
      reasoning = `Multi-signal analysis indicates emergency threshold EXCEEDED (Danger Score: ${Math.round(score)}/100, Threshold: 75). PSI peaked at ${maxPsi} with PM2.5 at ${maxPm25}. Conditions are critical due to ${isRising ? 'rapidly rising pollutant levels' : 'sustained high levels'} and negligible rainfall (${snapshot.rainfall_avg}mm). Immediate community disbursement recommended.`;
    } else {
      reasoning = `Environmental conditions assessed as STABLE (Danger Score: ${Math.round(score)}/100, Threshold: 75). Current max PSI is ${maxPsi}, well within safe parameters. Multi-factor analysis of trend data, PM2.5 levels, and precipitation confirms no emergency trigger is required at this time.`;
    }

    // Determine affected zones (any zone where PSI > 100 or PM2.5 > 55)
    const recommended_zones = [];
    const severities: Record<string, number> = { central: 0, north: 0, south: 0, east: 0, west: 0 };
    
    for (const [zone, psiVal] of Object.entries(snapshot.psi)) {
      const pmVal = snapshot.pm25[zone] || 0;
      // Calculate severity out of 100 per zone
      const severity = Math.min(100, (psiVal / 2) + (pmVal / 1.5));
      severities[zone] = Math.round(severity);
      
      if (psiVal > 100 || pmVal > 55) {
        recommended_zones.push(zone);
      }
    }

    return {
      trigger: shouldTrigger,
      confidence,
      reasoning,
      recommended_zones: shouldTrigger ? recommended_zones : [],
      zone_severities: severities,
      data_concerns: snapshot.data_concerns,
      historical_pattern_match: snapshot.historical_pattern_match,
    };
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Run the full 3-stage pipeline and return a trigger decision.
   */
  async evaluateTrigger(): Promise<TriggerResult> {
    const systemMode = dataIngestionService.getSystemMode();

    // Stage 1: Collect
    console.log('[TriggerEngine] Stage 1: Collecting real-time data...');
    const rawSnapshot = await this.collectData();

    // Stage 2: Cross-Validate
    console.log('[TriggerEngine] Stage 2: Cross-validating sources...');
    const validatedSnapshot = this.crossValidate(rawSnapshot);

    // If system is offline, use mock fallback data for demo
    if (systemMode === 'OFFLINE') {
      console.warn('[TriggerEngine] System OFFLINE — using demo fallback data.');
      const fallbackSnapshot: SensorSnapshot = {
        psi: { central: 142, north: 98, south: 115, east: 88, west: 165 },
        pm25: { central: 72, north: 45, south: 58, east: 40, west: 85 },
        rainfall_avg: 0.2,
        temperature_avg: 32.5,
        forecast_summary: 'Hazy conditions expected, partly cloudy',
        psi_trend_3h: [120, 135, 155],
        data_integrity_score: 60,
        data_concerns: ['Using demo fallback data — live APIs are unreachable from web browser'],
        rss_advisories: [],
        historical_pattern_match: 0.88,
      };

      const { decision: fallbackDecision, model_used: fallbackModel } = await this.aiReason(fallbackSnapshot);

      this.lastDecision = fallbackDecision;
      this.lastSnapshot = fallbackSnapshot;

      return { decision: fallbackDecision, snapshot: fallbackSnapshot, model_used: fallbackModel, system_mode: 'DEMO_FALLBACK' };
    }

    // Stage 3: AI Reasoning
    console.log('[TriggerEngine] Stage 3: AI reasoning via GPT...');
    const { decision, model_used } = await this.aiReason(validatedSnapshot);

    // Store in ClickHouse
    try {
      await clickhouseService.insertTriggerDecision({
        trigger: decision.trigger,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        model_used,
        input_snapshot: validatedSnapshot,
        data_integrity_score: validatedSnapshot.data_integrity_score,
        zones: decision.recommended_zones,
        psi_at_decision: Math.max(...Object.values(validatedSnapshot.psi), 0),
        pm25_at_decision: Math.max(...Object.values(validatedSnapshot.pm25), 0),
        rainfall_at_decision: validatedSnapshot.rainfall_avg,
        temperature_at_decision: validatedSnapshot.temperature_avg,
        data_concerns: decision.data_concerns,
      });
    } catch (e) {
      console.warn('[TriggerEngine] Failed to write decision to ClickHouse:', e);
    }

    this.lastDecision = decision;
    this.lastSnapshot = validatedSnapshot;

    console.log(`[TriggerEngine] Decision: trigger=${decision.trigger}, confidence=${decision.confidence}%, model=${model_used}`);

    return { decision, snapshot: validatedSnapshot, model_used, system_mode: systemMode };
  }

  /**
   * Get active alerts from the last decision.
   */
  async getActiveAlerts() {
    if (this.lastDecision && this.lastDecision.trigger) {
      return [{
        id: 'AI-' + Date.now(),
        type: 'Environmental Alert (AI Verified)',
        zone: this.lastDecision.recommended_zones[0] || 'Island-wide',
        zones: this.lastDecision.recommended_zones,
        severities: this.lastDecision.zone_severities,
        severity: this.lastDecision.confidence > 90 ? 'RED ALERT' : 'ORANGE ALERT',
        reasoning: this.lastDecision.reasoning,
        confidence: this.lastDecision.confidence,
      }];
    }
    return [];
  }

  /**
   * Manual admin override.
   */
  async simulateManualTrigger(): Promise<DecisionJSON> {
    const decision: DecisionJSON = {
      trigger: true,
      confidence: 100,
      reasoning: 'ADMIN OVERRIDE: Manual trigger for demonstration/testing of distribution engine.',
      recommended_zones: ['central', 'north', 'south', 'east', 'west'],
      zone_severities: {
        central: 95,
        north: 88,
        south: 70,
        east: 65,
        west: 92
      },
      data_concerns: [],
    };

    // Log override to ClickHouse
    try {
      await clickhouseService.insertTriggerDecision({
        trigger: true,
        confidence: 100,
        reasoning: decision.reasoning,
        model_used: 'ADMIN_OVERRIDE',
        input_snapshot: { source: 'manual' },
        data_integrity_score: 100,
        zones: decision.recommended_zones,
        psi_at_decision: 0,
        pm25_at_decision: 0,
        rainfall_at_decision: 0,
        temperature_at_decision: 0,
        data_concerns: [],
      });
    } catch (e) {
      console.warn('[TriggerEngine] Failed to log admin override to ClickHouse:', e);
    }

    this.lastDecision = decision;
    return decision;
  }

  /**
   * Get the current environment summary for the dashboard.
   */
  getEnvironmentSummary() {
    return {
      snapshot: this.lastSnapshot,
      lastDecision: this.lastDecision,
      systemMode: dataIngestionService.getSystemMode(),
      dataIntegrity: dataIngestionService.getDataIntegrityScore(),
    };
  }
}

export const triggerEngine = new TriggerEngine();

// Keep backward compatibility with the old mock export name
export const mockTriggerEngine = triggerEngine;
