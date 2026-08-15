# Architecture

## Runtime flow

The FastAPI process owns a deterministic seeded Hyderabad network and a two-second asyncio simulation loop. Every tick mutates vehicle progress, speed, scenario impact, and a 60-minute replay buffer. Connected WebSocket clients receive a complete snapshot so the browser can stay responsive without polling for high-frequency data.

The React command center requests overview, road, vehicle, incident, forecast, and trend resources on load, then uses WebSocket telemetry for live metric and vehicle updates. React Three Fiber maps the seeded spatial graph into an interactive 3D scene; Recharts handles the forecast layer; Framer Motion supplies entrance and drawer transitions.

## Data model

`zones` contain named GHMC and metropolitan operating areas. `roads` contain endpoints, corridor type, lanes, speed, and congestion. `vehicles` contain type, route, progress, color, speed, and priority. `incidents` contain severity, location, status, age, and impact. Assistant transcripts are persisted to MongoDB with ISO timestamps.

## Production decisions

- In-memory simulation state keeps the demonstration fast and resilient; MongoDB is used for assistant history and is ready for durable seeds.
- All API responses are JSON-safe Pydantic-compatible dictionaries; MongoDB-generated `_id` values are never returned.
- Protected environment URLs remain externalized through the provided `.env` files.
- The browser has a local seeded fallback so the visual command center remains inspectable during API cold starts.