"""Hyderabad Traffic Digital Twin - simulation-first operations API."""
import asyncio
import logging
import math
import os
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("hyderabad-twin")

mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=500)
db = mongo_client[os.environ["DB_NAME"]]
app = FastAPI(title="Hyderabad Traffic Digital Twin", version="1.0.0", docs_url="/api/docs")
router = APIRouter(prefix="/api")

ZONE_NAMES = [
    "Gachibowli", "Financial District", "HITEC City", "Madhapur", "Jubilee Hills",
    "Banjara Hills", "Kukatpally", "Miyapur", "Secunderabad", "Uppal", "LB Nagar",
    "Shamshabad", "Airport Corridor", "ORR East", "ORR West", "Tank Bund",
]
ZONE_POINTS = [(-5, 1), (-4, 0), (-2, 2), (-1, 1), (0, 0), (1, -1), (-3, 0), (-4, 2),
               (2, 3), (3, 1), (3, -1), (0, -4), (-1, -4), (5, 1), (-6, 1), (1, 2)]

state: Dict[str, Any] = {
    "running": True, "tick": 0, "scenario": "Office hours", "weather": "Clear",
    "updated_at": datetime.now(timezone.utc).isoformat(), "history": [], "clients": set(),
}

def make_roads() -> List[Dict[str, Any]]:
    roads = []
    edges = [(0, 1, "ORR West", 4), (1, 2, "Nanakramguda Link", 3), (2, 3, "Raidurg Link", 4),
             (3, 4, "Madhapur Main", 3), (4, 5, "Banjara Hills Rd", 2), (5, 6, "Jubilee Hills Link", 3),
             (6, 7, "KPHB - Miyapur", 4), (4, 8, "Necklace Road", 3), (8, 9, "Uppal Main", 4),
             (9, 10, "LB Nagar Main", 3), (10, 11, "Airport Corridor", 5), (11, 12, "RGIA Express", 5),
             (12, 13, "ORR South", 5), (13, 14, "ORR East", 5), (8, 15, "Metro Blue Line", 2),
             (15, 4, "Metro Blue Line", 2), (4, 8, "NH65", 4), (0, 6, "Financial District Link", 3)]
    for index, (a, b, name, lanes) in enumerate(edges):
        roads.append({"id": f"road-{index+1}", "name": name, "from_zone": ZONE_NAMES[a], "to_zone": ZONE_NAMES[b],
                      "from": ZONE_POINTS[a], "to": ZONE_POINTS[b], "lanes": lanes,
                      "type": "metro" if "Metro" in name else ("flyover" if "ORR" in name else "arterial"),
                      "congestion": round(38 + (index * 9) % 51, 1), "speed": round(18 + (index * 7) % 35, 1)})
    return roads

ROADS = make_roads()
VEHICLE_TYPES = [("car", "Cars", "#00f3ff"), ("two-wheeler", "Two-wheelers", "#58a6ff"),
                 ("bus", "Buses", "#ffb703"), ("truck", "Trucks", "#ff6b6b"),
                 ("emergency", "Emergency", "#ff0055"), ("metro", "Metro", "#00ff66")]

def make_vehicles() -> List[Dict[str, Any]]:
    vehicles = []
    for index in range(112):
        kind, label, color = VEHICLE_TYPES[index % len(VEHICLE_TYPES)]
        road = ROADS[index % len(ROADS)]
        progress = (index * 0.071) % 1
        vehicles.append({"id": f"veh-{index+1:03d}", "type": kind, "label": label, "color": color,
                         "road_id": road["id"], "progress": progress, "speed": round(18 + (index * 3) % 38, 1),
                         "priority": kind == "emergency", "status": "moving"})
    return vehicles

