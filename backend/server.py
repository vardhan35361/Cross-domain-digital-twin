"""Hyderabad Traffic Digital Twin - operations API (metropolitan scale)."""
import asyncio
import logging
import math
import os
import random
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from auth import ROLES, SEED_ACCOUNTS, build_router as build_auth_router, record_audit, seed_users

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("hyderabad-twin")

mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=500)
db = mongo_client[os.environ["DB_NAME"]]
app = FastAPI(title="Hyderabad Traffic Digital Twin", version="2.0.0", docs_url="/api/docs")
router = APIRouter(prefix="/api")

# ------------------------------------------------------------
# Metropolitan-scale zone graph (coords are 3D world units, ~1 unit = 400 m)
# ------------------------------------------------------------
ZONES: List[Dict[str, Any]] = [
    {"id": "z-gachi", "name": "Gachibowli", "pos": [-18, 0, 6], "category": "IT"},
    {"id": "z-findist", "name": "Financial District", "pos": [-22, 0, 2], "category": "IT"},
    {"id": "z-hitec", "name": "HITEC City", "pos": [-13, 0, 8], "category": "IT"},
    {"id": "z-madhapur", "name": "Madhapur", "pos": [-9, 0, 6], "category": "IT"},
    {"id": "z-jubilee", "name": "Jubilee Hills", "pos": [-4, 0, 4], "category": "commercial"},
    {"id": "z-banjara", "name": "Banjara Hills", "pos": [0, 0, 2], "category": "commercial"},
    {"id": "z-kphb", "name": "Kukatpally", "pos": [-10, 0, 16], "category": "residential"},
    {"id": "z-miyapur", "name": "Miyapur", "pos": [-20, 0, 18], "category": "residential"},
    {"id": "z-secun", "name": "Secunderabad", "pos": [6, 0, 10], "category": "transit"},
    {"id": "z-uppal", "name": "Uppal", "pos": [16, 0, 6], "category": "residential"},
    {"id": "z-lbnagar", "name": "LB Nagar", "pos": [12, 0, -6], "category": "residential"},
    {"id": "z-shams", "name": "Shamshabad", "pos": [-2, 0, -20], "category": "airport"},
    {"id": "z-airport", "name": "Airport Corridor", "pos": [-4, 0, -12], "category": "airport"},
    {"id": "z-tank", "name": "Tank Bund", "pos": [4, 0, 6], "category": "landmark"},
    {"id": "z-charminar", "name": "Charminar", "pos": [8, 0, 0], "category": "landmark"},
    {"id": "z-mehdi", "name": "Mehdipatnam", "pos": [-2, 0, -2], "category": "commercial"},
    {"id": "z-begum", "name": "Begumpet", "pos": [2, 0, 6], "category": "transit"},
    {"id": "z-ameerpet", "name": "Ameerpet", "pos": [-2, 0, 6], "category": "transit"},
    {"id": "z-kondapur", "name": "Kondapur", "pos": [-14, 0, 12], "category": "IT"},
    {"id": "z-nagole", "name": "Nagole", "pos": [18, 0, 0], "category": "transit"},
    {"id": "z-orr-e", "name": "ORR East Gate", "pos": [22, 0, 4], "category": "highway"},
    {"id": "z-orr-w", "name": "ORR West Gate", "pos": [-26, 0, 10], "category": "highway"},
    {"id": "z-nh44", "name": "NH44 Junction", "pos": [6, 0, 20], "category": "highway"},
    {"id": "z-nh65", "name": "NH65 Junction", "pos": [-24, 0, -4], "category": "highway"},
]
ZONE_BY_ID = {z["id"]: z for z in ZONES}
ZONE_BY_NAME = {z["name"]: z for z in ZONES}

