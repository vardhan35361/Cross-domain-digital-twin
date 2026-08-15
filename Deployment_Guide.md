# Deployment Guide

Build from the repository root with `docker compose build` and start with `docker compose up -d`. Confirm `curl http://localhost:8001/api/health` and open the frontend host. For an authority environment, place the stack behind TLS, restrict CORS to the operator console, provide a managed MongoDB URL, and rotate the universal AI key through the secret manager.