VEHICLES = make_vehicles()
INCIDENTS = [
    {"id": "INC-2401", "type": "Accident", "severity": "critical", "location": "HITEC City Flyover",
     "status": "active", "age": "04 min", "impact": "2.1 km queue", "color": "#ff0055"},
    {"id": "INC-2398", "type": "Rain cell", "severity": "moderate", "location": "Airport Corridor",
     "status": "monitoring", "age": "11 min", "impact": "Visibility 68%", "color": "#ffb703"},
    {"id": "INC-2394", "type": "Road closure", "severity": "high", "location": "Tank Bund North",
     "status": "active", "age": "18 min", "impact": "Diversion active", "color": "#ff6b6b"},
]

HYDERABAD_COORDS = {"lat": 17.3850, "lon": 78.4867}

def live_enabled() -> bool:
    return os.environ.get("TWIN_LIVE_ENABLED", "false").lower() == "true"

def live_status() -> Dict[str, Any]:
    tomtom_ready = bool(os.environ.get("TOMTOM_API_KEY"))
    weather_ready = bool(os.environ.get("OPENWEATHER_API_KEY"))
    return {"enabled": live_enabled(), "feeds": {
        "traffic": {"provider": "TomTom", "configured": tomtom_ready, "live": live_enabled() and tomtom_ready, "fallback": not (live_enabled() and tomtom_ready)},
        "weather": {"provider": "OpenWeather", "configured": weather_ready, "live": live_enabled() and weather_ready, "fallback": not (live_enabled() and weather_ready)},
        "cctv": {"provider": "Authority VMS / ONVIF", "configured": False, "live": False, "fallback": True},
        "signals": {"provider": "Authority signal API", "configured": False, "live": False, "fallback": True},
        "dispatch": {"provider": "Authority CAD", "configured": False, "live": False, "fallback": True},
    }}

async def fetch_tomtom_flow() -> Optional[Dict[str, Any]]:
    key = os.environ.get("TOMTOM_API_KEY")
    if not live_enabled() or not key:
        return None
    url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
    params = {"point": f"{HYDERABAD_COORDS['lat']},{HYDERABAD_COORDS['lon']}", "unit": "KMPH", "key": key}
    try:
        async with httpx.AsyncClient(timeout=4.0) as http:
            response = await http.get(url, params=params, headers={"TomTom-Api-Key": key})
            response.raise_for_status()
            data = response.json().get("flowSegmentData", {})
            return {"current_speed": data.get("currentSpeed"), "free_flow_speed": data.get("freeFlowSpeed"), "confidence": data.get("confidence"), "provider": "TomTom", "live": True}
    except Exception as exc:
        logger.warning("TomTom adapter unavailable; retaining seeded traffic: %s", exc)
        return None

async def fetch_openweather() -> Optional[Dict[str, Any]]:
    key = os.environ.get("OPENWEATHER_API_KEY")
    if not live_enabled() or not key:
        return None
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": HYDERABAD_COORDS["lat"], "lon": HYDERABAD_COORDS["lon"], "appid": key, "units": "metric"}
    try:
        async with httpx.AsyncClient(timeout=4.0) as http:
            response = await http.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return {"condition": data.get("weather", [{}])[0].get("main", "Clear"), "temperature": round(data.get("main", {}).get("temp", 29)), "humidity": data.get("main", {}).get("humidity", 52), "visibility": round(data.get("visibility", 9600) / 100), "provider": "OpenWeather", "live": True}
    except Exception as exc:
        logger.warning("OpenWeather adapter unavailable; retaining seeded weather: %s", exc)
        return None

def metrics() -> Dict[str, Any]:
    tick = state["tick"]
    rain = state["weather"] == "Rainstorm"
    congestion = max(28, min(94, 61 + math.sin(tick / 9) * 7 + (8 if rain else 0)))
    avg_speed = max(17, round(42 - congestion * 0.27, 1))
    return {"active_vehicles": len(VEHICLES) + (tick % 7), "average_speed": avg_speed,
            "congestion_index": round(congestion, 1), "air_quality": 74 if rain else 62,
            "weather": state["weather"], "active_incidents": len([i for i in INCIDENTS if i["status"] != "resolved"]),
            "emergency_response": "GREEN CORRIDOR READY", "simulation_tick": tick,
            "updated_at": state["updated_at"]}