# Road hierarchy: highway (6 lanes), arterial (4), local (2), metro viaduct
ROAD_EDGES = [
    ("z-orr-w", "z-miyapur", "ORR North-West", "highway", 6, True),
    ("z-miyapur", "z-kphb", "ORR North", "highway", 6, True),
    ("z-kphb", "z-secun", "ORR North-East", "highway", 6, True),
    ("z-secun", "z-orr-e", "ORR East", "highway", 6, True),
    ("z-orr-e", "z-nagole", "ORR East Ramp", "highway", 6, True),
    ("z-nagole", "z-lbnagar", "ORR South-East", "highway", 6, True),
    ("z-lbnagar", "z-shams", "ORR South", "highway", 6, True),
    ("z-shams", "z-airport", "Airport Expressway", "highway", 8, True),
    ("z-airport", "z-mehdi", "PVNR Expressway", "highway", 6, True),
    ("z-mehdi", "z-findist", "PVNR West", "highway", 6, True),
    ("z-findist", "z-orr-w", "ORR West Ramp", "highway", 6, True),
    ("z-nh44", "z-secun", "NH44 Approach", "highway", 6, False),
    ("z-nh65", "z-findist", "NH65 Approach", "highway", 6, False),
    ("z-gachi", "z-findist", "Nanakramguda Link", "arterial", 4, False),
    ("z-gachi", "z-hitec", "Gachibowli Main", "arterial", 4, False),
    ("z-hitec", "z-madhapur", "Cyberabad Road", "arterial", 4, True),
    ("z-madhapur", "z-jubilee", "Madhapur-Jubilee", "arterial", 4, False),
    ("z-jubilee", "z-banjara", "Road No.36", "arterial", 4, False),
    ("z-banjara", "z-tank", "Necklace Road", "arterial", 4, False),
    ("z-tank", "z-secun", "Tank Bund Rd", "arterial", 4, False),
    ("z-kphb", "z-ameerpet", "KPHB-Ameerpet", "arterial", 4, False),
    ("z-ameerpet", "z-begum", "SR Nagar", "arterial", 4, False),
    ("z-begum", "z-tank", "Begumpet Main", "arterial", 4, False),
    ("z-uppal", "z-nagole", "Uppal Link", "arterial", 4, False),
    ("z-uppal", "z-secun", "Uppal-Secun", "arterial", 4, False),
    ("z-lbnagar", "z-mehdi", "Inner Ring", "arterial", 4, False),
    ("z-kondapur", "z-gachi", "Kondapur Junction", "arterial", 4, False),
    ("z-kondapur", "z-hitec", "Kondapur Link", "arterial", 4, False),
    ("z-charminar", "z-mehdi", "Old City", "local", 2, False),
    ("z-charminar", "z-tank", "Purani Haveli", "local", 2, False),
    ("z-jubilee", "z-ameerpet", "Yousufguda", "local", 2, False),
    # metro corridors (viaducts)
    ("z-miyapur", "z-kphb", "Metro Red Line", "metro", 2, True),
    ("z-kphb", "z-ameerpet", "Metro Red Line", "metro", 2, True),
    ("z-ameerpet", "z-secun", "Metro Blue Line", "metro", 2, True),
    ("z-nagole", "z-uppal", "Metro Blue Line", "metro", 2, True),
    ("z-hitec", "z-madhapur", "Metro Green Line", "metro", 2, True),
    ("z-madhapur", "z-ameerpet", "Metro Green Line", "metro", 2, True),
]

def make_roads() -> List[Dict[str, Any]]:
    roads = []
    for idx, (a, b, name, rtype, lanes, elevated) in enumerate(ROAD_EDGES):
        za, zb = ZONE_BY_ID[a], ZONE_BY_ID[b]
        cong = round(28 + (idx * 13) % 63, 1)
        roads.append({
            "id": f"road-{idx+1:03d}", "name": name, "type": rtype,
            "from_id": a, "to_id": b,
            "from": [za["pos"][0], za["pos"][2]], "to": [zb["pos"][0], zb["pos"][2]],
            "from_name": za["name"], "to_name": zb["name"],
            "lanes": lanes, "elevated": elevated,
            "congestion": cong,
            "speed": round(max(15, 60 - cong * 0.5), 1),
            "length_km": round(math.hypot(zb["pos"][0]-za["pos"][0], zb["pos"][2]-za["pos"][2]) * 0.4, 2),
        })
    return roads

ROADS = make_roads()
ROAD_BY_ID = {r["id"]: r for r in ROADS}

VEHICLE_CATEGORIES = [
    ("sedan", "Sedan", "#00d9ff", 22, 0.36),
    ("suv", "SUV", "#4dd6ff", 12, 0.30),
    ("hatchback", "Hatchback", "#7bd9ff", 18, 0.24),
    ("bus", "Bus", "#ffb703", 6, 0.10),
    ("truck", "Truck", "#ff9a3c", 5, 0.09),
    ("two_wheeler", "Two-wheeler", "#58a6ff", 28, 0.30),
    ("ambulance", "Ambulance", "#ff2050", 1, 0.01),
    ("police", "Police", "#3d5aff", 1, 0.005),
    ("fire", "Fire engine", "#ff5f10", 1, 0.005),
    ("metro", "Metro", "#00ff88", 4, 0.02),
]

