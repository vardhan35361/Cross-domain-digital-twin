"""Iter-9 workspace + operator action tests.

Covers:
  - Real state-mutating operator actions for all 5 non-traffic domains
  - Cascading isolation on Energy substation
  - Replay history (60-minute buffer, frame_count > 0)
  - Multiplexed WebSocket /api/ws/twins delivering domain_snapshot envelopes
  - Prometheus /api/metrics endpoint
  - Twin snapshot shape (icu_beds count == 18, ER queue non-empty)
"""
from __future__ import annotations

import asyncio
import json
import os
import time

import pytest
import requests

# Optional websockets dep
try:
    import websockets  # type: ignore
except Exception:  # pragma: no cover
    websockets = None

def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if not v:
        try:
            for line in open("/app/frontend/.env"):
                if line.startswith("REACT_APP_BACKEND_URL="):
                    v = line.split("=", 1)[1].strip()
                    break
        except Exception:
            pass
    return (v or "").rstrip("/")


BASE_URL = _load_url()
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
WS_URL = BASE_URL.replace("http", "ws") + "/api/ws/twins"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---------- baseline snapshots ----------
def test_domains_list(s):
    r = s.get(f"{BASE_URL}/api/domains", timeout=10)
    assert r.status_code == 200
    ids = {d["id"] for d in r.json()}
    assert {"traffic", "hospital", "building", "industrial", "energy", "water"}.issubset(ids)


