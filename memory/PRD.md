# Hyderabad ITMS Command Center — PRD (v2.5.0)

## Original Problem
Transform the Hyderabad Traffic Digital Twin into a government-grade Integrated Traffic Management Center (ITMS) with role-based login, 16 dedicated command-center workspaces, realistic lane-based simulation with signal queues, drone surveillance, CCTV network, MongoDB-persisted audit trail, and preserved 3D metropolitan twin.

## Personas
- Super Administrator (system/user/config authority)
- Control Room Administrator (command floor operator, no config)
- Senior Traffic Officer (traffic engineering + convoy operations)
- Zone Traffic Officer (assigned zone only — read + incident logging)
- Emergency Dispatch Officer (108/police/fire green corridors)
- Viewer / Observer (read-only press/media)

## Architecture
- **Backend**: FastAPI + MongoDB (motor) + JWT (PyJWT) + bcrypt + WebSocket /api/ws/traffic every 2s; auth.py mounts /api/auth/*, /api/users, /api/audit with role-based dependency guards. Simulation loop advances vehicles along road splines with lane-based drag, signal-queue deceleration near junctions, dispersion, spillback, and emergency priority.
- **Frontend**: React + react-router-dom v7 (16 protected routes + /login), AuthContext + Guarded wrapper, TwinContext for live data, dedicated pages per workspace, DroneCanvas synthetic camera view for drone + CCTV grids.
- **Persistence**: MongoDB users/audit_logs collections; audit events for auth.login, auth.logout, auth.login_failed, auth.login_blocked, signal.override, user.deactivate, user.reactivate.

## Implemented (Feb 2026 — v2.5.0)
- **Auth**: 6 seeded government role accounts (password Hyderabad@2026), JWT (8-hour shift token) via httpOnly cookie + Authorization header, `/app/memory/test_credentials.md` updated.
- **RBAC**: Role catalogue with per-role permission lists; sidebar auto-filters (viewer sees 4 items, super_admin sees 16); backend enforces 403 for missing permissions.
- **Realistic simulation**: Lane assignment, signal-queue slowdown when approaching junctions in the wrong phase, dispersion via lane-change, congestion spillback across connected roads, scenario boost (Cricket/Rain/Festival/VIP), emergency priority bypass.
- **Junctions**: /api/junctions returns 11 major intersections with 4-phase cycle (NS/EW/AR/LT), remaining seconds, queue length, override state.
- **Drone Surveillance workspace**: 5 synthetic drone feeds (SKY-01…05) rendered via DroneCanvas (3D moving vehicles + HUD reticle + timecode + REC), PTZ controls (pan/tilt/zoom/recenter/play-pause), battery/altitude/link/target readouts.
- **CCTV Network workspace**: 12 cameras across zones with zone-filter chips, online/degraded chips, fullscreen modal with animated feed.
- **User Admin workspace**: super_admin-only officer directory with deactivate/reactivate.
- **Audit Logs workspace**: 4-way filter (all/auth/signal/user), auto-refresh every 8s.
- **Settings workspace**: 7 scenarios + 3 weathers + 4 time-of-day + default layer visibility toggles.
- **Replay loading skeleton** (previous action-item resolved).
- **Login rejects inactive users** (previous minor security note resolved).
- **Docs**: All previous docs preserved; test_credentials.md updated with full seeded roster.
- Tests: 39/39 pass (21 new RBAC/sim/audit/drone/cctv/junction + 18 regression).

## Backlog / Next Phases
- P1: Wire real TomTom + OpenWeather keys in backend .env — adapters already auto-switch to LIVE.
- P2: Grafana as a docker-compose service consuming the existing prometheus.yml + grafana-dashboard.json (currently JSON template exists; container not yet wired).
- P2: Persist convoy/corridor state in MongoDB (currently in-memory 30/120 cap).
- P2: LOD + frustum-culled instanced buildings for high-density day.
- P2: Password reset flow + email delivery.

## Health
- Backend + Frontend green; all 39 automated tests pass (iteration_5).
- Live adapters intentionally SEEDED until keys provided.
- Backend restart recommended once when uvicorn hot-reload storm blocks HTTPS calls after test-file edits under /app/backend.
