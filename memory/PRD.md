# Multi-Domain Digital Twin Operating Platform — PRD (v3.5.0)

## Original Problem
Transform the Traffic ITMS into a scalable Digital Twin Operating Platform where six physical-world domains share one engine but each has a distinct operational experience with dedicated 3D scene, sidebar, KPIs, simulation, alerts and events.

## Architecture (delta from v3.0)
- **Shared 3D engine (DomainScene.jsx)**: single Three.js Canvas with per-domain scene component (HospitalScene / BuildingScene / IndustrialScene / EnergyScene / WaterScene). Reuses OrbitControls, lighting, camera, materials.
- **MongoDB persistence (backend/server.py + twins.py)**: `twin_state` collection with unique index on `domain`; checkpoint every 15 simulation ticks (~30s) via `_persist_domain_state()`; startup `_load_domain_store()` restores every non-Traffic domain's tick, scenario, entities.
- **Domain-aware WebSocket**: `/api/ws/traffic` (kept for compatibility) now also emits `{kind: "domain_snapshot", data: {domain, state, kpis, tick, scenario, running}}` for all 5 non-Traffic domains every tick. Frontend `DomainTwin.jsx` subscribes directly — no more 3-second REST polling.
- **Per-domain sidebar (Sidebar.jsx)**: `activeDomain` from `DomainContext` gates `TRAFFIC_NAV` vs `domainNav(id)`; brand mark, mode chip, and every nav item flip per active domain.

## Verified P0 Deliverables (iter_8)
- ✅ Backend restart preserves scenario + tick + entities (Mongo `twin_state`)
- ✅ WebSocket delivers `domain_snapshot` for all 5 domains within 12s of connect
- ✅ Hospital, Building, Industrial, Energy, Water each have a distinct 3D scene (floor plates + dept blocks, coloured floor plates with occupancy heatmap, production lines + tanks, radial substations + solar/wind, cylindrical reservoirs + pipeline + pumps)
- ✅ Sidebar transforms per active domain (mode chip + nav items)
- ✅ Deep-link to `/domains/energy` renders correct sidebar + scene + chip highlight on first paint
- ✅ 32/32 backend + 9/9 frontend scenarios pass; 0 bugs

## Backlog / Next Phases (explicitly deferred, tracked)
- P1: Per-domain replay page + timeline scrubber (currently only Traffic has replay)
- P1: Per-domain analytics workspace with Recharts (currently only Traffic has analytics)
- P1: Multiplex single WebSocket in a `WsProvider` — today `DomainTwin.jsx` opens/closes on each mount (works but wasteful across 6 hops)
- P1: `simulation_loop()` refactor into `_tick_traffic()` / `_tick_domains()` / `_broadcast_all()` helpers for testability
- P1: Persist last-successful checkpoint timestamp; surface in `/api/system/health` so operators see if Mongo went silent
- P2: Jenkins pipeline: add domain-integration stage referencing `test_iter8_persistence_ws.py`
- P2: Grafana as a docker-compose service with auto-provisioned domain dashboards
- P2: Per-domain operator actions (adjust HVAC, isolate substation, close valve) mutating twin state

## Health
Backend + Frontend + Mongo persistence all green. Every visible control performs a real action. No fake LIVE labels. Traffic ITMS + RBAC + drone/CCTV + audit trail fully preserved.
