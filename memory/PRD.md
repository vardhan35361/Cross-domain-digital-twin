# Multi-Domain Digital Twin Platform — PRD

## Vision
A cinematic multi-domain digital-twin operating system for city-scale operations. Six independent
physical domains — **Traffic (Hyderabad ITMS), Hospital, Building, Industrial, Energy, Water** — each
with real state, entities, KPIs, operator actions, 60-min replay, 3D visualisation, alerts, and
JWT domain-scoped RBAC. The application identity is the **Multi-Domain Digital Twin Platform**;
Traffic is the flagship domain, not the app.

## Architecture
- **Backend**: FastAPI + MongoDB, one multiplexed WS `/api/ws/twins`, per-domain rolling
  1800-frame history buffer, domain-agnostic operator-action engine with cascading state
  mutations, Prometheus metrics endpoint `/api/metrics`, per-domain audit log.
- **Frontend**: React 19, Three.js/R3F, Platform Home at `/`, root-level domain routes
  `/traffic/*`, `/hospital/*`, `/building/*`, `/industrial/*`, `/energy/*`, `/water/*` with
  ~40 workspace pages. Domain-aware Sidebar, TopBar, breadcrumbs, notifications, AIRA.
- **Observability**: docker-compose bundles Prometheus + Grafana with 7 auto-provisioned
  dashboards (traffic, hospital, building, industrial, energy, water, system).
- **CI/CD**: Expanded Jenkins pipeline with per-domain smoke + operator + replay stages.

## Iter-10 Rebrand — Completed
- Removed Hyderabad-ITMS-only identity from global surfaces (login, platform home, top bar).
- New brand: **Multi-Domain Digital Twin Platform** with 6 domain pills.
- 9 seeded RBAC accounts (super/platform/traffic/hospital/building/industrial/energy/water/viewer)
  all using `@twin.platform` emails and password `Twin@2026`.
- Route restructure: `/` = Platform Home; `/{domain}/*` for every domain. Legacy `/domains/*`
  redirects to `/`. All module tiles updated.
- Server-side RBAC on `POST /api/twins/{domain}/action` — enforces domain scope + blocks Viewer.
- Cross-domain notification aggregator in TopBar with `[DOMAIN]` prefixed alerts.
- Domain-aware AIRA — `/api/assistant/stream` receives `{domain}` and uses matching KPI context.
- Legacy Hyderabad emails auto-purged on startup by `seed_users()`.

## Test credentials
See `/app/memory/test_credentials.md`. All 9 accounts share password `Twin@2026`.

## Backlog / Future
- P1: Grafana annotations from operator-action audit stream
- P2: 3D camera focus targeting per module
- P2: Soft-deactivate legacy accounts instead of hard delete (preserve audit-log identity)
- P3: Full E2E in Jenkins via headless Playwright container
