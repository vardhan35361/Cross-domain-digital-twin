"""Multi-domain digital-twin engine. Each domain publishes: entities, scenarios,
KPI computation, and a per-tick update function. State lives in memory + Mongo audit."""
from __future__ import annotations

import os
import math
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# --------------- Common event/alert schema ---------------

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


# --------------- Hospital domain ---------------
HOSPITAL_DEPTS = [
    {"id": "dept-er", "name": "Emergency", "beds": 24, "floor": 1},
    {"id": "dept-icu", "name": "ICU", "beds": 18, "floor": 3},
    {"id": "dept-or", "name": "Operating Rooms", "beds": 8, "floor": 4},
    {"id": "dept-general", "name": "General Ward", "beds": 60, "floor": 2},
    {"id": "dept-pediatric", "name": "Pediatric", "beds": 22, "floor": 2},
    {"id": "dept-maternity", "name": "Maternity", "beds": 20, "floor": 3},
]

HOSPITAL_EQUIPMENT = [
    {"id": "eq-vent-01", "name": "Ventilator #01", "type": "ventilator", "dept": "dept-icu"},
    {"id": "eq-vent-02", "name": "Ventilator #02", "type": "ventilator", "dept": "dept-icu"},
    {"id": "eq-mri-01", "name": "MRI Scanner", "type": "mri", "dept": "dept-general"},
    {"id": "eq-ct-01", "name": "CT Scanner", "type": "ct", "dept": "dept-er"},
    {"id": "eq-xray-01", "name": "X-Ray Unit", "type": "xray", "dept": "dept-er"},
    {"id": "eq-defib-01", "name": "Defibrillator", "type": "defib", "dept": "dept-er"},
]

HOSPITAL_AMBULANCES = [
    {"id": "amb-01", "callsign": "AMB-01", "status": "available"},
    {"id": "amb-02", "callsign": "AMB-02", "status": "en_route"},
    {"id": "amb-03", "callsign": "AMB-03", "status": "on_scene"},
    {"id": "amb-04", "callsign": "AMB-04", "status": "available"},
]


def hospital_init() -> Dict[str, Any]:
    return {"scenario": "Normal operations", "tick": 0, "running": True,
            "depts": [{**d, "occupied": max(0, int(d["beds"] * 0.55) + random.randint(-3, 3)),
                       "state": "NORMAL", "queue": 0} for d in HOSPITAL_DEPTS],
            "equipment": [{**e, "status": "operational", "last_check": _now(),
                           "state": "NORMAL"} for e in HOSPITAL_EQUIPMENT],
            "ambulances": [{**a} for a in HOSPITAL_AMBULANCES],
            "events": [], "alerts": []}


def hospital_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    surge = state["scenario"] == "Emergency surge"
    icu_surge = state["scenario"] == "ICU surge"
    ambulance_surge = state["scenario"] == "Ambulance surge"
    equip_fail = state["scenario"] == "Equipment failure"
    for d in state["depts"]:
        drift = random.randint(-1, 2)
        if surge and d["id"] == "dept-er":
            drift = random.randint(1, 4)
        if icu_surge and d["id"] == "dept-icu":
            drift = random.randint(1, 3)
        d["occupied"] = max(0, min(d["beds"], d["occupied"] + drift))
        pct = d["occupied"] / d["beds"]
        d["queue"] = max(0, (d["occupied"] - d["beds"] + 4) if pct > 0.9 else 0)
        d["state"] = ("CRITICAL" if pct > 0.95 else "WARNING" if pct > 0.85 else "NORMAL")
        if d["state"] == "CRITICAL" and state["tick"] % 5 == 1:
            existing_key = f"{d['id']}-capacity"
            if not any(a.get("dedup_key") == existing_key for a in state["alerts"][:8]):
                state["alerts"].insert(0, {"id": _uid("ALR"), "domain": "hospital",
                    "severity": "HIGH", "twin_id": d["id"], "at": _now(), "dedup_key": existing_key,
                    "message": f"{d['name']} at {int(pct*100)}% capacity"})
    for e in state["equipment"]:
        if equip_fail and e["type"] == "ventilator" and state["tick"] % 7 == 3 and e["status"] == "operational":
            e["status"] = "offline"; e["state"] = "CRITICAL"
            state["events"].insert(0, {"id": _uid("EVT"), "domain": "hospital",
                "type": "equipment.failure", "severity": "CRITICAL", "twin_id": e["id"],
                "at": _now(), "description": f"{e['name']} lost heartbeat"})
    for a in state["ambulances"]:
        if ambulance_surge and random.random() < 0.35:
            a["status"] = random.choice(["en_route", "on_scene", "available"])
    state["events"] = state["events"][:40]
    state["alerts"] = state["alerts"][:40]


