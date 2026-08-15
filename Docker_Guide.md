# Docker Guide

The Compose topology is `frontend -> backend -> mongo`. Nginx serves the compiled React app, proxies `/api`, and upgrades `/api/ws/` to a WebSocket. Backend and frontend images each include health checks. `docker compose down -v` removes the demonstration MongoDB volume; omit `-v` to retain assistant transcripts.