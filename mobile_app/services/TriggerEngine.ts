import { dataIngestionService } from '../../backend/services/DataIngestionService';
import { clickhouseService } from '../../backend/services/ClickHouseClient';

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
}

interface DecisionJSON {
  trigger: boolean;
  confidence: number;
  reasoning: string;
  recommended_zones: string[];
  data_concerns: string[];
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
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }

  // ─── Stage 1: Data Collection ────────────────────────────────

  private async collectData(): Promise<SensorSnapshot> {
    const snapshot = dataIngestionService.getLatestSnapshot();
    const concerns: string[] = [];

    // Extract PSI values by region
    const psi: Record<string, number> = {};
    if (snapshot.psi?.readings) {
      for (const r of snapshot.psi.readings) {
        if (r.metric === 'psi_twenty_four_hourly') {
          psi[r.region] = r.value;
        }
      }
    } else if (snapshot.psi?.data?.items?.[0]?.readings?.psi_twenty_four_hourly) {
      const psiData = snapshot.psi.data.items[0].readings.psi_twenty_four_hourly;
      Object.assign(psi, psiData);
    }
    if (Object.keys(psi).length === 0) concerns.push('PSI data unavailable');

    // Extract PM2.5 values by region
    const pm25: Record<string, number> = {};
    if (snapshot.pm25?.readings) {
      for (const r of snapshot.pm25.readings) {
        if (r.metric === 'pm25_1h') {
          pm25[r.region] = r.value;
        }
      }
    } else if (snapshot.pm25?.data?.items?.[0]?.readings?.pm25_one_hourly) {
      const pm25Data = snapshot.pm25.data.items[0].readings.pm25_one_hourly;
      Object.assign(pm25, pm25Data);
    }
    if (Object.keys(pm25).length === 0) concerns.push('PM2.5 data unavailable');

    // Aggregate rainfall (average across all stations)
    let rainfallAvg = 0;
    if (snapshot.rainfall?.readings) {
      const vals = snapshot.rainfall.readings.filter((r: any) => r.metric === 'rainfall_5m').map((r: any) => r.value);
      rainfallAvg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
    } else if (snapshot.rainfall?.data?.readings?.[0]?.data) {
      const vals = snapshot.rainfall.data.readings[0].data.map((s: any) => s.value);
      rainfallAvg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
    }

    // Aggregate temperature (average across all stations)
    let tempAvg = 0;
    if (snapshot.temperature?.readings) {
      const vals = snapshot.temperature.readings.filter((r: any) => r.metric === 'temp_c').map((r: any) => r.value);
      tempAvg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
    } else if (snapshot.temperature?.data?.readings?.[0]?.data) {
      const vals = snapshot.temperature.data.readings[0].data.map((s: any) => s.value);
      tempAvg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
    }

    // Forecast summary
    let forecastSummary = 'No forecast data';
    if (snapshot.forecast?.data?.items?.[0]?.forecasts) {
      const forecasts = snapshot.forecast.data.items[0].forecasts;
      const unique = [...new Set(forecasts.map((f: any) => f.forecast))];
      forecastSummary = unique.join(', ');
    }

    // 3-hour PSI trend from ClickHouse
    let psiTrend: number[] = [];
    try {
      const trend = await clickhouseService.getSensorTrend('psi_twenty_four_hourly', 'central', 3);
      psiTrend = trend.map(t => t.avg_value);
    } catch (e) {
      concerns.push('Unable to query PSI trend from ClickHouse');
      // Fallback: use current PSI values
      if (psi.central) psiTrend = [psi.central];
    }

    // RSS advisories (placeholder — would parse weather.gov.sg RSS)
    const rssAdvisories: string[] = [];

    return {
      psi,
      pm25,
      rainfall_avg: Math.round(rainfallAvg * 100) / 100,
      temperature_avg: Math.round(tempAvg * 10) / 10,
      forecast_summary: forecastSummary,
      psi_trend_3h: psiTrend,
      data_integrity_score: dataIngestionService.getDataIntegrityScore(),
      data_concerns: concerns,
      rss_advisories: rssAdvisories,
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

3-HOUR PSI TREND: ${JSON.stringify(snapshot.psi_trend_3h)} ${snapshot.psi_trend_3h.length >= 2 ? (snapshot.psi_trend_3h[snapshot.psi_trend_3h.length-1] > snapshot.psi_trend_3h[0] ? '(RISING)' : '(FALLING/STABLE)') : '(INSUFFICIENT DATA)'}

DATA INTEGRITY SCORE: ${snapshot.data_integrity_score}/100
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
    const maxPsi = Math.max(...Object.values(snapshot.psi), 0);
    const isRising = snapshot.psi_trend_3h.length >= 2 && 
      snapshot.psi_trend_3h[snapshot.psi_trend_3h.length - 1] > snapshot.psi_trend_3h[0];
    
    const shouldTrigger = maxPsi > 150 && isRising && snapshot.rainfall_avg < 1;

    return {
      trigger: shouldTrigger,
      confidence: shouldTrigger ? Math.min(95, 60 + maxPsi / 10) : Math.max(5, 50 - maxPsi / 5),
      reasoning: shouldTrigger
        ? `[MOCK REASONING] PSI has reached ${maxPsi} and is trending upward. Rainfall is negligible (${snapshot.rainfall_avg}mm). Combined with temperature of ${snapshot.temperature_avg}°C, conditions indicate deteriorating air quality requiring community fund activation.`
        : `[MOCK REASONING] Current PSI of ${maxPsi} is ${maxPsi > 100 ? 'elevated but' : 'within safe range and'} ${isRising ? 'rising' : 'stable/falling'}. Rainfall at ${snapshot.rainfall_avg}mm ${snapshot.rainfall_avg > 0 ? 'should help clear pollutants' : 'is low but conditions do not warrant triggering'}. No disaster trigger recommended at this time.`,
      recommended_zones: shouldTrigger ? ['Island-wide'] : [],
      data_concerns: snapshot.data_concerns,
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

    // Block decisions if system is offline
    if (systemMode === 'OFFLINE') {
      const offlineDecision: DecisionJSON = {
        trigger: false,
        confidence: 0,
        reasoning: 'SYSTEM OFFLINE: All data sources are unavailable. Cannot make an informed decision.',
        recommended_zones: [],
        data_concerns: ['All data sources offline'],
      };

      this.lastDecision = offlineDecision;
      this.lastSnapshot = validatedSnapshot;

      return { decision: offlineDecision, snapshot: validatedSnapshot, model_used: 'NONE', system_mode: systemMode };
    }

    // Stage 3: AI Reasoning
    console.log('[TriggerEngine] Stage 3: AI reasoning via GPT-4o...');
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
      recommended_zones: ['Island-wide'],
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
