"""Iter-11 RBAC hardening backend tests.

Covers:
- Read guards on /api/twins/{domain} and /api/traffic
- Mutate guards on POST /api/twins/{d}/action and traffic actions
- History + simulation guards
- WebSocket auth + domain filtering
- AIRA cross-domain refusal
"""
import asyncio
import json
import os
import ssl
import pytest
import requests
import websockets

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url()
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/twins"
PW = "Twin@2026"

ALL_DOMAINS = ["traffic", "hospital", "energy", "water", "building", "industrial"]


def _login(email):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": PW}, timeout=15)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def tokens():
    return {
        "super":    _login("super@twin.platform"),
        "hospital": _login("hospital@twin.platform"),
        "energy":   _login("energy@twin.platform"),
        "traffic":  _login("traffic@twin.platform"),
        "viewer":   _login("viewer@twin.platform"),
    }


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ------------------- READ RBAC -------------------
def test_unauth_twin_read_401():
    r = requests.get(f"{BASE_URL}/api/twins/hospital", timeout=10)
    assert r.status_code == 401, r.text


def test_hospital_op_reads(tokens):
    r = requests.get(f"{BASE_URL}/api/twins/hospital", headers=_h(tokens["hospital"]), timeout=10)
    assert r.status_code == 200
    for d in ["energy", "water", "building", "industrial"]:
        rr = requests.get(f"{BASE_URL}/api/twins/{d}", headers=_h(tokens["hospital"]), timeout=10)
        assert rr.status_code == 403, f"hospital op should be 403 on {d}, got {rr.status_code}"
    rt = requests.get(f"{BASE_URL}/api/traffic", headers=_h(tokens["hospital"]), timeout=10)
    assert rt.status_code == 403


def test_energy_op_reads(tokens):
    assert requests.get(f"{BASE_URL}/api/twins/energy", headers=_h(tokens["energy"]), timeout=10).status_code == 200
    for d in ["hospital", "water", "building", "industrial"]:
        rr = requests.get(f"{BASE_URL}/api/twins/{d}", headers=_h(tokens["energy"]), timeout=10)
        assert rr.status_code == 403, f"energy op should be 403 on {d}"
    assert requests.get(f"{BASE_URL}/api/traffic", headers=_h(tokens["energy"]), timeout=10).status_code == 403


def test_traffic_op_reads(tokens):
    assert requests.get(f"{BASE_URL}/api/traffic", headers=_h(tokens["traffic"]), timeout=10).status_code == 200
    assert requests.get(f"{BASE_URL}/api/traffic/history", headers=_h(tokens["traffic"]), timeout=10).status_code == 200
    assert requests.get(f"{BASE_URL}/api/twins/hospital", headers=_h(tokens["traffic"]), timeout=10).status_code == 403


def test_viewer_reads(tokens):
    assert requests.get(f"{BASE_URL}/api/twins/hospital", headers=_h(tokens["viewer"]), timeout=10).status_code == 200
    assert requests.get(f"{BASE_URL}/api/traffic", headers=_h(tokens["viewer"]), timeout=10).status_code == 200
    assert requests.get(f"{BASE_URL}/api/twins/energy", headers=_h(tokens["viewer"]), timeout=10).status_code == 403


def test_super_reads_all(tokens):
    for d in ["hospital", "energy", "water", "building", "industrial"]:
        r = requests.get(f"{BASE_URL}/api/twins/{d}", headers=_h(tokens["super"]), timeout=10)
        assert r.status_code == 200, f"super on {d} -> {r.status_code}"
    assert requests.get(f"{BASE_URL}/api/traffic", headers=_h(tokens["super"]), timeout=10).status_code == 200


# ------------------- MUTATE RBAC -------------------
def test_hospital_op_cross_domain_action_forbidden(tokens):
    r = requests.post(f"{BASE_URL}/api/twins/water/action",
                      headers=_h(tokens["hospital"]),
                      json={"action": "valve.close", "params": {"valve_id": "vlv-01"}}, timeout=10)
    assert r.status_code == 403
    assert "water" in r.text.lower() or "domain" in r.text.lower() or "permit" in r.text.lower()


def test_viewer_action_forbidden_own_domain(tokens):
    r = requests.post(f"{BASE_URL}/api/twins/hospital/action",
                      headers=_h(tokens["viewer"]),
                      json={"action": "ward.offline", "params": {"ward_id": "ward-a"}}, timeout=10)
    assert r.status_code == 403
    assert "viewer" in r.text.lower()


def test_viewer_traffic_action_forbidden(tokens):
    r = requests.post(f"{BASE_URL}/api/traffic/action/road.close",
                      headers=_h(tokens["viewer"]),
                      json={"road_id": "rd-1"}, timeout=10)
    assert r.status_code == 403
    assert "viewer" in r.text.lower()