def make_vehicles(total: int = 240) -> List[Dict[str, Any]]:
    vehicles = []
    weights = [w for *_ , w in VEHICLE_CATEGORIES if w > 0.005]
    pool = []
    for kind, label, color, count, _ in VEHICLE_CATEGORIES:
        pool.extend([(kind, label, color)] * count)
    for i in range(total):
        kind, label, color = pool[i % len(pool)]
        candidates = [r for r in ROADS if (kind == "metro") == (r["type"] == "metro")]
        if not candidates:
            candidates = ROADS
        road = candidates[i % len(candidates)]
        lane = i % max(1, road["lanes"] // 2)
        direction = 1 if i % 2 == 0 else -1
        base_speed = {"metro": 55, "bus": 32, "truck": 34, "ambulance": 58, "police": 62,
                      "fire": 48, "two_wheeler": 44, "sedan": 46, "suv": 40, "hatchback": 42}[kind]
        vehicles.append({
            "id": f"veh-{i+1:04d}", "type": kind, "label": label, "color": color,
            "road_id": road["id"], "lane": lane, "direction": direction,
            "progress": (i * 0.0173) % 1,
            "speed": round(base_speed + random.uniform(-4, 4), 1),
            "target_speed": base_speed, "priority": kind in {"ambulance", "police", "fire"},
            "status": "moving",
        })
    return vehicles

VEHICLES = make_vehicles()

INCIDENTS = [
    {"id": "INC-2401", "type": "Accident", "severity": "critical", "location": "HITEC City Flyover",
     "status": "active", "age": "04 min", "impact": "2.1 km queue", "color": "#ff0055",
     "assigned": "Traffic Unit 12", "eta": "07 min"},
    {"id": "INC-2398", "type": "Rain cell", "severity": "moderate", "location": "Airport Corridor",
     "status": "monitoring", "age": "11 min", "impact": "Visibility 68%", "color": "#ffb703",
     "assigned": "Weather Ops", "eta": "—"},
    {"id": "INC-2394", "type": "Road closure", "severity": "high", "location": "Tank Bund North",
     "status": "active", "age": "18 min", "impact": "Diversion active", "color": "#ff6b6b",
     "assigned": "Patrol 07", "eta": "22 min"},
]

state: Dict[str, Any] = {
    "running": True, "tick": 0, "scenario": "Office hours", "weather": "Clear",
    "time_of_day": "evening",
    "updated_at": datetime.now(timezone.utc).isoformat(),
    "history": [], "corridors": [], "clients": set(),
    "layers": {"traffic": True, "heatmap": True, "incidents": True, "weather": True,
               "corridors": True, "metro": True, "drone": False, "buildings": True,
               "cctv": False, "junctions": True},
    "convoy": None,
    "signal_overrides": {},
    "started_at": time.time(),
}

HYDERABAD_COORDS = {"lat": 17.3850, "lon": 78.4867}

def live_enabled() -> bool:
    return bool(os.environ.get("TOMTOM_API_KEY")) or bool(os.environ.get("OPENWEATHER_API_KEY"))

def live_status() -> Dict[str, Any]:
    tt = bool(os.environ.get("TOMTOM_API_KEY"))
    ow = bool(os.environ.get("OPENWEATHER_API_KEY"))
    now = datetime.now(timezone.utc).isoformat()
    return {"enabled": live_enabled(), "last_update": now, "feeds": {
        "traffic": {"provider": "TomTom", "configured": tt, "live": tt, "fallback": not tt, "health": "nominal" if tt else "seeded", "last_update": now},
        "weather": {"provider": "OpenWeather", "configured": ow, "live": ow, "fallback": not ow, "health": "nominal" if ow else "seeded", "last_update": now},
        "cctv": {"provider": "Authority VMS / ONVIF", "configured": False, "live": False, "fallback": True, "health": "seeded", "last_update": now},
        "signals": {"provider": "Authority signal API", "configured": False, "live": False, "fallback": True, "health": "seeded", "last_update": now},
        "dispatch": {"provider": "Authority CAD", "configured": False, "live": False, "fallback": True, "health": "seeded", "last_update": now},
    }}

async def fetch_tomtom_flow() -> Optional[Dict[str, Any]]:
    key = os.environ.get("TOMTOM_API_KEY")
    if not key:
        return None
    url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
    params = {"point": f"{HYDERABAD_COORDS['lat']},{HYDERABAD_COORDS['lon']}", "unit": "KMPH", "key": key}
    try:
        async with httpx.AsyncClient(timeout=4.0) as http:
            response = await http.get(url, params=params)
            response.raise_for_status()
            data = response.json().get("flowSegmentData", {})
            return {"current_speed": data.get("currentSpeed"), "free_flow_speed": data.get("freeFlowSpeed"),
                    "confidence": data.get("confidence"), "provider": "TomTom", "live": True}
    except Exception as exc:
        logger.warning("TomTom adapter unavailable; retaining seeded: %s", exc)
        return None

async def fetch_openweather() -> Optional[Dict[str, Any]]:
    key = os.environ.get("OPENWEATHER_API_KEY")
    if not key:
        return None
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": HYDERABAD_COORDS["lat"], "lon": HYDERABAD_COORDS["lon"], "appid": key, "units": "metric"}
    try:
        async with httpx.AsyncClient(timeout=4.0) as http:
            response = await http.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return {"condition": data.get("weather", [{}])[0].get("main", "Clear"),
                    "temperature": round(data.get("main", {}).get("temp", 29)),
                    "humidity": data.get("main", {}).get("humidity", 52),
                    "visibility": round(data.get("visibility", 9600) / 100),
                    "provider": "OpenWeather", "live": True}
    except Exception as exc:
        logger.warning("OpenWeather adapter unavailable; retaining seeded: %s", exc)
        return None

def metrics() -> Dict[str, Any]:
    tick = state["tick"]
    rain = state["weather"] == "Rainstorm"
    congestion = max(28, min(94, 58 + math.sin(tick / 9) * 8 + (10 if rain else 0)))
    avg_speed = max(16, round(46 - congestion * 0.3, 1))
    return {"active_vehicles": len(VEHICLES) + (tick % 9),
            "average_speed": avg_speed, "congestion_index": round(congestion, 1),
            "air_quality": 78 if rain else 66, "weather": state["weather"],
            "active_incidents": len([i for i in INCIDENTS if i["status"] != "resolved"]),
            "emergency_response": "GREEN CORRIDOR READY", "simulation_tick": tick,
            "metro_status": "ALL LINES OPERATIONAL", "updated_at": state["updated_at"]}

def heatmap_snapshot() -> List[Dict[str, Any]]:
    out = []
    for road in ROADS:
        c = road["congestion"]
        band = "green" if c < 40 else "yellow" if c < 60 else "orange" if c < 78 else "red"
        pulse = c > 88
        out.append({"road_id": road["id"], "saturation": c, "band": band, "pulse": pulse,
                    "lanes": road["lanes"], "type": road["type"]})
    return out

def snapshot() -> Dict[str, Any]:
    return {"metrics": metrics(), "roads": ROADS, "vehicles": VEHICLES,
            "incidents": INCIDENTS, "scenario": state["scenario"], "weather": state["weather"],
            "time_of_day": state["time_of_day"], "tick": state["tick"], "layers": state["layers"],
            "heatmap": heatmap_snapshot(), "convoy": state["convoy"],
            "junctions": junctions_snapshot()}

# --- Pydantic models ---
class IncidentCreate(BaseModel):
    type: str = "Accident"
    location: str
    severity: str = "high"
    impact: str = "Response requested"

class SimulationCommand(BaseModel):
    running: Optional[bool] = None
    scenario: Optional[str] = None
    weather: Optional[str] = None
    time_of_day: Optional[str] = None

class AssistantRequest(BaseModel):
    message: str

class RouteRequest(BaseModel):
    origin: str
    destination: str
    vehicle_type: str = "Ambulance"

class ConvoyRequest(BaseModel):
    waypoints: List[str] = Field(default_factory=list)
    vehicle_type: str = "VIP convoy"
    dignitary: str = "Chief Minister"
    priority: str = "highest"

class LayerToggle(BaseModel):
    layer: str
    enabled: bool

class SignalCommand(BaseModel):
    road_id: str
    green_duration: int = 60
    mode: str = "adaptive"  # adaptive | manual | override

# --- Routes ---
@router.get("/")
async def root():
    return {"name": "Hyderabad Traffic Digital Twin", "status": "operational", "version": "2.0.0"}

@router.get("/health")
async def health():
    return {"status": "ok", "service": "traffic-twin-api", "simulation": state["running"],
            "uptime_seconds": round(time.time() - state["started_at"], 1),
            "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/overview")
async def overview():
    return metrics()

@router.get("/live/status")
async def live_feed_status():
    return live_status()

@router.get("/zones")
async def zones():
    return ZONES

@router.get("/roads")
async def roads():
    return ROADS

@router.get("/vehicles")
async def vehicles():
    return VEHICLES

@router.get("/heatmap")
async def heatmap():
    return {"generated_at": datetime.now(timezone.utc).isoformat(), "segments": heatmap_snapshot()}

@router.get("/layers")
async def layers_get():
    return state["layers"]

@router.post("/layers")
async def layers_set(cmd: LayerToggle):
    if cmd.layer not in state["layers"]:
        raise HTTPException(status_code=404, detail="Unknown layer")
    state["layers"][cmd.layer] = cmd.enabled
    return state["layers"]

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
    item = {"id": f"INC-{random.randint(2402, 2999)}", **input_data.model_dump(),
            "status": "active", "age": "now", "color": "#ff0055",
            "assigned": "Traffic Unit " + str(random.randint(1, 24)), "eta": f"{random.randint(4, 22)} min"}
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
        "bottleneck": "HITEC City Flyover", "spread_probability": 68,
        "travel_time": {"HITEC → Airport": "38 min", "Miyapur → Secunderabad": "26 min", "Uppal → Financial District": "42 min"},
        "signal_recommendations": [
            {"corridor": "Ameerpet ↔ Begumpet", "action": "Extend green +12s", "expected_gain": "-14% queue"},
            {"corridor": "Uppal Ring", "action": "Adaptive coordination", "expected_gain": "-9% queue"},
        ]}

