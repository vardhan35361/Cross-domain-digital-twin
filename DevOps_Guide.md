# DevOps Guide

`docker compose up --build` creates MongoDB, the FastAPI backend, and the nginx-served frontend. Backend health is `/api/health`; frontend health is `/`. Compose restarts services unless stopped and persists MongoDB at `mongo_data`.

Jenkins follows checkout, dependency installation, lint/build, tests, image build, compose validation, deploy, health check, smoke test, archive, and rollback-on-failure. Configure a Pipeline from SCM with a GitHub webhook pointing to the Jenkins GitHub hook endpoint. The pipeline deliberately keeps smoke tests small enough for a viva or classroom VM.

For observability, import `grafana-dashboard.json` and add the `prometheus.yml` scrape job. In a real traffic authority deployment, replace seeded sources with signed camera, weather, signal, and GIS feeds and move simulation history to PostgreSQL or a time-series store.