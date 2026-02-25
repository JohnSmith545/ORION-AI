# Orion AI - Public Changelog

## [1.0.0] - 2024-10-27 (Operation: Lightspeed)

### Added

- Implemented Global Error Boundaries ("Critical Anomaly" state).
- Added 404 "Orbit Decayed" routing fallback.
- Integrated Firebase Analytics for data-driven telemetry.

### Changed

- Optimized React Router with `Suspense` and `lazy()` for <1s initial paint (Lighthouse 90+).
- Migrated to Serverless Firestore Vector Search to reduce idle infrastructure costs to $0.00.

### Security

- Formalized `THREAT_MODEL.md` and RAG Storage ADRs.
