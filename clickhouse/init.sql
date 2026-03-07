-- CommUnity ClickHouse Schema
-- Optimized for time-series sensor data and AI audit logs

-- ============================================================
-- Table 1: Raw Sensor Readings (append-only, high-volume)
-- ============================================================
CREATE TABLE IF NOT EXISTS community.sensor_readings (
    timestamp       DateTime64(3, 'Asia/Singapore'),
    source          LowCardinality(String),   -- 'psi', 'pm25', 'rainfall', 'temperature', 'forecast'
    region          LowCardinality(String),   -- 'north', 'south', 'east', 'west', 'central', or station_id
    station_id      String DEFAULT '',
    metric          LowCardinality(String),   -- 'psi_24h', 'pm25_1h', 'rainfall_5m', 'temp_c', 'pm10_24h', etc.
    value           Float64,
    data_quality    LowCardinality(String) DEFAULT 'OK'  -- 'OK', 'STALE', 'MISSING', 'ANOMALY'
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (source, region, metric, timestamp)
TTL toDateTime(timestamp) + INTERVAL 1 YEAR;

-- ============================================================
-- Table 2: AI Trigger Decisions (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS community.trigger_decisions (
    id                      UUID DEFAULT generateUUIDv4(),
    timestamp               DateTime64(3, 'Asia/Singapore'),
    trigger                 Bool,
    confidence              Float64,
    reasoning               String,
    model_used              LowCardinality(String),  -- 'gpt-4o', 'gpt-4o-mini', 'ADMIN_OVERRIDE'
    input_snapshot          String,                   -- Full JSON of sensor data fed to AI
    data_integrity_score    Float64 DEFAULT 100,
    zones                   Array(String),
    psi_at_decision         Float64 DEFAULT 0,
    pm25_at_decision        Float64 DEFAULT 0,
    rainfall_at_decision    Float64 DEFAULT 0,
    temperature_at_decision Float64 DEFAULT 0,
    data_concerns           Array(String) DEFAULT []
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, id);

-- ============================================================
-- Table 3: Disbursement Records
-- ============================================================
CREATE TABLE IF NOT EXISTS community.disbursements (
    id                  UUID DEFAULT generateUUIDv4(),
    timestamp           DateTime64(3, 'Asia/Singapore'),
    decision_id         UUID,
    amount              Float64,
    currency            LowCardinality(String) DEFAULT 'SGD',
    recipient_count     UInt32,
    status              LowCardinality(String),  -- 'COMPLETED', 'FAILED', 'PENDING'
    payment_hash        String DEFAULT '',
    zone                String DEFAULT ''
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, id);

-- ============================================================
-- Table 4: Ingestion Health Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS community.ingestion_errors (
    timestamp       DateTime64(3, 'Asia/Singapore'),
    source          LowCardinality(String),
    error_type      LowCardinality(String),  -- 'HTTP_ERROR', 'TIMEOUT', 'PARSE_ERROR', 'EMPTY_RESPONSE'
    error_message   String,
    http_status     UInt16 DEFAULT 0,
    retry_count     UInt8 DEFAULT 0
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, source)
TTL toDateTime(timestamp) + INTERVAL 90 DAY;

-- ============================================================
-- Materialized View: Hourly PSI Averages (for trend queries)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS community.mv_psi_hourly
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (region, hour)
AS SELECT
    toStartOfHour(timestamp) AS hour,
    region,
    avgState(value) AS avg_psi
FROM community.sensor_readings
WHERE source = 'psi' AND metric = 'psi_24h'
GROUP BY hour, region;