def snapshot() -> Dict[str, Any]:
    m = metrics()
    return {"metrics": m, "roads": ROADS, "vehicles": VEHICLES[:72], "incidents": INCIDENTS,
            "scenario": state["scenario"], "weather": state["weather"], "tick": state["tick"]}

class IncidentCreate(BaseModel):
    type: str = "Accident"
    location: str
    severity: str = "high"
    impact: str = "Response requested"

class SimulationCommand(BaseModel):
    running: Optional[bool] = None
    scenario: Optional[str] = None
    weather: Optional[str] = None

class AssistantRequest(BaseModel):
    message: str

class RouteRequest(BaseModel):
    origin: str
    destination: str
    vehicle_type: str = "Ambulance"

@router.get("/")
async def root():
    return {"name": "Hyderabad Traffic Digital Twin", "status": "operational", "version": "1.0.0"}

@router.get("/health")
async def health():
    return {"status": "ok", "service": "traffic-twin-api", "simulation": state["running"], "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/overview")
async def overview():
    return metrics()

@router.get("/live/status")
async def live_feed_status():
    return live_status()

@router.get("/zones")
async def zones():
    return [{"id": f"zone-{i+1}", "name": name, "position": ZONE_POINTS[i], "status": "monitored"} for i, name in enumerate(ZONE_NAMES)]

@router.get("/roads")
async def roads():
    return ROADS

@router.get("/vehicles")
async def vehicles():
    return VEHICLES

@router.get("/traffic")
async def traffic():
    live_flow = await fetch_tomtom_flow()
    result = snapshot()
    result["live_feed"] = live_flow or {"provider": "seeded simulation", "live": False, "fallback": True}
    return result

@router.get("/incidents")
async def incidents():
    return INCIDENTS

@router.post("/incidents")
async def create_incident(input_data: IncidentCreate):
    item = {"id": f"INC-{random.randint(2402, 2999)}", **input_data.model_dump(), "status": "active", "age": "now", "color": "#ff0055"}
    INCIDENTS.insert(0, item)
    return item

@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str):
    for item in INCIDENTS:
        if item["id"] == incident_id:
            item["status"] = "resolved"
            return item
    raise HTTPException(status_code=404, detail="Incident not found")

@router.get("/predictions")
async def predictions():
    current = metrics()["congestion_index"]
    return {"generated_at": datetime.now(timezone.utc).isoformat(), "horizons": [
        {"label": "15 min", "value": round(min(98, current + 4.5), 1), "confidence": 94, "trend": "up"},
        {"label": "30 min", "value": round(min(98, current + 8.2), 1), "confidence": 88, "trend": "up"},
        {"label": "60 min", "value": round(max(22, current - 3.4), 1), "confidence": 76, "trend": "down"},
    ], "recommendation": "Stage a green wave from Gachibowli to Secunderabad before 18:45.",
        "bottleneck": "HITEC City Flyover", "spread_probability": 68}

@router.get("/analytics/trend")
async def analytics_trend():
    return [{"time": f"{16 + (i // 2)}:{30 if i % 2 else '00'}", "congestion": round(48 + i * 2.1 + math.sin(i) * 4, 1), "speed": round(43 - i * 0.9 + math.cos(i) * 2, 1)} for i in range(12)]

@router.get("/weather")
async def weather():
    seeded = {"condition": state["weather"], "temperature": 29, "humidity": 68 if state["weather"] == "Rainstorm" else 52,
              "visibility": 68 if state["weather"] == "Rainstorm" else 96, "impact": "Moderate traffic drag" if state["weather"] == "Rainstorm" else "Nominal", "provider": "seeded simulation", "live": False}
    return await fetch_openweather() or seeded

@router.post("/simulation/control")
async def simulation_control(command: SimulationCommand):
    if command.running is not None:
        state["running"] = command.running
    if command.scenario:
        state["scenario"] = command.scenario
    if command.weather:
        state["weather"] = command.weather
    return {"running": state["running"], "scenario": state["scenario"], "weather": state["weather"]}