@router.get("/analytics/trend")
async def analytics_trend():
    return [{"time": f"{16 + (i // 2)}:{30 if i % 2 else '00'}",
             "congestion": round(48 + i * 2.1 + math.sin(i) * 4, 1),
             "speed": round(43 - i * 0.9 + math.cos(i) * 2, 1),
             "incidents": max(0, round(3 + math.sin(i / 2) * 2))} for i in range(12)]

@router.get("/analytics/zones")
async def analytics_zones():
    out = []
    for i, z in enumerate(ZONES[:16]):
        base = 45 + (i * 7) % 40
        out.append({"zone": z["name"], "congestion": base, "speed": round(56 - base * 0.4, 1),
                    "vehicles": 60 + (i * 11) % 180, "category": z["category"]})
    return out

@router.get("/analytics/peak-hours")
async def analytics_peak():
    return [{"hour": f"{h:02d}:00", "index": round(28 + 45 * math.exp(-((h-9)**2)/8) + 55 * math.exp(-((h-18)**2)/6), 1)} for h in range(6, 23)]

@router.get("/weather")
async def weather():
    seeded = {"condition": state["weather"], "temperature": 29,
              "humidity": 68 if state["weather"] == "Rainstorm" else 52,
              "visibility": 68 if state["weather"] == "Rainstorm" else 96,
              "impact": "Moderate traffic drag" if state["weather"] == "Rainstorm" else "Nominal",
              "provider": "seeded simulation", "live": False}
    return await fetch_openweather() or seeded

