# Multi-Domain Digital Twin Platform — PRD

## Vision
A cinematic multi-domain digital-twin operating system. Six independent physical domains — Traffic (Hyderabad ITMS), Hospital (hero), Building, Industrial, Energy, Water — each with real state, KPIs, operator actions, replay, and 3D visualisation. The product identity is **Multi-Domain Digital Twin Platform**; Traffic is one flagship domain, not the app.

## Architecture
- **Backend**: FastAPI + MongoDB, one multiplexed WS `/api/ws/twins`, per-domain rolling 1800-frame history buffer, domain-agnostic operator-action engine with cascading state mutations, Prometheus metrics `/api/metrics`, JWT + domain-scoped RBAC.
- **Frontend**: React 19, Three.js/R3F, Platform Home at `/`, root-level domain routes `/{domain}/*` with ~40 workspace pages, `DomainRouteGuard` for RBAC.
- **Observability**: docker-compose bundles Prometheus + Grafana with 7 auto-provisioned dashboards.
- **CI/CD**: Expanded Jenkins pipeline with per-domain smoke + operator + replay stages.

## Iter-11 RBAC Hardening — Completed (this turn)
- **Backend guards** on every twin read (`GET /api/twins/{d}`, `/events`, `/alerts`, `/history`, `/state`, `/history/frame`) and every mutation (`POST /action`, `/simulation`, `/simulation/reset`), plus Traffic (`/api/traffic`, `/api/traffic/history`, `/api/traffic/action/*`).
- **WebSocket auth** on `/api/ws/twins` — requires cookie or `?token=`, per-connection domain filter on `broadcast()`.
- **AIRA RBAC** — structured HTTP 403 when cross-domain query attempted.
- **Frontend** — `DomainRouteGuard` wraps every `/{domain}/*` route with `AccessDenied` page; Sidebar shows locked stubs for restricted domains; DomainSwitcher shows locked chips; PlatformHome tiles marked "🔒 NOT AUTHORISED"; notifications filtered by user domains; ActionButton disables for cross-domain / viewer.
- **Viewer scope** limited to `hospital + traffic` (per spec — Viewer is not "everything read-only").
- **17/17 pytest RBAC matrix + Playwright frontend flows PASS** (iter_11.json).
- Structured JSON refusal for AIRA (code-review comment applied).
- `_guard_read` now hard-fails on missing user.
- Anonymous WS handshake rejected with close code 4401.

## Test credentials
See `/app/memory/test_credentials.md`. 9 seeded accounts, all password `Twin@2026`.

## Backlog / Future
- P1: Cookie-only WS auth (block query-param token in prod; keep for dev)
- P1: Grafana annotations from operator-action audit stream
- P2: 3D camera focus targeting per module
- P2: Cross-domain playbook runs (e.g. substation outage → hospital backup power)
- P3: Full E2E in Jenkins via headless Playwright container