@router.get("/simulation/status")
async def simulation_status():
    return {"running": state["running"], "tick": state["tick"], "scenario": state["scenario"], "weather": state["weather"], "interval_seconds": 2}

@router.get("/replay")
async def replay():
    return state["history"][-30:]

@router.post("/emergency/routes")
async def emergency_route(input_data: RouteRequest):
    eta = 7 + (len(input_data.origin) + len(input_data.destination)) % 9
    return {"route_id": f"ROUTE-{uuid.uuid4().hex[:6].upper()}", "origin": input_data.origin,
            "destination": input_data.destination, "vehicle_type": input_data.vehicle_type, "eta_minutes": eta,
            "distance_km": round(4.2 + eta * 0.74, 1), "green_corridor": True,
            "signals_optimized": 12, "status": "DISPATCHED"}

async def persist_message(message: str, response: str):
    try:
        await db.assistant_messages.insert_one({"message": message, "response": response, "created_at": datetime.now(timezone.utc).isoformat()})
    except Exception as exc:
        logger.debug("Mongo persistence skipped: %s", exc)

@router.post("/assistant/stream")
async def assistant_stream(input_data: AssistantRequest):
    async def generator():
        response_text = ""
        key = os.environ.get("EMERGENT_LLM_KEY")
        if key:
            try:
                from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage
                chat = LlmChat(api_key=key, session_id=f"traffic-{uuid.uuid4().hex}",
                               system_message="You are AIRA, the calm Hyderabad traffic command center assistant. Use this live context: " + str(metrics()) + ". Give concise operational answers with route, time, and confidence when relevant.").with_model("openai", "gpt-5.4")
                stream = chat.stream_message(UserMessage(text=input_data.message))
                deadline = asyncio.get_running_loop().time() + 18
                while asyncio.get_running_loop().time() < deadline:
                    try:
                        event = await asyncio.wait_for(stream.__anext__(), timeout=4)
                    except StopAsyncIteration:
                        break
                    except asyncio.TimeoutError:
                        logger.warning("AIRA stream timed out before completion")
                        break
                    if isinstance(event, TextDelta):
                        response_text += event.content
                        yield event.content
                    elif isinstance(event, StreamDone):
                        break
                if hasattr(stream, "aclose"):
                    await stream.aclose()
            except Exception as exc:
                logger.warning("LLM stream unavailable: %s", exc)
        if not response_text:
            response_text = f"AIRA readout: {input_data.message.strip().capitalize()} — congestion is {metrics()['congestion_index']}% across the twin. The recommended action is to stage a green wave through HITEC City and monitor the Airport Corridor. Confidence 86%."
            yield response_text
        await persist_message(input_data.message, response_text)
    return StreamingResponse(generator(), media_type="text/plain", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.websocket("/api/ws/traffic")
async def traffic_socket(websocket: WebSocket):
    await websocket.accept()
    state["clients"].add(websocket)
    try:
        await websocket.send_json(snapshot())
        while True:
            await asyncio.sleep(10)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        state["clients"].discard(websocket)

app.include_router(router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])

async def simulation_loop():
    while True:
        await asyncio.sleep(2)
        if not state["running"]:
            continue
        state["tick"] += 1
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        for vehicle in VEHICLES:
            vehicle["progress"] = (vehicle["progress"] + (vehicle["speed"] / 2200)) % 1
            vehicle["speed"] = max(12, min(62, vehicle["speed"] + random.uniform(-2.5, 2.5)))
        state["history"].append({"tick": state["tick"], "time": state["updated_at"], "metrics": metrics()})
        state["history"] = state["history"][-60:]
        if state["clients"]:
            message = snapshot()
            stale = []
            for client in list(state["clients"]):
                try:
                    await client.send_json(message)
                except Exception:
                    stale.append(client)
            for client in stale:
                state["clients"].discard(client)

@app.on_event("startup")
async def startup():
    app.state.simulation_task = asyncio.create_task(simulation_loop())

@app.on_event("shutdown")
async def shutdown():
    app.state.simulation_task.cancel()
    mongo_client.close()