@pytest.mark.parametrize("domain", ["hospital", "building", "industrial", "energy", "water"])
def test_twin_snapshot(s, domain):
    r = s.get(f"{BASE_URL}/api/twins/{domain}", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["domain"] == domain
    assert "state" in body and "kpis" in body
    assert isinstance(body["tick"], int)


def test_hospital_icu_beds_18(s):
    body = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()
    beds = body["state"]["icu_beds"]
    assert len(beds) == 18
    occupied = [b for b in beds if b["occupied"]]
    assert occupied, "Expected some occupied ICU beds"
    for b in occupied:
        assert b["heart_rate"] > 0 and b["spo2"] > 0


def test_hospital_er_queue_populated(s):
    body = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()
    queue = body["state"]["er_queue"]
    assert len(queue) > 0
    tags = {p["triage"] for p in queue}
    assert tags & {"red", "orange", "yellow", "green"}


# ---------- Hospital actions ----------
def test_hospital_icu_bed_discharge(s):
    body = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()
    bed = next(b for b in body["state"]["icu_beds"] if b["occupied"])
    r = s.post(f"{BASE_URL}/api/twins/hospital/action",
               json={"action": "icu_bed.discharge", "params": {"bed_id": bed["id"]}}, timeout=10)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True
    # GET verify
    body2 = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()
    bed2 = next(b for b in body2["state"]["icu_beds"] if b["id"] == bed["id"])
    assert bed2["occupied"] is False
    assert bed2["patient_id"] is None


def test_hospital_ward_offline_restore(s):
    r = s.post(f"{BASE_URL}/api/twins/hospital/action",
               json={"action": "ward.offline", "params": {"dept_id": "dept-general"}}, timeout=10)
    assert r.status_code == 200
    body = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()
    dept = next(d for d in body["state"]["depts"] if d["id"] == "dept-general")
    assert dept["offline"] is True
    assert dept["state"] == "OFFLINE"
    # restore
    r = s.post(f"{BASE_URL}/api/twins/hospital/action",
               json={"action": "ward.restore", "params": {"dept_id": "dept-general"}}, timeout=10)
    assert r.status_code == 200
    body = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()
    dept = next(d for d in body["state"]["depts"] if d["id"] == "dept-general")
    assert dept["offline"] is False


def test_hospital_ambulance_dispatch(s):
    body = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()
    amb = next((a for a in body["state"]["ambulances"] if a["status"] == "available"), None)
    if not amb:
        pytest.skip("No available ambulance to dispatch (transient)")
    r = s.post(f"{BASE_URL}/api/twins/hospital/action",
               json={"action": "ambulance.dispatch",
                     "params": {"ambulance_id": amb["id"], "zone": "TEST_ZONE", "eta": 8}}, timeout=10)
    assert r.status_code == 200
    body2 = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()
    amb2 = next(a for a in body2["state"]["ambulances"] if a["id"] == amb["id"])
    assert amb2["status"] == "en_route"


# ---------- Energy cascading isolation ----------
def test_energy_substation_isolate_cascades(s):
    r = s.post(f"{BASE_URL}/api/twins/energy/action",
               json={"action": "substation.isolate", "params": {"substation_id": "sub-1"}}, timeout=10)
    assert r.status_code == 200, r.text
    body = s.get(f"{BASE_URL}/api/twins/energy", timeout=10).json()
    sub = next(s2 for s2 in body["state"]["substations"] if s2["id"] == "sub-1")
    assert sub["isolated"] is True
    assert sub["state"] == "OFFLINE"
    for t in body["state"]["transformers"]:
        if t["substation"] == "sub-1":
            assert t["state"] == "OFFLINE"
    for f in body["state"]["feeders"]:
        if f["substation"] == "sub-1":
            assert f["state"] == "OFFLINE"
            assert f["energized"] is False
    # restore for cleanup
    s.post(f"{BASE_URL}/api/twins/energy/action",
           json={"action": "substation.restore", "params": {"substation_id": "sub-1"}}, timeout=10)


def test_energy_feeder_deenergize(s):
    r = s.post(f"{BASE_URL}/api/twins/energy/action",
               json={"action": "feeder.deenergize", "params": {"feeder_id": "feed-02"}}, timeout=10)
    assert r.status_code == 200
    body = s.get(f"{BASE_URL}/api/twins/energy", timeout=10).json()
    f = next(x for x in body["state"]["feeders"] if x["id"] == "feed-02")
    assert f["energized"] is False
    s.post(f"{BASE_URL}/api/twins/energy/action",
           json={"action": "feeder.energize", "params": {"feeder_id": "feed-02"}}, timeout=10)


# ---------- Water actions ----------
def test_water_valve_close_open(s):
    r = s.post(f"{BASE_URL}/api/twins/water/action",
               json={"action": "valve.close", "params": {"valve_id": "vlv-03"}}, timeout=10)
    assert r.status_code == 200
    body = s.get(f"{BASE_URL}/api/twins/water", timeout=10).json()
    v = next(x for x in body["state"]["valves"] if x["id"] == "vlv-03")
    assert v["open"] is False
    assert v["state"] == "OFFLINE"
    r = s.post(f"{BASE_URL}/api/twins/water/action",
               json={"action": "valve.open", "params": {"valve_id": "vlv-03"}}, timeout=10)
    assert r.status_code == 200


def test_water_pump_stop_start(s):
    r = s.post(f"{BASE_URL}/api/twins/water/action",
               json={"action": "pump.stop", "params": {"pump_id": "pmp-2"}}, timeout=10)
    assert r.status_code == 200
    body = s.get(f"{BASE_URL}/api/twins/water", timeout=10).json()
    p = next(x for x in body["state"]["pumps"] if x["id"] == "pmp-2")
    assert p["status"] == "stopped"
    r = s.post(f"{BASE_URL}/api/twins/water/action",
               json={"action": "pump.start", "params": {"pump_id": "pmp-2"}}, timeout=10)
    assert r.status_code == 200


# ---------- Building actions ----------
def test_building_hvac_setpoint(s):
    r = s.post(f"{BASE_URL}/api/twins/building/action",
               json={"action": "hvac.setpoint", "params": {"zone_id": "hvac-z1", "setpoint": 24.5}}, timeout=10)
    assert r.status_code == 200
    body = s.get(f"{BASE_URL}/api/twins/building", timeout=10).json()
    z = next(x for x in body["state"]["hvac_zones"] if x["id"] == "hvac-z1")
    assert abs(z["setpoint"] - 24.5) < 0.01


def test_building_elevator_maintenance_restore(s):
    r = s.post(f"{BASE_URL}/api/twins/building/action",
               json={"action": "elevator.maintenance", "params": {"elevator_id": "lift-1"}}, timeout=10)
    assert r.status_code == 200
    body = s.get(f"{BASE_URL}/api/twins/building", timeout=10).json()
    lift = next(x for x in body["state"]["elevators"] if x["id"] == "lift-1")
    assert lift["state"] == "MAINTENANCE"
    r = s.post(f"{BASE_URL}/api/twins/building/action",
               json={"action": "elevator.restore", "params": {"elevator_id": "lift-1"}}, timeout=10)
    assert r.status_code == 200


# ---------- Industrial actions ----------
def test_industrial_machine_stop_restart(s):
    r = s.post(f"{BASE_URL}/api/twins/industrial/action",
               json={"action": "machine.stop", "params": {"machine_id": "mach-03"}}, timeout=10)
    assert r.status_code == 200
    body = s.get(f"{BASE_URL}/api/twins/industrial", timeout=10).json()
    m = next(x for x in body["state"]["machines"] if x["id"] == "mach-03")
    assert m["status"] == "stopped"
    r = s.post(f"{BASE_URL}/api/twins/industrial/action",
               json={"action": "machine.restart", "params": {"machine_id": "mach-03"}}, timeout=10)
    assert r.status_code == 200


# ---------- Replay history ----------
@pytest.mark.parametrize("domain", ["hospital", "energy", "water", "building", "industrial"])
def test_history_has_frames(s, domain):
    r = s.get(f"{BASE_URL}/api/twins/{domain}/history?minutes=60", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["frame_count"] > 0
    assert body["frames"], "replay frames must not be empty"
    f0 = body["frames"][0]
    assert "tick" in f0 and "kpis" in f0 and "state" in f0


# ---------- Metrics ----------
def test_prometheus_metrics(s):
    r = s.get(f"{BASE_URL}/api/metrics", timeout=10)
    assert r.status_code == 200
    assert "text/plain" in r.headers.get("content-type", "")
    body = r.text
    assert "traffic_active_vehicles" in body
    assert "twin_hospital_occupancy_percent" in body


# ---------- Persistence ----------
def test_hospital_tick_increases(s):
    a = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()["tick"]
    time.sleep(3.0)
    b = s.get(f"{BASE_URL}/api/twins/hospital", timeout=10).json()["tick"]
    assert b > a, f"tick did not advance: {a}->{b}"


# ---------- Multiplexed WebSocket ----------
@pytest.mark.skipif(websockets is None, reason="websockets lib not installed")
def test_ws_domain_snapshot_envelopes():
    async def run():
        received = {"kinds": set(), "domains": set()}
        async with websockets.connect(WS_URL, open_timeout=10, close_timeout=5) as ws:
            end = time.time() + 12
            while time.time() < end:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=4)
                except asyncio.TimeoutError:
                    break
                try:
                    msg = json.loads(raw)
                except Exception:
                    continue
                kind = msg.get("kind")
                received["kinds"].add(kind)
                if kind == "domain_snapshot":
                    d = (msg.get("data") or {}).get("domain")
                    if d:
                        received["domains"].add(d)
                if received["domains"] >= {"hospital", "building", "industrial", "energy", "water"}:
                    break
        return received
    got = asyncio.get_event_loop().run_until_complete(run()) if False else asyncio.run(run())
    assert "domain_snapshot" in got["kinds"], f"kinds={got['kinds']}"
    assert {"hospital", "building", "industrial", "energy", "water"}.issubset(got["domains"]), got["domains"]
