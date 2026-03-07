# CommUnity - Changelog

## [v0.1.0] - Phase 1 Complete
- **Added**: Initialized React Native Expo project (`mobile_app`) using the `tabs` template.
- **Added**: Installed NativeWind (`v4.2.2`) and Tailwind CSS (`v3.3.2`).
- **Added**: Configured `tailwind.config.js` to parse `.js, .jsx, .ts, .tsx` files in `/app` and `/components`.
- **Added**: Added `nativewind/babel` plugin to `babel.config.js`.

## [v0.1.1] - Phase 2 Initial Scaffolding & Cleanup (Complete)
- **Removed**: Redundant Expo placeholder screens and components.
- **Added**: Scaffolded empty screens for Home, Circles, Contribute, and Profile.
- **Updated**: Rewrote `app/(tabs)/_layout.tsx` for custom navigation.

- [v0.1.2] - UI Migration & Styling Optimization (Complete)
- **Migrated**: Converted all HTML mockups (`dashboard.html`, `circles.html`, `user_profile.html`, `contribute.html`) into interactive React Native components with NativeWind.
- **Fixed**: Resolved NativeWind v4 Web rendering issues by optimizing `metro.config.js` and `tailwind.config.js`.
- **Improved**: Polished UI layout with `SafeAreaView` and fixed button/navbar collisions.

## [v0.1.3] - AI-Driven Logic & Open Payments Integration (Complete)
- **Engine**: Transitioned to an intelligent AI Trigger Engine using multidimensional polling (PSI, Rainfall, Trends) and GPT-4o style reasoning.
- **Payments**: Implemented the 7-step Open Payments flow in `PaymentEngine`, complete with UI progress modals and simulated wallet consent.
- **Transparency**: Created a "Live AI Audit Trail" on the Dashboard, allowing anyone to verify fund disbursements against the AI's logic and confidence scores.
- **UI Architecture**: Finalized role-based dynamic themes (Admin: Deep Indigo, Member: CommUnity Blue).
- **Organization**: Cleaned up redundant mockup thresholds and optimized service-component communication.

## [v0.2.0] - Production Trigger Engine & ClickHouse Integration (Complete)
- **ClickHouse**: Added `docker-compose.clickhouse.yml` with optimized MergeTree schema for time-series sensor data, AI audit logs, and disbursement records.
- **Data Ingestion**: Built `DataIngestionService` polling 5 live Singapore APIs (PSI, PM2.5, Rainfall, Temperature, 2hr Forecast) with retry logic, exponential backoff, and data quality assessment.
- **AI Pipeline**: Rewrote `TriggerEngine` as a 3-stage pipeline (Collect → Cross-Validate → AI Reason) with GPT-4o integration, data integrity blocking, and mock fallback.
- **Cross-Validation**: PSI vs PM2.5 correlation checks, forecast-vs-rainfall consistency, regional anomaly detection.
- **ClickHouse Client**: Full typed wrapper for sensor reads, trigger decisions, disbursements, and dashboard analytics.
- **Persistence**: `DistributionEngine` now writes to both localStorage (UI) and ClickHouse (analytics).