@router.post("/simulation/control")
async def simulation_control(command: SimulationCommand):
    if command.running is not None:
        state["running"] = command.running
    if command.scenario:
        state["scenario"] = command.scenario
    if command.weather:
        state["weather"] = command.weather
    if command.time_of_day:
        state["time_of_day"] = command.time_of_day
    return {"running": state["running"], "scenario": state["scenario"],
            "weather": state["weather"], "time_of_day": state["time_of_day"]}

@router.get("/simulation/status")
async def simulation_status():
    return {"running": state["running"], "tick": state["tick"], "scenario": state["scenario"],
            "weather": state["weather"], "time_of_day": state["time_of_day"], "interval_seconds": 2}

@router.get("/replay")
async def replay():
    return state["history"][-30:]

@router.get("/replay/corridors")
async def replay_corridors():
    return [{"route_id": c["route_id"], "recorded_at": c["recorded_at"], "vehicle_type": c["vehicle_type"],
             "origin": c["origin"], "destination": c["destination"], "eta_minutes": c["eta_minutes"],
             "frames": len(c["frames"])} for c in state["corridors"][-30:][::-1]]

@router.get("/replay/corridors/{route_id}")
async def replay_corridor(route_id: str):
    for c in state["corridors"]:
        if c["route_id"] == route_id:
            return c
    raise HTTPException(status_code=404, detail="Corridor not found")

@router.post("/emergency/routes")
async def emergency_route(input_data: RouteRequest):
    eta = 7 + (len(input_data.origin) + len(input_data.destination)) % 9
    route_id = f"ROUTE-{uuid.uuid4().hex[:6].upper()}"
    # Approximate waypoints from zone names if present
    o = ZONE_BY_NAME.get(input_data.origin) or {"pos": [0, 0, 0]}
    d = ZONE_BY_NAME.get(input_data.destination) or {"pos": [4, 0, 4]}
    waypoints = [o["pos"], [(o["pos"][0]+d["pos"][0])/2, 0, (o["pos"][2]+d["pos"][2])/2], d["pos"]]
    corridor = {"route_id": route_id, "recorded_at": datetime.now(timezone.utc).isoformat(),
                "origin": input_data.origin, "destination": input_data.destination,
                "vehicle_type": input_data.vehicle_type, "eta_minutes": eta,
                "distance_km": round(4.2 + eta * 0.74, 1), "green_corridor": True,
                "signals_optimized": 12, "status": "DISPATCHED", "waypoints": waypoints,
                "frames": [{"tick": state["tick"] + k, "progress": k / 12} for k in range(13)]}
    state["corridors"].append(corridor)
    if len(state["corridors"]) > 30:
        state["corridors"] = state["corridors"][-30:]
    return corridor

