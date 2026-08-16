# Multi-Domain Digital Twin OS — PRD

## Vision
A cinematic multi-domain digital-twin operating system for city-scale operations. Six independent
physical domains — **Traffic (ITMS Hyderabad), Hospital, Building, Industrial, Energy, Water** —
each with real state, entities, KPIs, operator actions, 60-min replay, 3D visualisation, alerts,
and JWT role-based access.

## Architecture
- **Backend**: FastAPI + MongoDB, one multiplexed WS `/api/ws/twins`, per-domain rolling
  1800-frame history buffer, domain-agnostic operator-action engine with cascading state
  mutations, Prometheus metrics endpoint `/api/metrics`.
- **Frontend**: React 19, Three.js/R3F, per-domain sidebar with real sub-routes (~30 pages),
  data-driven Workspace shell, ReplayTimeline scrubber, OperatorAction UI.
- **Observability**: docker-compose bundles Prometheus + Grafana with 7 auto-provisioned
  dashboards (traffic, hospital, building, industrial, energy, water, system).
- **CI/CD**: Expanded Jenkins pipeline with per-domain smoke + operator + replay stages.

## Completed (this fork)
- Enriched every non-traffic domain with real sub-entities (ICU beds, ER queue with triage,
  individual HVAC zones, HVAC + elevator + access doors, ~12 individual machines with
  temperature/vibration, transformers + feeders per substation, valves + pipeline segments).
- Operator Action Engine with 25+ mutations across all five non-traffic domains
  + traffic road close. Substation isolate cascades to transformers + feeders.
- 60-minute rolling history per domain — 1800 frames @ 2s tick, replayed via UI.
- Single multiplexed WebSocket `/api/ws/twins` with domain envelopes, heartbeats, resync.
- ~30 dedicated frontend workspace pages (Hospital ICU/ER/Wards/Equipment/Ambulances/
  Pharmacy/Alerts/Replay/Twin + equivalents for Building/Industrial/Energy/Water).
- Grafana provisioning (Prometheus datasource + 7 dashboards).
- Backend self-tests (`domain_simulation_test`, `operator_action_test`,
  `websocket_replay_test`) all green.

## Test credentials
See `/app/memory/test_credentials.md` — Super Admin: `super@hyderabad.gov.in / Hyderabad@2026`.

## Backlog / Future
- P2: 3D scene focus targeting per module (currently uses shared DomainScene without
  camera focus animation)
- P2: Grafana annotation from operator-action audit stream
- P2: Alert deduplication policies (currently basic dedup on dedup_key)
- P3: Full E2E in Jenkins via headless Playwright container
