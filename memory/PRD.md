# Hyderabad Traffic Digital Twin — PRD (v2.0.0)

## Original Problem
Government-grade Hyderabad ITMS command center: metropolitan-scale 3D digital twin with realistic animated vehicles, 11 dedicated command-center workspaces, live-feed adapters, corridor playback, VIP convoy operations, signal heatmap, and full DevOps monitoring — atop the existing FastAPI + React + WebSocket architecture. Do not regenerate; upgrade in place.

## Personas
- Shift commander at Hyderabad ITMS overseeing GHMC + ORR + NH44 + NH65
- Emergency dispatcher staging green corridors and VIP convoys
- Signal engineer tuning corridors from a live saturation heatmap
- DevOps operator monitoring infra + WebSocket + simulation FPS
- Viva examiner / auditor reviewing the DevOps + AI capstone

## Architecture
- Backend: FastAPI on :8001, all routes prefixed /api, WebSocket /api/ws/traffic streaming {kind:'snapshot', data:{...}} envelopes every 2s.
- Backend data: 24 zones, 37 corridors (highway/arterial/local/metro), 240 vehicles, corridor history (60min cap), convoy state, layer toggles, seeded heatmap w/ green/yellow/orange/red bands + pulse.
- Frontend: React + react-router-dom v7 (11 routes), TwinContext (global state + WS), Three.js/R3F 3D scene with realistic multi-part vehicles (chassis+cabin+wheels+head/taillights, emergency flashing), heatmap-band coloured roads, elevated flyovers, metro viaducts with pillars, low-poly buildings via drei Instances, night mode, rain shader.
- DevOps: Docker + docker-compose + Jenkinsfile + docs + prometheus/grafana wiring — preserved from v1.

## Implemented (Feb 2026 — v2.0.0)
- Metropolitan-scale Hyderabad digital twin (24 zones, 37 corridors incl. ORR/NH44/NH65 + 6 metro segments)
- Realistic 3D vehicle fleet (sedan/SUV/hatchback/bus/truck/2W/ambulance/police/fire/metro) with headlights, taillights, emergency flashing lights, emergency route trails
- 11 dedicated pages accessed via left sidebar: City overview · 3D digital twin · Traffic analytics · Predictive AI · Incidents · Emergency ops · VIP convoy · Signal control · Replay & timeline · Live data · System monitor
- Live-feed adapter matrix: LIVE/SEEDED badges, last-update timestamps, TomTom + OpenWeather env-key based auto-switch
- Corridor Playback: /api/replay/corridors + detail with waypoints and frame timeline; UI has timeline scrubber + play/pause/FF (1x/2x/4x)/rewind
- VIP Convoy operations: 4-waypoint planner, start/pause/resume/cancel + restore signals; live progress bar + ETA + signals held count
- Signal Heatmap grid: colour-coded saturation cells (green/yellow/orange/red) with pulsing crimson for critical (>88%); duration slider + mode picker (adaptive/manual/override)
- 8 toggleable map layers: Traffic density, Signal heatmap, Incidents, Weather, Emergency corridors, Metro layer, Drone overlay, Buildings
- System Monitor: backend/websocket/database/simulation/cpu metrics, p50/p95/p99 API latency, container topology, event throughput
- Analytics: congestion trend, zone comparison bars, peak-hour curve, corridor utilisation
- Predictive AI: 15/30/60-min horizons, ETA-by-corridor, signal optimisation recommendations, spread probability
- AIRA assistant drawer with Emergent LLM streaming + Web Speech API voice + TTS
- pytest suite grown to 18 tests (100% pass)
- Testing agent iteration_4 verified all 11 pages, all lifecycles

## Backlog / Next Phases
- P1: Wire real TomTom + OpenWeather keys via /app/backend/.env (adapters already ready)
- P1: Replay page loading skeleton (minor UX polish flagged by test agent)
- P2: MongoDB persistence for corridors + convoy history (currently in-memory 30-cap)
- P2: Prometheus scrape endpoint + Grafana dashboards live wiring
- P2: 3D drone-overlay layer implementation (toggle exists, visualisation TBD)
- P2: WebRTC-based CCTV feed simulator for the camera-feed cards

## Health
- All 18 pytest cases pass; frontend flows verified by testing agent iteration_4
- Live feeds intentionally SEEDED until user provides API keys
- Backend restart script recommended after hot-reload storms during heavy iteration
