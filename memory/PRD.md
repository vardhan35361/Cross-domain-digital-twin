# Hyderabad Traffic Digital Twin — Product Record

## Original problem statement
Build a complete production-ready full-stack project named Hyderabad Traffic Digital Twin: a government-style Hyderabad Smart City traffic command center with a cinematic neon/glass interface, interactive Three.js / React Three Fiber 3D city twin, continuously updating simulation, predictive analytics, incidents, emergency operations, replay, AI assistant, REST and WebSocket APIs, Docker, Jenkins CI/CD, automated testing, monitoring starter files, and complete documentation. The user selected the Emergent LLM key for the AI assistant and seeded simulated roads, vehicles, incidents, weather, and camera feeds for the demonstration.

## Product personas
- Shift commander: needs a fast city pulse, priority alerts, scenario controls, and a clear operational recommendation.
- Traffic analyst: needs corridor-level 3D context, forecasts, confidence, bottlenecks, and replay history.
- Emergency dispatcher: needs incident intake, resolution actions, ETA, green-corridor status, and response visibility.
- Viva / demo evaluator: needs a visually credible smart-city twin, documented architecture, working APIs, tests, Docker, and Jenkins flow.

## Static core requirements
- Hyderabad zones including GHMC areas, ORR, airport corridor, metro, NH65/NH44 context, and major named neighborhoods
- 3D roads, flyovers, metro corridor, low-poly buildings, vehicles, congestion streams, emergency markers, orbit camera, grid, and rain atmosphere
- Two-second live simulation with vehicle motion, speed, congestion, scenarios, weather impacts, and replay buffer
- 15/30/60-minute predictions with confidence, trend, bottleneck, and recommendation
- Incident lifecycle, emergency routing, scenario lab, live ticker, assistant, responsive dashboard, REST, WebSocket, OpenAPI
- Docker Compose, nginx WebSocket proxy, health checks, Jenkins pipeline, tests, Prometheus/Grafana starter, and handoff documentation

## Architecture decisions
- React 19 with the existing workspace CRA/CRACO runtime, React Three Fiber + Drei + Three for the interactive scene, Recharts for analytics, Framer Motion for transitions, and Lucide for operational iconography.
- FastAPI owns an asyncio simulation loop and a JSON-safe in-memory twin state for fast classroom/demo operation. MongoDB is used for assistant transcript persistence through the protected MONGO_URL and DB_NAME environment contract.
- WebSocket snapshots deliver the whole live state every two seconds; regular REST endpoints serve initial views and operational actions.
- AIRA uses the Emergent universal key and GPT-5.4 streaming when available, with an 18-second bounded stream and local live-context fallback so the public API remains responsive.
- Seeded simulation is intentional: no live government camera, GIS, weather, or signal feeds are claimed by the demo.

## What's implemented
- 2026-08-15: Replaced starter screen with premium Hyderabad command center dashboard and responsive visual system.
- 2026-08-15: Added 3D digital twin scene, live metrics, vehicle streams, incident panel, forecast charts, scenario lab, timeline, ticker, and AIRA drawer.
- 2026-08-15: Added FastAPI REST/WebSocket simulation, seeded zones/roads/vehicles/incidents, predictions, weather, replay, routing, incident CRUD, and bounded assistant streaming.
- 2026-08-15: Added Dockerfiles, Compose, nginx WebSocket configuration, Jenkins pipeline, Prometheus/Grafana starters, tests, and documentation set.
- 2026-08-15: Fixed incident modal/create/resolve interactions, Emergency Ops navigation, 404 semantics, environment test parsing, and long-AIRA resilience.
- 2026-08-15: Regression review passed REST, WebSocket, desktop/mobile UI, 3D rendering, scenario controls, assistant, incident lifecycle, and health-during-assistant checks.

## Prioritized backlog
### P0 — next production step
- Replace seeded roads and camera labels with signed Hyderabad GIS, CCTV, signal-controller, weather, and emergency dispatch adapters.
- Add operator authentication, audit logs, RBAC, and durable simulation/event storage for authority deployment.
- Add managed observability metrics, alerting, and load tests for concurrent WebSocket clients.

### P1 — valuable product expansion
- Add a dedicated Emergency Operations route with ambulance/fire/police dispatch forms and rendered green corridors.
- Make the replay slider drive historical snapshots and add incident clustering / route comparison views.
- Add voice capture and spoken AIRA responses with browser permission states and accessible transcripts.

### P2 — polish and ecosystem
- Add Telangana overview mode and corridor drill-down detail pages.
- Add real camera thumbnail tiles and operator annotations.
- Add scheduled report export for daily traffic performance and incident summaries.

## Next tasks
1. Wire signed live data adapters behind the existing REST/WebSocket contracts.
2. Add role-based operator access and an audit timeline.
3. Promote emergency routing into its own dedicated operational page.