def hospital_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    total_beds = sum(d["beds"] for d in state["depts"])
    occupied = sum(d["occupied"] for d in state["depts"])
    icu = next(d for d in state["depts"] if d["id"] == "dept-icu")
    er = next(d for d in state["depts"] if d["id"] == "dept-er")
    return {
        "occupancy_percent": round(occupied / max(1, total_beds) * 100, 1),
        "icu_occupancy": round(icu["occupied"] / max(1, icu["beds"]) * 100, 1),
        "er_queue": er["queue"],
        "operational_equipment": sum(1 for e in state["equipment"] if e["status"] == "operational"),
        "total_equipment": len(state["equipment"]),
        "available_ambulances": sum(1 for a in state["ambulances"] if a["status"] == "available"),
        "active_alerts": len(state["alerts"]),
    }

# --------------- Building domain ---------------
BUILDING_FLOORS = [
    {"id": f"floor-{i}", "name": f"Floor {i}", "rooms": 12} for i in range(1, 11)
]


def building_init() -> Dict[str, Any]:
    return {"scenario": "Normal occupancy", "tick": 0, "running": True,
            "floors": [{**f, "occupancy": random.randint(20, 80),
                        "temperature": round(22 + random.uniform(-1, 2), 1),
                        "humidity": random.randint(40, 55),
                        "state": "NORMAL"} for f in BUILDING_FLOORS],
            "hvac": {"status": "operational", "load_percent": 55, "setpoint": 22.5, "state": "NORMAL"},
            "elevators": [{"id": f"lift-{i}", "state": "moving", "current_floor": random.randint(1, 10), "load": random.randint(0, 6)} for i in range(1, 5)],
            "energy_kwh": 128.4, "fire_alarm": "clear",
            "events": [], "alerts": []}


def building_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    peak = state["scenario"] == "Peak occupancy"
    hvac_fail = state["scenario"] == "HVAC failure"
    lift_fail = state["scenario"] == "Elevator failure"
    fire = state["scenario"] == "Fire alert"
    for f in state["floors"]:
        drift = random.randint(-3, 6 if peak else 3)
        f["occupancy"] = max(0, min(100, f["occupancy"] + drift))
        target_temp = 22 + (f["occupancy"] - 50) * 0.03
        f["temperature"] = round(f["temperature"] * 0.85 + target_temp * 0.15 + random.uniform(-0.2, 0.2), 1)
        f["state"] = "WARNING" if abs(f["temperature"] - 22.5) > 3 else "NORMAL"
    load = min(100, 40 + sum(f["occupancy"] for f in state["floors"]) / 12)
    state["hvac"]["load_percent"] = round(load, 1)
    if hvac_fail:
        state["hvac"]["status"] = "degraded"; state["hvac"]["state"] = "WARNING"
    else:
        state["hvac"]["status"] = "operational"; state["hvac"]["state"] = "NORMAL"
    for lift in state["elevators"]:
        lift["current_floor"] = max(1, min(10, lift["current_floor"] + random.choice([-1, 1])))
        lift["load"] = random.randint(0, 8)
        lift["state"] = "MAINTENANCE" if lift_fail and lift["id"] == "lift-2" else "moving"
    state["fire_alarm"] = "TRIGGERED" if fire else "clear"
    state["energy_kwh"] = round(state["energy_kwh"] + load * 0.005, 1)
    if state["fire_alarm"] == "TRIGGERED" and state["tick"] % 6 == 1:
        state["alerts"].insert(0, {"id": _uid("ALR"), "domain": "building", "severity": "CRITICAL",
            "twin_id": "building-01", "at": _now(), "message": "Fire alarm active — evacuate"})
    state["events"] = state["events"][:40]; state["alerts"] = state["alerts"][:40]


def building_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    avg_occ = sum(f["occupancy"] for f in state["floors"]) / max(1, len(state["floors"]))
    return {"average_occupancy": round(avg_occ, 1),
            "hvac_load": state["hvac"]["load_percent"],
            "average_temperature": round(sum(f["temperature"] for f in state["floors"]) / max(1, len(state["floors"])), 1),
            "energy_kwh": state["energy_kwh"],
            "elevators_active": sum(1 for l in state["elevators"] if l["state"] == "moving"),
            "fire_alarm": state["fire_alarm"],
            "active_alerts": len(state["alerts"])}


