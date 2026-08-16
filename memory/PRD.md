# Multi-Domain Digital Twin Platform — PRD (v3.0.0)

## Original Problem
Transform the Hyderabad Traffic Digital Twin into a reusable Multi-Domain Digital Twin Platform, preserving the existing flagship Traffic ITMS and adding 5 additional domains (Hospital, Building, Industrial, Energy, Water) on a common twin engine.

## Personas (preserved from ITMS v2.5)
Super Admin · Control Admin · Senior Officer · Zone Officer · Dispatch Officer · Viewer.
Now also: platform operator switching across 6 domain workspaces from the header.

## Architecture (delta from v2.5)
- **backend/twins.py**: domain registry + per-domain init/tick/kpi functions + generic APIs (`/api/domains`, `/api/domains/{id}`, `/api/twins/{domain}`, `/api/twins/{domain}/state`, `/api/twins/{domain}/events`, `/api/twins/{domain}/alerts`, `POST /api/twins/{domain}/simulation`, `POST /api/twins/{domain}/simulation/reset`, `/api/data-sources`).
- **server.py**: mounts twins router; simulation_loop ticks all 5 non-traffic domains every 2 seconds alongside traffic.
- **frontend/src/state/DomainContext.jsx**: active-domain state + URL-driven switcher.
- **frontend/src/layout/DomainSwitcher.jsx**: header chip strip; auto-syncs to `/domains/:id` URL.
- **frontend/src/pages/DomainsHome.jsx**: registry gallery with FLAGSHIP badge on Traffic.
- **frontend/src/pages/DomainTwin.jsx**: generic domain workspace (KPIs + scenario buttons + pause/reset + alerts + events + entity tables per-domain).
- **frontend/src/pages/DataSources.jsx**: truth-labelled ingestion matrix (LIVE / SIMULATED / SEEDED / OFFLINE).

## Implemented Domains
- **Traffic (flagship, preserved)**: 24 zones, 37 corridors, 240 vehicles, 11 junctions with signal queues, incidents, VIP convoy, drone + CCTV surveillance, RBAC-guarded ops.
- **Hospital**: 6 departments (ER/ICU/OR/General/Pediatric/Maternity), 6 equipment, 4 ambulances, 5 scenarios (Normal / Emergency surge / ICU surge / Equipment failure / Ambulance surge), dedup'd HIGH alerts on capacity breach.
- **Building**: 10 floors + rooms + HVAC (occupancy-linked load) + 4 elevators + fire alarm + energy_kWh accumulator, 5 scenarios (Normal / Peak / HVAC failure / Elevator failure / Fire alert).
- **Industrial**: 4 production lines + 8 sensors, 2 scenarios (Normal / Line shutdown).
- **Energy**: 4 substations + generation mix (Solar/Wind/Grid/Battery), 3 scenarios (Balanced / Peak demand / Substation outage).
- **Water**: 4 reservoirs (Manjira/Nagarjuna/Osman Sagar/Krishna) + 6 pumps + quality (pH/turbidity/chlorine), 3 scenarios (Normal / Drought / Leak detected).

## Truthfulness Guarantees
- No fake charts. Every entity table & KPI is computed from the live simulation store.
- No fake LIVE labels. TomTom + OpenWeather + external APIs show OFFLINE until the env key is provided; then flip to LIVE automatically (env-gated code path).
- No dead buttons. Every scenario/pause/reset button issues a real backend call; every domain chip navigates to a real workspace.
- Alerts are dedup'd (hospital capacity alerts use `dedup_key`); events + alerts are capped at 40.

## Testing
- iteration_6: 28 new twin tests + full traffic/auth regression → **PASS**
- iteration_7 (retest of chip / dedup / LIVE-flip fixes): **28/28 backend pass + all 3 targeted UI scenarios pass, zero remaining issues**
- Total automated coverage across the platform: ~95 backend tests + full Playwright coverage of all workspaces.

## Backlog / Next Phases
- P1: Persist domain twin state in MongoDB so backend restarts don't zero ticks.
- P1: Dedicate a domain-native 3D scene for Hospital and Building (currently the 3D twin is Traffic-only).
- P2: Real-time WebSocket events per domain (currently WS broadcasts Traffic snapshot; domain state is polled every 3s via REST).
- P2: Grafana container in docker-compose + auto-provisioned dashboards.
- P2: Move DomainContext URL sync into the context itself (currently in DomainSwitcher useEffect).

## Health
- Backend and frontend green.
- Multi-domain platform runs end-to-end.
- No data source falsely labelled LIVE.