@router.post("/convoy/start")
async def convoy_start(input_data: ConvoyRequest):
    if not input_data.waypoints:
        input_data.waypoints = ["Financial District", "HITEC City", "Jubilee Hills", "Secunderabad"]
    pts = [ZONE_BY_NAME[w]["pos"] for w in input_data.waypoints if w in ZONE_BY_NAME]
    if not pts:
        raise HTTPException(status_code=400, detail="Invalid waypoints")
    state["convoy"] = {"id": f"VIP-{uuid.uuid4().hex[:5].upper()}", "status": "active",
                       "dignitary": input_data.dignitary, "vehicle_type": input_data.vehicle_type,
                       "priority": input_data.priority, "waypoints": input_data.waypoints,
                       "waypoint_positions": pts, "progress": 0.0, "eta_minutes": 18,
                       "signals_held": 22, "started_at": datetime.now(timezone.utc).isoformat()}
    return state["convoy"]

@router.post("/convoy/pause")
async def convoy_pause():
    if not state["convoy"]:
        raise HTTPException(status_code=404, detail="No active convoy")
    state["convoy"]["status"] = "paused"
    return state["convoy"]

@router.post("/convoy/resume")
async def convoy_resume():
    if not state["convoy"]:
        raise HTTPException(status_code=404, detail="No active convoy")
    state["convoy"]["status"] = "active"
    return state["convoy"]

@router.post("/convoy/cancel")
async def convoy_cancel():
    if not state["convoy"]:
        raise HTTPException(status_code=404, detail="No active convoy")
    prev = state["convoy"]
    state["convoy"] = None
    return {"cancelled": prev, "signals_restored": True}

@router.get("/convoy/status")
async def convoy_status():
    return state["convoy"] or {"status": "idle"}

@router.post("/signals/adjust")
async def signal_adjust(cmd: SignalCommand, request: Request):
    road = ROAD_BY_ID.get(cmd.road_id)
    if not road:
        raise HTTPException(status_code=404, detail="Road not found")
    state["signal_overrides"][cmd.road_id] = {"green_duration": cmd.green_duration, "mode": cmd.mode,
                                              "applied_at": datetime.now(timezone.utc).isoformat()}
    await record_audit(db, None, "signal.override", cmd.road_id,
                       meta={"green_duration": cmd.green_duration, "mode": cmd.mode},
                       ip=request.client.host if request.client else "-")
    return {"road_id": cmd.road_id, "green_duration": cmd.green_duration, "mode": cmd.mode,
            "applied": True, "estimated_gain": f"-{max(4, cmd.green_duration // 6)}% queue"}

@router.get("/system/health")
async def system_health():
    return {"backend": {"status": "ok", "uptime_seconds": round(time.time() - state["started_at"], 1)},
            "websocket": {"clients": len(state["clients"]), "status": "streaming"},
            "database": {"status": "connected", "type": "MongoDB"},
            "simulation": {"tick": state["tick"], "running": state["running"], "fps_target": 30},
            "api_latency_ms": {"p50": 14, "p95": 42, "p99": 78},
            "cpu_percent": round(24 + math.sin(state["tick"] / 4) * 8, 1),
            "memory_mb": 348, "event_rate_per_sec": 12.4}

# ------------ Junctions + realistic signal state ------------
JUNCTION_IDS = ["z-madhapur", "z-jubilee", "z-banjara", "z-ameerpet", "z-begum",
                "z-tank", "z-secun", "z-uppal", "z-lbnagar", "z-mehdi", "z-kondapur"]