# --------------- Starter domains: Industrial / Energy / Water ---------------

def industrial_init() -> Dict[str, Any]:
    return {"scenario": "Normal production", "tick": 0, "running": True,
            "lines": [{"id": f"line-{i}", "name": f"Production Line {i}", "throughput": 82 + i * 3,
                       "state": "NORMAL", "output_units": 1200 + i * 50, "uptime_percent": 96} for i in range(1, 5)],
            "sensors": [{"id": f"sen-{i}", "kind": ["vibration", "temperature", "pressure"][i % 3],
                         "value": 62 + i * 4, "state": "NORMAL"} for i in range(1, 9)],
            "events": [], "alerts": []}


def industrial_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    shutdown = state["scenario"] == "Line shutdown"
    for i, line in enumerate(state["lines"]):
        if shutdown and i == 1:
            line["throughput"] = max(0, line["throughput"] - 6); line["state"] = "CRITICAL"
        else:
            line["throughput"] = max(50, min(100, line["throughput"] + random.randint(-3, 3)))
            line["state"] = "WARNING" if line["throughput"] < 65 else "NORMAL"
        line["output_units"] += int(line["throughput"] / 10)
    for s in state["sensors"]:
        s["value"] = round(max(30, min(120, s["value"] + random.uniform(-3, 3))), 1)
        s["state"] = "WARNING" if s["value"] > 95 else "NORMAL"


def industrial_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    return {"average_throughput": round(sum(l["throughput"] for l in state["lines"]) / max(1, len(state["lines"])), 1),
            "total_output": sum(l["output_units"] for l in state["lines"]),
            "active_lines": sum(1 for l in state["lines"] if l["state"] != "CRITICAL"),
            "sensor_warnings": sum(1 for s in state["sensors"] if s["state"] == "WARNING")}


def energy_init() -> Dict[str, Any]:
    return {"scenario": "Balanced grid", "tick": 0, "running": True,
            "substations": [{"id": f"sub-{i}", "name": f"Substation {['HYD-01','KPH-02','SEC-03','ORR-04'][i-1]}",
                             "load_mw": 42 + i * 6, "voltage_kv": 220, "state": "NORMAL"} for i in range(1, 5)],
            "generation": {"solar_mw": 28, "wind_mw": 12, "grid_mw": 240, "battery_percent": 68},
            "events": [], "alerts": []}


def energy_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    peak = state["scenario"] == "Peak demand"
    outage = state["scenario"] == "Substation outage"
    for i, s in enumerate(state["substations"]):
        if outage and i == 2:
            s["load_mw"] = 0; s["state"] = "OFFLINE"
        else:
            drift = random.randint(-2, 4 if peak else 2)
            s["load_mw"] = max(20, min(120, s["load_mw"] + drift))
            s["state"] = "WARNING" if s["load_mw"] > 95 else "NORMAL"
    state["generation"]["solar_mw"] = max(0, round(state["generation"]["solar_mw"] + random.uniform(-1.5, 1.5), 1))
    state["generation"]["wind_mw"] = max(0, round(state["generation"]["wind_mw"] + random.uniform(-1, 1), 1))
    state["generation"]["battery_percent"] = max(10, min(100, round(state["generation"]["battery_percent"] + random.uniform(-1, 1), 1)))


def energy_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    total_load = sum(s["load_mw"] for s in state["substations"])
    gen = state["generation"]
    return {"total_load_mw": round(total_load, 1),
            "renewable_mw": round(gen["solar_mw"] + gen["wind_mw"], 1),
            "grid_supply_mw": gen["grid_mw"], "battery_percent": gen["battery_percent"],
            "substations_online": sum(1 for s in state["substations"] if s["state"] != "OFFLINE")}


def water_init() -> Dict[str, Any]:
    return {"scenario": "Normal supply", "tick": 0, "running": True,
            "reservoirs": [{"id": f"res-{i}", "name": ["Manjira", "Nagarjuna", "Osman Sagar", "Krishna"][i-1],
                            "level_percent": 62 + i * 4, "state": "NORMAL"} for i in range(1, 5)],
            "pumps": [{"id": f"pmp-{i}", "flow_lps": 240 + i * 15, "state": "NORMAL"} for i in range(1, 7)],
            "quality": {"ph": 7.2, "turbidity_ntu": 1.4, "chlorine_ppm": 0.6},
            "events": [], "alerts": []}