def test_super_energy_isolate(tokens):
    r = requests.post(f"{BASE_URL}/api/twins/energy/action",
                      headers=_h(tokens["super"]),
                      json={"action": "substation.isolate", "params": {"substation_id": "sub-2"}}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("result", {}).get("cascaded") is True or body.get("cascaded") is True or "isolated" in str(body).lower()


# ------------------- HISTORY + SIMULATION -------------------
def test_history_rbac(tokens):
    assert requests.get(f"{BASE_URL}/api/twins/energy/history", headers=_h(tokens["hospital"]), timeout=10).status_code == 403
    assert requests.get(f"{BASE_URL}/api/twins/hospital/history", headers=_h(tokens["hospital"]), timeout=10).status_code == 200


def test_sim_control_rbac(tokens):
    r_hosp = requests.post(f"{BASE_URL}/api/twins/water/simulation",
                           headers=_h(tokens["hospital"]),
                           json={"running": False}, timeout=10)
    assert r_hosp.status_code == 403
    r_sup = requests.post(f"{BASE_URL}/api/twins/water/simulation",
                          headers=_h(tokens["super"]),
                          json={"running": True}, timeout=10)
    assert r_sup.status_code == 200


# ------------------- AIRA -------------------
def test_aira_cross_domain_refused(tokens):
    r = requests.post(f"{BASE_URL}/api/assistant/stream",
                      headers=_h(tokens["traffic"]),
                      json={"message": "ICU status", "domain": "hospital"}, timeout=25)
    assert r.status_code == 200
    body = r.text.lower()
    assert "not authorised" in body or "not authorized" in body, f"expected refusal, got: {body[:200]}"


def test_aira_own_domain_ok(tokens):
    r = requests.post(f"{BASE_URL}/api/assistant/stream",
                      headers=_h(tokens["traffic"]),
                      json={"message": "signals status", "domain": "traffic"}, timeout=25)
    assert r.status_code == 200
    body = r.text.lower()
    assert "not authorised" not in body and "not authorized" not in body


# ------------------- WEBSOCKET -------------------
async def _collect_ws(token, seconds=2.5):
    uri = WS_URL + (f"?token={token}" if token else "")
    ssl_ctx = ssl.create_default_context() if uri.startswith("wss") else None
    try:
        async with websockets.connect(uri, ssl=ssl_ctx, open_timeout=10) as ws:
            frames = []
            try:
                deadline = asyncio.get_event_loop().time() + seconds
                while asyncio.get_event_loop().time() < deadline:
                    remaining = deadline - asyncio.get_event_loop().time()
                    if remaining <= 0:
                        break
                    msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
                    frames.append(json.loads(msg))
            except asyncio.TimeoutError:
                pass
            return {"ok": True, "frames": frames}
    except websockets.exceptions.InvalidStatusCode as e:
        return {"ok": False, "code": e.status_code}
    except websockets.exceptions.ConnectionClosedError as e:
        return {"ok": False, "code": e.code}
    except Exception as e:
        # newer websockets raises InvalidStatus with a Response; extract status_code if possible
        code = None
        r = getattr(e, "response", None)
        if r is not None:
            code = getattr(r, "status_code", None)
        return {"ok": False, "code": code, "error": repr(e)}


def _extract_domains(frames):
    ds = set()
    for f in frames:
        data = f.get("data") or {}
        d = data.get("domain")
        if d:
            ds.add(d)
    return ds


def test_ws_hospital_only_hospital(tokens):
    res = asyncio.get_event_loop().run_until_complete(_collect_ws(tokens["hospital"]))
    assert res["ok"], res
    ds = _extract_domains(res["frames"])
    assert "hospital" in ds, f"expected hospital snapshot, got {ds}"
    forbidden = {"energy", "water", "building", "industrial", "traffic"} & ds
    assert not forbidden, f"hospital op received forbidden domains: {forbidden}"


def test_ws_super_all_domains(tokens):
    res = asyncio.get_event_loop().run_until_complete(_collect_ws(tokens["super"], seconds=3.5))
    assert res["ok"], res
    ds = _extract_domains(res["frames"])
    # expect at least 5 of 6 domains (traffic snapshot has domain=traffic)
    expected = {"traffic", "hospital", "energy", "water", "building", "industrial"}
    missing = expected - ds
    assert len(missing) <= 1, f"super admin missing domains: {missing}, got: {ds}"


def test_ws_unauth_rejected():
    res = asyncio.get_event_loop().run_until_complete(_collect_ws(None, seconds=1.5))
    assert not res["ok"], f"expected rejection, got frames: {res}"
    assert res.get("code") in (4401, 1006, 403), f"expected 4401, got {res}"
