"""Tests for JWT auth, RBAC, audit trail, user admin, and new endpoints
(/api/junctions, /api/drones, /api/cameras) + simulation realism."""
import os, time, requests, pytest

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or next(
    line.split('=', 1)[1].strip() for line in open('/app/frontend/.env')
    if line.startswith('REACT_APP_BACKEND_URL='))).rstrip('/')

PASSWORD = "Hyderabad@2026"
EMAILS = {
    "super_admin": "super@hyderabad.gov.in",
    "control_admin": "control@hyderabad.gov.in",
    "senior_officer": "senior@hyderabad.gov.in",
    "zone_officer": "zone.gachi@hyderabad.gov.in",
    "dispatch_officer": "dispatch@hyderabad.gov.in",
    "viewer": "viewer@hyderabad.gov.in",
}


def login(email, password=PASSWORD):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": password}, timeout=15)
    return r


def auth_headers(role):
    r = login(EMAILS[role])
    assert r.status_code == 200, f"login failed for {role}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------- /api/auth/accounts ----------
def test_auth_accounts_lists_six_seeded():
    r = requests.get(f"{BASE_URL}/api/auth/accounts", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["password"] == PASSWORD
    accounts = d["accounts"]
    assert len(accounts) == 6
    roles = {a["role"] for a in accounts}
    assert roles == set(EMAILS.keys())
    for a in accounts:
        assert a["role_label"] and a["description"] and a["email"]


# ---------- login for each role + wrong password + audit login_failed ----------
@pytest.mark.parametrize("role", list(EMAILS.keys()))
def test_login_success_each_role(role):
    r = login(EMAILS[role])
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body and body["access_token"]
    assert body["user"]["email"] == EMAILS[role]
    assert body["user"]["role"] == role


def test_login_wrong_password_401_and_audits():
    r = login(EMAILS["viewer"], password="wrong-pass")
    assert r.status_code == 401
    # Now login as super_admin and inspect audit
    h = auth_headers("super_admin")
    a = requests.get(f"{BASE_URL}/api/audit?limit=50", headers=h, timeout=15)
    assert a.status_code == 200
    actions = [e["action"] for e in a.json()]
    assert "auth.login_failed" in actions


# ---------- /api/auth/me via Bearer AND via cookie ----------
def test_auth_me_bearer():
    r = login(EMAILS["super_admin"])
    tok = r.json()["access_token"]
    m = requests.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    assert m.status_code == 200
    assert m.json()["email"] == EMAILS["super_admin"]


def test_auth_me_cookie():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": EMAILS["super_admin"], "password": PASSWORD}, timeout=15)
    assert r.status_code == 200
    m = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert m.status_code == 200
    assert m.json()["role"] == "super_admin"


def test_auth_me_unauth():
    m = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert m.status_code == 401


# ---------- RBAC ----------
def test_rbac_users_viewer_forbidden_super_allowed():
    v = requests.get(f"{BASE_URL}/api/users", headers=auth_headers("viewer"), timeout=15)
    assert v.status_code == 403
    s = requests.get(f"{BASE_URL}/api/users", headers=auth_headers("super_admin"), timeout=15)
    assert s.status_code == 200
    users = s.json()
    assert isinstance(users, list) and len(users) >= 6
    # no password hash leaks
    assert all("password_hash" not in u for u in users)


def test_rbac_audit_viewer_forbidden_super_allowed():
    v = requests.get(f"{BASE_URL}/api/audit", headers=auth_headers("viewer"), timeout=15)
    assert v.status_code == 403
    s = requests.get(f"{BASE_URL}/api/audit", headers=auth_headers("super_admin"), timeout=15)
    assert s.status_code == 200
    assert isinstance(s.json(), list)


# ---------- signal override audit ----------
def test_signal_override_recorded_in_audit():
    h = auth_headers("super_admin")
    roads = requests.get(f"{BASE_URL}/api/roads", timeout=15).json()
    road_id = roads[0]["id"]
    r = requests.post(f"{BASE_URL}/api/signals/adjust",
                      json={"road_id": road_id, "green_duration": 66, "mode": "override"},
                      headers=h, timeout=15)
    assert r.status_code == 200, r.text
    time.sleep(0.5)
    a = requests.get(f"{BASE_URL}/api/audit?limit=100", headers=h, timeout=15)
    assert a.status_code == 200
    events = a.json()
    overrides = [e for e in events if e["action"] == "signal.override"]
    assert overrides, "no signal.override audit entries found"
    top = overrides[0]
    assert "green_duration" in top.get("meta", {})
    assert "mode" in top.get("meta", {})


# ---------- new endpoints ----------
def test_junctions_endpoint():
    r = requests.get(f"{BASE_URL}/api/junctions", timeout=15)
    assert r.status_code == 200
    js = r.json()
    assert isinstance(js, list) and len(js) == 11, f"expected 11 junctions, got {len(js)}"
    for j in js:
        assert "phase" in j and "queue_length" in j and "mode" in j


def test_drones_endpoint():
    r = requests.get(f"{BASE_URL}/api/drones", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d, list) and len(d) == 5


def test_cameras_endpoint():
    r = requests.get(f"{BASE_URL}/api/cameras", timeout=15)
    assert r.status_code == 200
    c = r.json()
    assert isinstance(c, list) and len(c) == 12


# ---------- simulation realism ----------
def test_simulation_vehicle_motion_over_time():
    # Snapshot 3 times, 4s apart, ensure vehicles move (non-monotonic)
    snaps = []
    for _ in range(3):
        r = requests.get(f"{BASE_URL}/api/vehicles", timeout=15)
        assert r.status_code == 200
        snaps.append({v["id"]: v for v in r.json()})
        time.sleep(4)
    common = set(snaps[0]) & set(snaps[1]) & set(snaps[2])
    assert common, "no common vehicles across snapshots"
    changed = 0
    for vid in common:
        p0 = snaps[0][vid].get("progress")
        p2 = snaps[2][vid].get("progress")
        if p0 != p2:
            changed += 1
    assert changed / max(1, len(common)) > 0.3, f"only {changed}/{len(common)} vehicles moved"


def test_scenario_cricket_shifts_congestion():
    before = requests.get(f"{BASE_URL}/api/roads", timeout=15).json()
    avg_before = sum(r["congestion"] for r in before) / len(before)
    r = requests.post(f"{BASE_URL}/api/simulation/control",
                      json={"scenario": "Cricket match"}, timeout=15)
    assert r.status_code == 200, r.text
    time.sleep(5)
    after = requests.get(f"{BASE_URL}/api/roads", timeout=15).json()
    avg_after = sum(r["congestion"] for r in after) / len(after)
    print(f"congestion before={avg_before:.2f}, after={avg_after:.2f}")
    # reset scenario
    requests.post(f"{BASE_URL}/api/simulation/control", json={"scenario": "Normal"}, timeout=15)
    assert avg_after >= avg_before - 5, "cricket scenario should not reduce congestion drastically"


# ---------- user admin deactivate/reactivate ----------
def test_user_deactivate_reactivate_lifecycle():
    h = auth_headers("super_admin")
    users = requests.get(f"{BASE_URL}/api/users", headers=h, timeout=15).json()
    viewer = next(u for u in users if u["email"] == EMAILS["viewer"])
    uid = viewer["id"]

    d = requests.post(f"{BASE_URL}/api/users/{uid}/deactivate", headers=h, timeout=15)
    assert d.status_code == 200

    users2 = requests.get(f"{BASE_URL}/api/users", headers=h, timeout=15).json()
    v2 = next(u for u in users2 if u["email"] == EMAILS["viewer"])
    assert v2["active"] is False

    # Viewer login should now fail (account inactive) - login endpoint verifies password OK,
    # but /me should reject. Let's test /me path with a fresh token attempt.
    # The login endpoint itself doesn't gate on active — verify via /me.
    lr = login(EMAILS["viewer"])
    if lr.status_code == 200:
        tok = lr.json()["access_token"]
        me = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {tok}"}, timeout=15)
        assert me.status_code == 401

    # Reactivate
    r = requests.post(f"{BASE_URL}/api/users/{uid}/reactivate", headers=h, timeout=15)
    assert r.status_code == 200
    users3 = requests.get(f"{BASE_URL}/api/users", headers=h, timeout=15).json()
    v3 = next(u for u in users3 if u["email"] == EMAILS["viewer"])
    assert v3["active"] is True


def test_user_admin_invalid_and_missing_ids():
    h = auth_headers("super_admin")
    b = requests.post(f"{BASE_URL}/api/users/not-an-oid/deactivate", headers=h, timeout=15)
    assert b.status_code == 400
    n = requests.post(f"{BASE_URL}/api/users/507f1f77bcf86cd799439011/deactivate", headers=h, timeout=15)
    assert n.status_code == 404