def water_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    drought = state["scenario"] == "Drought stress"
    leak = state["scenario"] == "Leak detected"
    for r in state["reservoirs"]:
        drift = -0.4 if drought else random.uniform(-0.2, 0.3)
        r["level_percent"] = max(0, min(100, round(r["level_percent"] + drift, 1)))
        r["state"] = "WARNING" if r["level_percent"] < 40 else "NORMAL"
    for i, p in enumerate(state["pumps"]):
        if leak and i == 2:
            p["flow_lps"] = max(0, p["flow_lps"] - 8); p["state"] = "CRITICAL"
        else:
            p["flow_lps"] = max(100, min(400, p["flow_lps"] + random.randint(-4, 4)))
            p["state"] = "NORMAL"


def water_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    return {"avg_reservoir_percent": round(sum(r["level_percent"] for r in state["reservoirs"]) / max(1, len(state["reservoirs"])), 1),
            "total_flow_lps": sum(p["flow_lps"] for p in state["pumps"]),
            "reservoirs_low": sum(1 for r in state["reservoirs"] if r["state"] == "WARNING"),
            "quality_ph": state["quality"]["ph"]}


# --------------- Registry ---------------
DOMAINS = {
    "traffic": {
        "id": "traffic", "name": "Traffic & Transportation", "icon": "car",
        "description": "Hyderabad ITMS — roads, signals, vehicles, incidents, emergency corridors.",
        "flagship": True, "entities": ["road", "vehicle", "junction", "incident", "convoy"],
        "scenarios": ["Office hours", "Festival mode", "Rainstorm", "Cricket match", "VIP convoy"],
        "kpi_url": "/api/overview", "twin_url": "/api/traffic",
    },
    "hospital": {
        "id": "hospital", "name": "Hospital & Healthcare", "icon": "hospital",
        "description": "Bed occupancy, ICU load, emergency queue, equipment health, ambulances.",
        "flagship": False, "entities": ["department", "bed", "equipment", "ambulance"],
        "scenarios": ["Normal operations", "Emergency surge", "ICU surge", "Equipment failure", "Ambulance surge"],
    },
    "building": {
        "id": "building", "name": "Building / Architecture", "icon": "building",
        "description": "Multi-floor occupancy, HVAC load, elevators, fire safety, energy.",
        "flagship": False, "entities": ["floor", "room", "hvac", "elevator"],
        "scenarios": ["Normal occupancy", "Peak occupancy", "HVAC failure", "Elevator failure", "Fire alert"],
    },
    "industrial": {
        "id": "industrial", "name": "Industrial Facility", "icon": "factory",
        "description": "Production lines, sensor throughput, uptime, output volume.",
        "flagship": False, "entities": ["production_line", "sensor"],
        "scenarios": ["Normal production", "Line shutdown"],
    },
    "energy": {
        "id": "energy", "name": "Energy Infrastructure", "icon": "zap",
        "description": "Substations, load MW, renewable mix, battery reserves.",
        "flagship": False, "entities": ["substation", "generator"],
        "scenarios": ["Balanced grid", "Peak demand", "Substation outage"],
    },
    "water": {
        "id": "water", "name": "Water Infrastructure", "icon": "droplet",
        "description": "Reservoir levels, pump flow, water quality (pH/turbidity/chlorine).",
        "flagship": False, "entities": ["reservoir", "pump"],
        "scenarios": ["Normal supply", "Drought stress", "Leak detected"],
    },
}

INITIALIZERS = {"hospital": hospital_init, "building": building_init,
                "industrial": industrial_init, "energy": energy_init, "water": water_init}
TICKERS = {"hospital": hospital_tick, "building": building_tick,
           "industrial": industrial_tick, "energy": energy_tick, "water": water_tick}
KPI_FNS = {"hospital": hospital_kpis, "building": building_kpis,
           "industrial": industrial_kpis, "energy": energy_kpis, "water": water_kpis}


def init_all_domains() -> Dict[str, Any]:
    return {domain: initf() for domain, initf in INITIALIZERS.items()}


def tick_all_domains(store: Dict[str, Any]) -> None:
    for domain, state in store.items():
        TICKERS[domain](state)


class SimCmd(BaseModel):
    running: Optional[bool] = None
    scenario: Optional[str] = None


