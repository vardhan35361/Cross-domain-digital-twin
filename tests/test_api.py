from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_overview_and_predictions():
    assert client.get("/api/overview").json()["active_vehicles"] > 0
    assert len(client.get("/api/predictions").json()["horizons"]) == 3

def test_incident_lifecycle():
    created = client.post("/api/incidents", json={"location":"Test Junction","type":"Signal failure"}).json()
    assert created["status"] == "active"
    resolved = client.post(f"/api/incidents/{created['id']}/resolve").json()
    assert resolved["status"] == "resolved"