def junctions_snapshot() -> List[Dict[str, Any]]:
    tick = state["tick"]
    out = []
    for i, zid in enumerate(JUNCTION_IDS):
        zone = ZONE_BY_ID[zid]
        phase_pos = ((tick + i * 3) // 5) % 4
        phases = ["north-south green", "east-west green", "all-red clearance", "left-turn priority"]
        remaining = 5 - (tick + i * 3) % 5
        queue = round(6 + math.sin(tick / 3 + i) * 4 + (4 if state["weather"] == "Rainstorm" else 0))
        out.append({
            "id": f"jct-{zid}", "zone": zone["name"], "position": zone["pos"],
            "phase": phases[phase_pos], "phase_index": int(phase_pos),
            "remaining_seconds": remaining * 5, "queue_length": max(0, queue),
            "cycle_seconds": 100, "mode": "adaptive",
            "override_active": state["signal_overrides"].get(f"jct-{zid}") is not None,
        })
    return out

@router.get("/junctions")
async def junctions():
    return junctions_snapshot()

# ------------ Drone + CCTV surveillance ------------
DRONE_FEEDS = [
    {"id": "drone-hitec", "callsign": "SKY-01", "zone": "HITEC City", "altitude_m": 90, "battery": 78, "status": "streaming", "resolution": "1080p", "target": "corridor"},
    {"id": "drone-fin", "callsign": "SKY-02", "zone": "Financial District", "altitude_m": 110, "battery": 62, "status": "streaming", "resolution": "1080p", "target": "junction"},
    {"id": "drone-air", "callsign": "SKY-03", "zone": "Airport Corridor", "altitude_m": 140, "battery": 84, "status": "streaming", "resolution": "1080p", "target": "convoy"},
    {"id": "drone-orr", "callsign": "SKY-04", "zone": "ORR East Gate", "altitude_m": 95, "battery": 55, "status": "streaming", "resolution": "1080p", "target": "traffic"},
    {"id": "drone-gachi", "callsign": "SKY-05", "zone": "Gachibowli", "altitude_m": 70, "battery": 91, "status": "streaming", "resolution": "1080p", "target": "emergency"},
]

@router.get("/drones")
async def drones():
    return DRONE_FEEDS

CCTV_CAMERAS = [
    {"id": "cam-hitec-01", "location": "HITEC Junction", "zone": "HITEC City", "type": "intersection", "status": "online", "recording": True, "resolution": "4K"},
    {"id": "cam-hitec-02", "location": "Raidurg Metro", "zone": "HITEC City", "type": "metro", "status": "online", "recording": True, "resolution": "1080p"},
    {"id": "cam-fin-01", "location": "Nanakramguda Flyover", "zone": "Financial District", "type": "flyover", "status": "online", "recording": True, "resolution": "4K"},
    {"id": "cam-jubilee-01", "location": "Road No.36", "zone": "Jubilee Hills", "type": "intersection", "status": "online", "recording": True, "resolution": "1080p"},
    {"id": "cam-airport-01", "location": "PVNR Expressway Km 6", "zone": "Airport Corridor", "type": "highway", "status": "online", "recording": True, "resolution": "4K"},
    {"id": "cam-airport-02", "location": "Shamshabad Gate", "zone": "Shamshabad", "type": "toll", "status": "online", "recording": True, "resolution": "1080p"},
    {"id": "cam-orr-01", "location": "ORR East Ramp", "zone": "ORR East Gate", "type": "highway", "status": "online", "recording": True, "resolution": "4K"},
    {"id": "cam-orr-02", "location": "ORR West Ramp", "zone": "ORR West Gate", "type": "highway", "status": "degraded", "recording": True, "resolution": "720p"},
    {"id": "cam-secun-01", "location": "Tank Bund Rd", "zone": "Secunderabad", "type": "arterial", "status": "online", "recording": True, "resolution": "1080p"},
    {"id": "cam-lb-01", "location": "LB Nagar Junction", "zone": "LB Nagar", "type": "intersection", "status": "online", "recording": True, "resolution": "1080p"},
    {"id": "cam-uppal-01", "location": "Uppal X-Roads", "zone": "Uppal", "type": "intersection", "status": "online", "recording": True, "resolution": "4K"},
    {"id": "cam-charm-01", "location": "Charminar Circle", "zone": "Charminar", "type": "heritage", "status": "online", "recording": True, "resolution": "1080p"},
]

@router.get("/cameras")
async def cameras():
    return CCTV_CAMERAS

async def persist_message(message: str, response: str):
    try:
        await db.assistant_messages.insert_one({"message": message, "response": response,
                                                "created_at": datetime.now(timezone.utc).isoformat()})
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
                               system_message="You are AIRA, the calm Hyderabad traffic command center assistant. Use this live context: "
                               + str(metrics()) + ". Give concise operational answers with route, time, and confidence when relevant.")
                chat = chat.with_model("openai", "gpt-5.4")
                stream = chat.stream_message(UserMessage(text=input_data.message))
                deadline = asyncio.get_running_loop().time() + 18
                while asyncio.get_running_loop().time() < deadline:
                    try:
                        event = await asyncio.wait_for(stream.__anext__(), timeout=4)
                    except StopAsyncIteration:
                        break
                    except asyncio.TimeoutError:
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
            response_text = (f"AIRA readout: {input_data.message.strip().capitalize()} — congestion is "
                             f"{metrics()['congestion_index']}% across the twin. Stage a green wave through HITEC City "
                             "and monitor the Airport Corridor. Confidence 86%.")
            yield response_text
        await persist_message(input_data.message, response_text)
    return StreamingResponse(generator(), media_type="text/plain",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.websocket("/api/ws/traffic")
async def traffic_socket(websocket: WebSocket):
    await websocket.accept()
    state["clients"].add(websocket)
    try:
        await websocket.send_json({"kind": "snapshot", "data": snapshot()})
        while True:
            await asyncio.sleep(30)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        state["clients"].discard(websocket)

app.include_router(router)
auth_router_bundle = build_auth_router(db, lambda: state)
auth_router, _current_user_dep, _require_perm_dep, _record_audit = auth_router_bundle
app.include_router(auth_router)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])

