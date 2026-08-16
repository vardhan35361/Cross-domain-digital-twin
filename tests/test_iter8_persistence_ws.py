"""Iteration 8 — MongoDB persistence across restart + per-domain WebSocket envelope."""
import asyncio
import json
import os
import subprocess
import time

import pytest
import requests
import websockets
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"
WS_URL = BASE.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/traffic"

NON_TRAFFIC_DOMAINS = ["hospital", "building", "industrial", "energy", "water"]


def _wait_backend(timeout=45):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{API}/health", timeout=3)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def test_mongo_persistence_survives_restart():
    """Set hospital scenario -> wait for checkpoint -> restart backend -> verify state restored."""
    # 1. Set scenario
    r = requests.post(f"{API}/twins/hospital/simulation",
                      json={"scenario": "Emergency surge", "running": True}, timeout=15)
    assert r.status_code == 200
    assert r.json()["scenario"] == "Emergency surge"

    # 2. Wait for tick-15 checkpoint (2s per tick -> 30s+ buffer)
    time.sleep(32)
    pre = requests.get(f"{API}/twins/hospital", timeout=15).json()
    pre_tick = pre["tick"]
    assert pre["scenario"] == "Emergency surge"
    assert pre_tick >= 15, f"Expected tick >= 15 before restart, got {pre_tick}"

    # 3. Restart backend
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, timeout=90)
    time.sleep(6)
    assert _wait_backend(60), "Backend did not come back up in time"

    # 4. Verify state was restored
    post = requests.get(f"{API}/twins/hospital", timeout=15).json()
    assert post["scenario"] == "Emergency surge", f"Scenario lost after restart: {post['scenario']}"
    assert post["tick"] >= pre_tick, f"Tick regressed after restart (pre={pre_tick}, post={post['tick']})"
    # Reset to normal
    requests.post(f"{API}/twins/hospital/simulation",
                  json={"scenario": "Normal operations"}, timeout=15)


def test_all_five_domains_persisted_in_mongo():
    """After restart cycle above, /api/twins/{d} must return non-zero tick for all 5 domains,
    proving they were persisted+restored."""
    # Force a checkpoint first
    time.sleep(32)
    for d in NON_TRAFFIC_DOMAINS:
        snap = requests.get(f"{API}/twins/{d}", timeout=15).json()
        assert "tick" in snap and isinstance(snap["tick"], int)
        assert snap["tick"] >= 1, f"{d} tick not advancing"

    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, timeout=90)
    time.sleep(6)
    assert _wait_backend(60)

    for d in NON_TRAFFIC_DOMAINS:
        snap = requests.get(f"{API}/twins/{d}", timeout=15).json()
        # After restore, tick should be >= 15 (last checkpoint), not zero
        assert snap["tick"] >= 15, f"{d} not restored from MongoDB, tick={snap['tick']}"


# ---------------- WebSocket domain envelope ----------------

async def _collect_ws(seconds: float = 12.0):
    kinds = []
    domain_snapshots = {}
    try:
        async with websockets.connect(WS_URL, open_timeout=8, close_timeout=2) as ws:
            deadline = asyncio.get_event_loop().time() + seconds
            while asyncio.get_event_loop().time() < deadline:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=seconds)
                except asyncio.TimeoutError:
                    break
                msg = json.loads(raw)
                kinds.append(msg.get("kind"))
                if msg.get("kind") == "domain_snapshot":
                    d = msg.get("data", {}).get("domain")
                    if d:
                        domain_snapshots.setdefault(d, msg["data"])
    except Exception as exc:
        pytest.fail(f"WebSocket connection failed: {exc}")
    return kinds, domain_snapshots


def test_ws_domain_snapshot_all_five_domains():
    kinds, snaps = asyncio.get_event_loop().run_until_complete(_collect_ws(12.0))
    assert "snapshot" in kinds, "Initial traffic snapshot missing"
    assert "domain_snapshot" in kinds, "No domain_snapshot messages received"
    missing = [d for d in NON_TRAFFIC_DOMAINS if d not in snaps]
    assert not missing, f"Missing domain_snapshot for: {missing}. Got: {list(snaps.keys())}"
    # Envelope shape check on first hospital snapshot
    h = snaps["hospital"]
    for key in ["domain", "state", "kpis", "tick", "scenario", "running"]:
        assert key in h, f"domain_snapshot missing key '{key}'"
    assert h["domain"] == "hospital"
    assert isinstance(h["kpis"], dict) and h["kpis"]


def test_ws_arrives_within_5s():
    async def first_snap():
        async with websockets.connect(WS_URL, open_timeout=8) as ws:
            t0 = time.time()
            raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            return json.loads(raw), time.time() - t0
    msg, elapsed = asyncio.get_event_loop().run_until_complete(first_snap())
    assert elapsed < 5.0
    assert msg.get("kind") in ("snapshot", "domain_snapshot")
