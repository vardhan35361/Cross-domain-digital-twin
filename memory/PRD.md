# Hyderabad Traffic Digital Twin — PRD

## Original Problem
Build a production-ready Hyderabad Traffic Digital Twin: cinematic 3D command center (React+Three.js), FastAPI backend with WebSockets, seeded real-time simulation, AI assistant, predictive analytics, incident/emergency management, Docker + Jenkins CI/CD, and comprehensive docs.

## User Personas
- Shift commander at a traffic authority monitoring GHMC + ORR
- Emergency response dispatcher staging green corridors
- Auditor / viva examiner reviewing the DevOps capstone

## Architecture
- Backend: FastAPI (Python 3.11) on :8001, /api prefix, WebSocket /api/ws/traffic, motor+MongoDB for AIRA logs, seeded simulation loop, TomTom + OpenWeather adapters with graceful fallback, Emergent LLM Key powered streaming assistant.
- Frontend: React + Vite-style CRA, Three.js/R3F/Drei 3D scene, Framer Motion, Recharts, lucide-react. State via hooks. Talks only via REACT_APP_BACKEND_URL.
- DevOps: Docker (multi-stage) + docker-compose, Nginx reverse proxy, Prometheus/Grafana wiring, Jenkinsfile with 15-stage pipeline, GitHub-ready.

## Implemented (as of Feb 2026)
- 3D digital twin scene, GHMC + ORR zone/road model, animated vehicles, weather rain layer
- Command overview metrics, congestion forecast (Area+Line chart), AI outlook, priority response, atmospherics
- Incident management (log + resolve + status), Scenario Lab (Office/Festival/Rainstorm/Cricket/VIP), AIRA assistant drawer w/ streaming
- **Live Adapter Status strip** (5 feeds: traffic/weather/cctv/signals/dispatch) with seeded/live indicators
- **Emergency Dispatch workspace** — origin/destination/vehicle form, dispatch result readout (route id, ETA, distance, signals optimized, green corridor status), recent dispatches log (cap 4)
- **Browser Voice Operations** — Web Speech API recognition (en-IN) + SpeechSynthesis TTS, graceful text fallback
- Docker, docker-compose.yml, Jenkinsfile, README + Architecture + DevOps_Guide + API_Documentation + Jenkins_Setup + Docker_Guide + Deployment_Guide + Viva_Demo_Script
- pytest suite (10 tests, 100% pass) covering health, live/status, traffic, weather, incidents lifecycle, predictions, simulation control, emergency routes

## Backlog / Next Phases
- P1: Wire real TomTom + OpenWeather keys via /app/backend/.env (feature already adapter-ready)
- P1: Componentize App.js into DigitalTwinMap.jsx / CommandSidebar.jsx / DispatchPanel.jsx / AssistantDrawer.jsx for maintainability
- P2: Persistent history in MongoDB for replay (currently in-memory 60-tick buffer)
- P2: Grafana dashboard live wiring + Prometheus scrape job for /api/overview
- P2: Multi-city / Telangana overview layer

## Health
- All endpoints 200 OK; WebSocket streaming snapshots
- 3D canvas renders; live adapter chips display SEEDED (expected)
- Voice + Dispatch verified via testing agent iteration_3
