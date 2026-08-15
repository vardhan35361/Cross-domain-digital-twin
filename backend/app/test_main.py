import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Hyderabad" in data["system"]

def test_get_zones():
    response = client.get("/api/zones")
    assert response.status_code == 200
    data = response.json()
    assert "zones" in data
    assert len(data["zones"]) >= 15

def test_get_roads():
    response = client.get("/api/roads")
    assert response.status_code == 200
    data = response.json()
    assert "roads" in data

def test_get_incidents():
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert "incidents" in data

def test_simulation_control():
    response = client.post("/api/simulation/control", json={"mode": "festival", "weather": "Clear", "time_scale": 1.5})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["state"]["active_mode"] == "festival"

def test_ai_query():
    response = client.post("/api/ai/query", json={"query": "What is the status of Hitech City?"})
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "Hitech City" in data["response"]

def test_predictions():
    response = client.get("/api/predictions/congestion?horizon=30")
    assert response.status_code == 200
    data = response.json()
    assert "forecasts" in data
    assert len(data["forecasts"]) == 4
