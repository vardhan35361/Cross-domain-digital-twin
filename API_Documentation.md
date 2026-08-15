# API Documentation

FastAPI generates interactive OpenAPI at `/api/docs` and `/api/redoc`.

## Simulation

`GET /api/overview` returns active vehicles, speed, congestion, air quality, weather, incidents, emergency state, and tick. `POST /api/simulation/control` accepts `{ "running": true, "scenario": "Rainstorm", "weather": "Rainstorm" }`. `GET /api/simulation/status` exposes the loop state.

## Intelligence

`GET /api/predictions` returns 15 / 30 / 60-minute horizons, confidence, spread probability, bottleneck, and recommendation. `GET /api/analytics/trend` returns chart points. `POST /api/emergency/routes` accepts origin, destination, and vehicle type and returns ETA, distance, signal count, and green corridor state.

## Operations

`GET /api/incidents`, `POST /api/incidents`, and `POST /api/incidents/{id}/resolve` manage the response desk. `GET /api/replay` returns the last 60 ticks. `/api/ws/traffic` emits complete snapshots every two seconds while connected.

## Assistant

`POST /api/assistant/stream` accepts `{ "message": "Where is the bottleneck?" }` and streams plain text. It uses the Emergent universal key with GPT-5.4 when available and falls back to a live-context local readout if the provider is unavailable.