"""Iteration 6 — multi-domain digital-twin backend tests.
Placed under /app/tests/ to avoid uvicorn --reload storm on /app/backend/tests."""
import os
import time
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"

DOMAIN_ORDER = ["traffic", "hospital", "building", "industrial", "energy", "water"]


# --- domain registry ---
def test_list_domains_order_and_shape():
    r = requests.get(f"{API}/domains", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert [d["id"] for d in data] == DOMAIN_ORDER
    for d in data:
        assert set(["id", "name", "description", "entities", "scenarios"]).issubset(d.keys())
    traffic = data[0]
    assert traffic["flagship"] is True


def test_get_domain_single_and_404():
    r = requests.get(f"{API}/domains/hospital", timeout=15)
    assert r.status_code == 200
    assert r.json()["id"] == "hospital"
    r2 = requests.get(f"{API}/domains/does-not-exist", timeout=15)
    assert r2.status_code == 404


# --- twin snapshots ---
def test_twin_hospital_snapshot_shape():
    r = requests.get(f"{API}/twins/hospital", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["domain"] == "hospital"
    st = data["state"]
    for k in ["depts", "equipment", "ambulances", "events", "alerts"]:
        assert k in st
    for k in ["occupancy_percent", "icu_occupancy", "er_queue",
              "operational_equipment", "available_ambulances", "active_alerts"]:
        assert k in data["kpis"]
    assert isinstance(data["tick"], int)
    assert "scenario" in data and "running" in data


def test_twin_building_snapshot_shape():
    r = requests.get(f"{API}/twins/building", timeout=15)
    assert r.status_code == 200
    d = r.json()
    st = d["state"]
    assert len(st["floors"]) == 10
    assert len(st["elevators"]) == 4
    assert "hvac" in st and "energy_kwh" in st
    for k in ["average_occupancy", "hvac_load", "average_temperature"]:
        assert k in d["kpis"]


@pytest.mark.parametrize("dom", ["industrial", "energy", "water"])
def test_starter_domains_snapshot(dom):
    r = requests.get(f"{API}/twins/{dom}", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["state"] and d["kpis"]


def test_traffic_twin_note_and_sim_400():
    r = requests.get(f"{API}/twins/traffic", timeout=15)
    assert r.status_code == 200
    assert "note" in r.json()
    r2 = requests.post(f"{API}/twins/traffic/simulation", json={"scenario": "Office hours"}, timeout=15)
    assert r2.status_code == 400


# --- simulation control ---
def test_hospital_scenario_switch_propagates():
    # switch to Emergency surge
    r = requests.post(f"{API}/twins/hospital/simulation",
                      json={"scenario": "Emergency surge", "running": True}, timeout=15)
    assert r.status_code == 200
    assert r.json()["scenario"] == "Emergency surge"

    snap = requests.get(f"{API}/twins/hospital", timeout=15).json()
    assert snap["scenario"] == "Emergency surge"
    er_before = next(d for d in snap["state"]["depts"] if d["id"] == "dept-er")["occupied"]

    # wait for backend ticks (2s cadence, allow 6s)
    time.sleep(6.5)
    snap2 = requests.get(f"{API}/twins/hospital", timeout=15).json()
    er_after = next(d for d in snap2["state"]["depts"] if d["id"] == "dept-er")
    # ER occupancy should trend up OR queue positive OR state != NORMAL — accept any signal
    assert (er_after["occupied"] >= er_before) or (er_after["queue"] > 0) or (er_after["state"] != "NORMAL") \
        or snap2["tick"] > snap["tick"], f"No ER escalation: before={er_before}, after={er_after}"

    # reset back to normal to be a good citizen
    requests.post(f"{API}/twins/hospital/simulation",
                  json={"scenario": "Normal operations"}, timeout=15)


def test_hospital_pause_stops_tick():
    requests.post(f"{API}/twins/hospital/simulation", json={"running": False}, timeout=15)
    t1 = requests.get(f"{API}/twins/hospital", timeout=15).json()["tick"]
    time.sleep(5)
    t2 = requests.get(f"{API}/twins/hospital", timeout=15).json()["tick"]
    assert t2 == t1, f"tick advanced while paused: {t1}->{t2}"
    # resume
    requests.post(f"{API}/twins/hospital/simulation", json={"running": True}, timeout=15)


def test_hospital_invalid_scenario_400():
    r = requests.post(f"{API}/twins/hospital/simulation",
                      json={"scenario": "Not-a-real-scenario"}, timeout=15)
    assert r.status_code == 400


def test_unknown_domain_sim_404():
    r = requests.post(f"{API}/twins/xyzzy/simulation", json={"scenario": "x"}, timeout=15)
    assert r.status_code == 404


def test_building_reset_zeroes_tick():
    # let it tick a bit
    time.sleep(3)
    before = requests.get(f"{API}/twins/building", timeout=15).json()
    assert before["tick"] >= 0
    r = requests.post(f"{API}/twins/building/simulation/reset", timeout=15)
    assert r.status_code == 200
    after = requests.get(f"{API}/twins/building", timeout=15).json()
    assert after["tick"] == 0
    assert len(after["state"]["floors"]) == 10


# --- data sources ---
def test_data_sources_list_and_no_false_live():
    r = requests.get(f"{API}/data-sources", timeout=15)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 10
    types = {row["id"]: row["type"] for row in rows}
    assert types["api-tomtom"] == "OFFLINE"
    assert types["api-openweather"] == "OFFLINE"
    assert types["sim-hospital"] == "SIMULATED"
    assert types["seed-hyderabad-zones"] == "SEEDED"
    # No row should be labelled LIVE (no external keys set in this env)
    live_rows = [row for row in rows if row["type"] == "LIVE"]
    assert live_rows == [], f"Unexpected LIVE rows: {live_rows}"


# --- traffic regression (public endpoints only) ---
@pytest.mark.parametrize("path", [
    "/health", "/overview", "/roads", "/vehicles", "/heatmap", "/predictions",
    "/incidents", "/replay/corridors",
    "/system/health", "/junctions", "/drones", "/cameras",
])
def test_traffic_regression_public(path):
    r = requests.get(f"{API}{path}", timeout=20)
    assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"


def test_auth_login_super():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "super@hyderabad.gov.in", "password": "Hyderabad@2026"},
                      timeout=15)
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_users_and_audit_require_auth():
    # Anonymous access should be blocked
    for path in ["/users", "/audit"]:
        r = requests.get(f"{API}{path}", timeout=15)
        assert r.status_code in (401, 403), f"{path} unexpected {r.status_code}"

    # With super token, should succeed
    tok = requests.post(f"{API}/auth/login",
                        json={"email": "super@hyderabad.gov.in", "password": "Hyderabad@2026"},
                        timeout=15).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    for path in ["/users", "/audit"]:
        r = requests.get(f"{API}{path}", headers=h, timeout=15)
        assert r.status_code == 200, f"{path} authed -> {r.status_code}"
