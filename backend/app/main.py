import asyncio
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="Hyderabad Traffic Digital Twin API",
    description="Real-time Smart City Traffic Command Center Backend for Hyderabad Metropolitan Region (GHMC & ORR)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ZONES = [
    {"id": "z1", "name": "Gachibowli", "congestion_index": 78.4, "avg_speed": 28.5, "aqi": 142, "status": "Heavy"},
    {"id": "z2", "name": "Hitech City", "congestion_index": 85.2, "avg_speed": 22.1, "aqi": 165, "status": "Severe"},
    {"id": "z3", "name": "Banjara Hills", "congestion_index": 64.1, "avg_speed": 34.0, "aqi": 110, "status": "Moderate"},
    {"id": "z4", "name": "Jubilee Hills", "congestion_index": 62.0, "avg_speed": 36.5, "aqi": 105, "status": "Moderate"},
    {"id": "z5", "name": "Madhapur", "congestion_index": 81.5, "avg_speed": 24.2, "aqi": 155, "status": "Heavy"},
    {"id": "z6", "name": "Financial District", "congestion_index": 52.3, "avg_speed": 45.0, "aqi": 95, "status": "Smooth"},
    {"id": "z7", "name": "Secunderabad", "congestion_index": 74.8, "avg_speed": 30.2, "aqi": 180, "status": "Heavy"},
    {"id": "z8", "name": "Kukatpally", "congestion_index": 88.9, "avg_speed": 19.4, "aqi": 172, "status": "Severe"},
    {"id": "z9", "name": "Miyapur", "congestion_index": 71.2, "avg_speed": 32.1, "aqi": 130, "status": "Moderate"},
    {"id": "z10", "name": "Uppal", "congestion_index": 76.5, "avg_speed": 29.0, "aqi": 150, "status": "Heavy"},
    {"id": "z11", "name": "LB Nagar", "congestion_index": 82.1, "avg_speed": 23.5, "aqi": 158, "status": "Heavy"},
    {"id": "z12", "name": "Shamshabad Airport Corridor", "congestion_index": 42.0, "avg_speed": 68.4, "aqi": 75, "status": "Smooth"},
    {"id": "z13", "name": "ORR (Outer Ring Road)", "congestion_index": 35.5, "avg_speed": 82.1, "aqi": 68, "status": "Smooth"},
    {"id": "z14", "name": "NH44 Corridor", "congestion_index": 68.2, "avg_speed": 42.0, "aqi": 140, "status": "Moderate"},
    {"id": "z15", "name": "NH65 Corridor", "congestion_index": 73.0, "avg_speed": 38.5, "aqi": 145, "status": "Heavy"}
]

ROADS = [
    {"id": "r1", "name": "ORR Expressway", "from": "Gachibowli", "to": "Shamshabad", "vehicles_count": 1420, "speed_limit": 100, "current_speed": 84, "status": "Clear"},
    {"id": "r2", "name": "Hitech City Main Road", "from": "Cyber Towers", "to": "Raheja Mindspace", "vehicles_count": 890, "speed_limit": 50, "current_speed": 21, "status": "Congested"},
    {"id": "r3", "name": "Jubilee Hills Road No. 36", "from": "Checkpost", "to": "Madhapur Arch", "vehicles_count": 760, "speed_limit": 60, "current_speed": 32, "status": "Moderate"},
    {"id": "r4", "name": "PV Narasimha Rao Expressway", "from": "Mehdipatnam", "to": "Airport", "vehicles_count": 1120, "speed_limit": 80, "current_speed": 65, "status": "Clear"},
    {"id": "r5", "name": "Kukatpally Main Road", "from": "KPHB", "to": "Moosapet", "vehicles_count": 1340, "speed_limit": 50, "current_speed": 18, "status": "Severe Congestion"}
]

INCIDENTS = [
    {"id": "inc-1", "type": "Accident", "location": "Hitech City Junction near Cyber Towers", "severity": "High", "time": "12 mins ago", "status": "Active", "lat": 17.4483, "lng": 78.3915},
    {"id": "inc-2", "type": "Roadwork", "location": "Gachibowli Flyover Lane 2", "severity": "Medium", "time": "45 mins ago", "status": "Active", "lat": 17.4401, "lng": 78.3489},
    {"id": "inc-3", "type": "Metro Disruption", "location": "Ameerpet Interchange Line 3", "severity": "High", "time": "5 mins ago", "status": "Resolving", "lat": 17.4375, "lng": 78.4482},
    {"id": "inc-4", "type": "VIP Convoy", "location": "Begumpet to Jubilee Hills", "severity": "Low", "time": "Just now", "status": "Active", "lat": 17.4448, "lng": 78.4659}
]

SIMULATION_STATE = {
    "active_mode": "normal",
    "weather": "Clear",
    "time_scale": 1.0,
    "active_vehicles": 184200,
    "avg_city_speed": 34.2,
    "overall_congestion": 72.5,
    "air_quality": 145,
    "emergency_active": 4
}

class SimulationControl(BaseModel):
    mode: str = Field(..., description="normal, festival, rainstorm, cricket, vip")
    weather: str = Field(..., description="Clear, Rain, Fog, Storm")
    time_scale: float = Field(1.0, description="Speed multiplier")

class IncidentCreate(BaseModel):
    type: str
    location: str
    severity: str
    lat: float
    lng: float

class NaturalLanguageQuery(BaseModel):
    query: str

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