def build_twins_router(store_getter: Callable[[], Dict[str, Any]]) -> APIRouter:
    router = APIRouter(prefix="/api")

    @router.get("/domains")
    async def list_domains():
        return [DOMAINS[k] for k in ("traffic", "hospital", "building", "industrial", "energy", "water")]

    @router.get("/domains/{domain_id}")
    async def get_domain(domain_id: str):
        if domain_id not in DOMAINS:
            raise HTTPException(status_code=404, detail="Domain not found")
        return DOMAINS[domain_id]

    @router.get("/twins/{domain}")
    async def twin_snapshot(domain: str):
        if domain == "traffic":
            return {"domain": "traffic", "note": "See /api/traffic for full Traffic twin snapshot."}
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        state = store[domain]
        return {"domain": domain, "definition": DOMAINS[domain], "state": state,
                "kpis": KPI_FNS[domain](state), "tick": state["tick"],
                "scenario": state["scenario"], "running": state["running"], "updated_at": _now()}

    @router.get("/twins/{domain}/state")
    async def twin_state(domain: str):
        return await twin_snapshot(domain)

    @router.get("/twins/{domain}/events")
    async def twin_events(domain: str):
        if domain == "traffic":
            return []
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        return store[domain].get("events", [])

    @router.get("/twins/{domain}/alerts")
    async def twin_alerts(domain: str):
        if domain == "traffic":
            return []
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        return store[domain].get("alerts", [])

    @router.post("/twins/{domain}/simulation")
    async def sim_control(domain: str, cmd: SimCmd):
        if domain == "traffic":
            raise HTTPException(status_code=400, detail="Use /api/simulation/control for Traffic")
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        state = store[domain]
        if cmd.running is not None:
            state["running"] = cmd.running
        if cmd.scenario:
            if cmd.scenario not in DOMAINS[domain]["scenarios"]:
                raise HTTPException(status_code=400, detail="Invalid scenario for this domain")
            state["scenario"] = cmd.scenario
        return {"domain": domain, "running": state["running"], "scenario": state["scenario"], "tick": state["tick"]}

    @router.post("/twins/{domain}/simulation/reset")
    async def sim_reset(domain: str):
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        store[domain] = INITIALIZERS[domain]()
        return {"domain": domain, "reset": True, "at": _now()}

    @router.get("/data-sources")
    async def data_sources():
        # Aggregate all known ingestion inputs across domains for the Data Sources workspace
        return [
            {"id": "sim-traffic", "name": "Traffic simulation engine", "domain": "traffic",
             "type": "SIMULATED", "status": "streaming", "latency_ms": 12, "last_update": _now()},
            {"id": "sim-hospital", "name": "Hospital simulation engine", "domain": "hospital",
             "type": "SIMULATED", "status": "streaming", "latency_ms": 8, "last_update": _now()},
            {"id": "sim-building", "name": "Building simulation engine", "domain": "building",
             "type": "SIMULATED", "status": "streaming", "latency_ms": 9, "last_update": _now()},
            {"id": "sim-industrial", "name": "Industrial simulation engine", "domain": "industrial",
             "type": "SIMULATED", "status": "streaming", "latency_ms": 10, "last_update": _now()},
            {"id": "sim-energy", "name": "Energy simulation engine", "domain": "energy",
             "type": "SIMULATED", "status": "streaming", "latency_ms": 11, "last_update": _now()},
            {"id": "sim-water", "name": "Water simulation engine", "domain": "water",
             "type": "SIMULATED", "status": "streaming", "latency_ms": 10, "last_update": _now()},
            {"id": "seed-hyderabad-zones", "name": "Hyderabad zone seed dataset", "domain": "traffic",
             "type": "SEEDED", "status": "loaded", "records": 24, "last_update": _now()},
            {"id": "seed-hospital-schema", "name": "Hospital demo schema", "domain": "hospital",
             "type": "SEEDED", "status": "loaded", "records": 6, "last_update": _now()},
            {"id": "api-tomtom", "name": "TomTom Traffic", "domain": "traffic",
             "type": "LIVE" if os.environ.get("TOMTOM_API_KEY") else "OFFLINE",
             "status": "streaming" if os.environ.get("TOMTOM_API_KEY") else "not configured",
             "last_update": _now()},
            {"id": "api-openweather", "name": "OpenWeather", "domain": "traffic",
             "type": "LIVE" if os.environ.get("OPENWEATHER_API_KEY") else "OFFLINE",
             "status": "streaming" if os.environ.get("OPENWEATHER_API_KEY") else "not configured",
             "last_update": _now()},
        ]

    return router