async def broadcast(kind: str, data: Any):
    if not state["clients"]:
        return
    payload = {"kind": kind, "data": data}
    for client in list(state["clients"]):
        try:
            await client.send_json(payload)
        except Exception:
            state["clients"].discard(client)

async def simulation_loop():
    while True:
        await asyncio.sleep(2)
        if not state["running"]:
            continue
        state["tick"] += 1
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        # Lane-based advancement with signal-queue behaviour, dispersion, emergency priority
        junction_positions = [ZONE_BY_ID[z]["pos"] for z in JUNCTION_IDS]
        for vehicle in VEHICLES:
            road = ROAD_BY_ID.get(vehicle["road_id"])
            if not road:
                continue
            # base speed target with congestion drag
            drag = road["congestion"] / 120.0
            target = max(10, vehicle["target_speed"] * (1 - drag * 0.9))
            # emergency vehicles maintain priority speed regardless of drag
            if vehicle["priority"]:
                target = vehicle["target_speed"] * 1.05
            # signal queue effect: when vehicle approaches an end of segment (progress near 0 or 1)
            # and any nearby junction has a "red" phase, decelerate + build queue
            edge = min(vehicle["progress"], 1 - vehicle["progress"])
            near_junction = edge < 0.14
            if near_junction and not vehicle["priority"]:
                # sample the junction phase for this tick
                phase_idx = ((state["tick"] + hash(vehicle["road_id"]) % 5) // 5) % 4
                if phase_idx in (1, 2):  # red-ish for this direction
                    target *= 0.3  # sharp deceleration -> queue
            # smooth deceleration/acceleration (0.85 old, 0.15 new)
            vehicle["speed"] = round(vehicle["speed"] * 0.85 + target * 0.15 + random.uniform(-0.7, 0.7), 1)
            vehicle["speed"] = max(4, min(75, vehicle["speed"]))
            # advance progress
            step = vehicle["speed"] / (60 * max(road["length_km"], 0.4) * 30)
            new_progress = vehicle["progress"] + step * vehicle["direction"]
            # dispersion / lane change: when speed picks up (>40) rotate lane occasionally
            if vehicle["speed"] > 42 and (state["tick"] + int(vehicle["id"][-3:], 16)) % 17 == 0:
                vehicle["lane"] = (vehicle["lane"] + 1) % max(1, road["lanes"] // 2)
            # wrap or hop road when reaching end
            if new_progress >= 1 or new_progress <= 0:
                # pick a connected road at random for spillback / route continuity
                connected = [r for r in ROADS if road["to_id"] in (r["from_id"], r["to_id"]) and r["id"] != road["id"]]
                if connected:
                    nxt = connected[state["tick"] % len(connected)]
                    vehicle["road_id"] = nxt["id"]
                    vehicle["progress"] = 0.02 if nxt["from_id"] == road["to_id"] else 0.98
                    vehicle["direction"] = 1 if vehicle["progress"] < 0.5 else -1
                else:
                    vehicle["progress"] = new_progress % 1
            else:
                vehicle["progress"] = new_progress
        # congestion evolves with signal overrides + weather + scenario
        scenario_boost = {"Office hours": 0, "Festival mode": 12, "Rainstorm": 15,
                          "Cricket match": 20, "VIP convoy": 8}.get(state["scenario"], 0)
        for i, road in enumerate(ROADS):
            base = 40 + (i * 11) % 55 + scenario_boost
            noise = math.sin(state["tick"] / 7 + i) * 12
            override = state["signal_overrides"].get(road["id"])
            gain = -min(20, override["green_duration"] // 4) if override else 0
            weather_extra = 10 if state["weather"] == "Rainstorm" else 0
            road["congestion"] = round(max(18, min(97, base + noise + weather_extra + gain)), 1)
        # convoy progress
        if state["convoy"] and state["convoy"]["status"] == "active":
            state["convoy"]["progress"] = min(1.0, state["convoy"]["progress"] + 0.02)
            state["convoy"]["eta_minutes"] = max(0, round(18 * (1 - state["convoy"]["progress"])))
            if state["convoy"]["progress"] >= 1.0:
                state["convoy"]["status"] = "completed"
        state["history"].append({"tick": state["tick"], "time": state["updated_at"], "metrics": metrics()})
        state["history"] = state["history"][-120:]
        await broadcast("snapshot", snapshot())

@app.on_event("startup")
async def startup():
    await seed_users(db)
    app.state.simulation_task = asyncio.create_task(simulation_loop())

@app.on_event("shutdown")
async def shutdown():
    task = getattr(app.state, "simulation_task", None)
    if task:
        task.cancel()
    mongo_client.close()