async def traffic_simulation_loop():
    while True:
        await asyncio.sleep(2)
        delta = random.uniform(-1.5, 1.5)
        SIMULATION_STATE["overall_congestion"] = round(max(20.0, min(98.0, SIMULATION_STATE["overall_congestion"] + delta)), 1)
        SIMULATION_STATE["avg_city_speed"] = round(max(15.0, min(75.0, 50.0 - (SIMULATION_STATE["overall_congestion"] * 0.3))), 1)
        SIMULATION_STATE["active_vehicles"] = int(180000 + (SIMULATION_STATE["overall_congestion"] * 350) + random.randint(-500, 500))
        
        await manager.broadcast({
            "type": "SIMULATION_UPDATE",
            "timestamp": datetime.now().isoformat(),
            "state": SIMULATION_STATE,
            "zones_sample": random.sample(ZONES, 3)
        })

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(traffic_simulation_loop())

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "system": "Hyderabad Traffic Digital Twin", "version": "1.0.0", "timestamp": datetime.now().isoformat()}

@app.get("/api/zones")
def get_zones():
    return {"zones": ZONES}

@app.get("/api/roads")
def get_roads():
    return {"roads": ROADS}

@app.get("/api/incidents")
def get_incidents():
    return {"incidents": INCIDENTS}

@app.post("/api/incidents")
def create_incident(inc: IncidentCreate):
    new_inc = {
        "id": f"inc-{len(INCIDENTS)+1}",
        "type": inc.type,
        "location": inc.location,
        "severity": inc.severity,
        "time": "Just now",
        "status": "Active",
        "lat": inc.lat,
        "lng": inc.lng
    }
    INCIDENTS.insert(0, new_inc)
    return {"status": "success", "incident": new_inc}

@app.get("/api/simulation/state")
def get_simulation_state():
    return SIMULATION_STATE

@app.post("/api/simulation/control")
def control_simulation(ctrl: SimulationControl):
    SIMULATION_STATE["active_mode"] = ctrl.mode
    SIMULATION_STATE["weather"] = ctrl.weather
    SIMULATION_STATE["time_scale"] = ctrl.time_scale
    if ctrl.mode == "rainstorm" or ctrl.weather in ["Rain", "Storm"]:
        SIMULATION_STATE["overall_congestion"] = min(95.0, SIMULATION_STATE["overall_congestion"] + 15.0)
    elif ctrl.mode == "festival":
        SIMULATION_STATE["overall_congestion"] = min(92.0, SIMULATION_STATE["overall_congestion"] + 12.0)
    return {"status": "success", "state": SIMULATION_STATE}

@app.get("/api/predictions/congestion")
def get_predictions(horizon: int = Query(30, description="Minutes horizon: 15, 30, 60")):
    base_cong = SIMULATION_STATE["overall_congestion"]
    forecasts = []
    now = datetime.now()
    for i in range(1, 5):
        future_time = now + timedelta(minutes=i * (horizon // 4))
        variation = random.uniform(-4.0, 6.0)
        forecasts.append({
            "time": future_time.strftime("%H:%M"),
            "predicted_congestion": round(max(10.0, min(99.0, base_cong + variation)), 1),
            "confidence": round(random.uniform(88.0, 97.5), 1)
        })
    return {
        "horizon_minutes": horizon,
        "current_congestion": base_cong,
        "forecasts": forecasts,
        "ai_recommendations": [
            "Optimize green wave timing on Gachibowli-Hitech City corridor by +14%",
            "Reroute heavy commercial traffic via Outer Ring Road (ORR)",
            "Deploy emergency response unit to Cyber Towers junction"
        ]
    }

@app.post("/api/ai/query")
def ai_assistant_query(body: NaturalLanguageQuery):
    q = body.query.lower()
    response_text = ""
    if "hitech" in q or "cyber" in q:
        response_text = "Hitech City corridor currently shows heavy congestion (85% saturation) due to an active incident near Cyber Towers. Recommended action: Enable adaptive green wave on route 2."
    elif "airport" in q or "shamshabad" in q:
        response_text = "Shamshabad airport corridor is flowing smoothly at an average speed of 68 km/h. No bottlenecks or VIP convoys reported on PVNR Expressway."
    elif "rain" in q or "weather" in q:
        response_text = f"Current weather simulation is {SIMULATION_STATE['weather']}. Drainage sensors at Kukatpally and LB Nagar report normal water levels."
    else:
        response_text = f"Analyzed query regarding '{body.query}': Hyderabad metropolitan traffic network is operating at {SIMULATION_STATE['overall_congestion']}% congestion index with {SIMULATION_STATE['active_vehicles']} active vehicles monitored across 15 zones."
    
    return {
        "query": body.query,
        "response": response_text,
        "confidence": 94.2,
        "suggested_actions": ["Trigger Green Corridor", "Dispatch Traffic Police", "Broadcast Advisory"]
    }

@app.get("/api/replay/history")
def get_replay_history():
    history = []
    now = datetime.now()
    for i in range(60, 0, -1):
        t = now - timedelta(minutes=i)
        history.append({
            "minute_ago": i,
            "timestamp": t.strftime("%H:%M"),
            "congestion": round(70 + random.uniform(-10, 15), 1),
            "vehicles": int(175000 + random.randint(-3000, 4000))
        })
    return {"replay_timeline": history}

@app.websocket("/ws/traffic")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "received", "echo": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
