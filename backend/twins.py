"""Multi-domain digital-twin engine. Each domain publishes: entities, scenarios,
KPI computation, per-tick update function, operator actions (state mutations)
and a rolling 60-minute history buffer for replay."""
from __future__ import annotations

import os
import math
import random
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any, Callable, Deque, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


HISTORY_MAX = 1800  # 2s tick * 1800 = 3600s = 60 min


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


# ============================================================
# Hospital domain (HERO)
# ============================================================
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
    {"id": "eq-vent-03", "name": "Ventilator #03", "type": "ventilator", "dept": "dept-icu"},
    {"id": "eq-mri-01", "name": "MRI Scanner", "type": "mri", "dept": "dept-general"},
    {"id": "eq-ct-01", "name": "CT Scanner", "type": "ct", "dept": "dept-er"},
    {"id": "eq-xray-01", "name": "X-Ray Unit", "type": "xray", "dept": "dept-er"},
    {"id": "eq-defib-01", "name": "Defibrillator", "type": "defib", "dept": "dept-er"},
    {"id": "eq-anest-01", "name": "Anesthesia Unit", "type": "anesthesia", "dept": "dept-or"},
]

HOSPITAL_AMBULANCES = [
    {"id": "amb-01", "callsign": "AMB-01", "status": "available", "zone": "Gachibowli"},
    {"id": "amb-02", "callsign": "AMB-02", "status": "en_route", "zone": "HITEC"},
    {"id": "amb-03", "callsign": "AMB-03", "status": "on_scene", "zone": "Secunderabad"},
    {"id": "amb-04", "callsign": "AMB-04", "status": "available", "zone": "Airport"},
    {"id": "amb-05", "callsign": "AMB-05", "status": "returning", "zone": "Jubilee"},
]

# Individual ICU beds (bed-level granularity for the hero domain)
def _make_icu_beds():
    beds = []
    conditions = ["Stable", "Critical", "Monitoring", "Recovering", "Post-Op", "Stable", "Stable", "Empty", "Empty", "Empty"]
    for i in range(1, 19):
        cond = conditions[(i - 1) % len(conditions)]
        occupied = cond != "Empty"
        beds.append({
            "id": f"icu-bed-{i:02d}", "name": f"ICU {i:02d}",
            "occupied": occupied,
            "patient_id": f"PT-{1000+i}" if occupied else None,
            "condition": cond,
            "heart_rate": random.randint(72, 105) if occupied else 0,
            "spo2": random.randint(90, 99) if occupied else 0,
            "ventilator": occupied and (i % 3 == 0),
            "state": "CRITICAL" if cond == "Critical" else ("WARNING" if cond == "Monitoring" else "NORMAL"),
        })
    return beds


ER_TRIAGE_TAGS = ["red", "orange", "yellow", "green"]


def _make_er_queue():
    q = []
    for i in range(1, 9):
        tag = ER_TRIAGE_TAGS[(i - 1) % 4]
        q.append({
            "id": f"tri-{i:03d}", "name": f"Patient {i}",
            "triage": tag, "wait_minutes": (i * 3) % 25,
            "chief_complaint": ["Chest pain", "Trauma", "Fracture", "Fever", "Breathing distress", "Laceration"][i % 6],
            "arrived_at": _now(),
            "state": "CRITICAL" if tag == "red" else "WARNING" if tag == "orange" else "NORMAL",
        })
    return q


def hospital_init() -> Dict[str, Any]:
    return {
        "scenario": "Normal operations", "tick": 0, "running": True,
        "depts": [{**d, "occupied": max(0, int(d["beds"] * 0.55) + random.randint(-3, 3)),
                   "state": "NORMAL", "queue": 0, "offline": False} for d in HOSPITAL_DEPTS],
        "icu_beds": _make_icu_beds(),
        "er_queue": _make_er_queue(),
        "equipment": [{**e, "status": "operational", "last_check": _now(),
                       "state": "NORMAL", "hours_since_service": random.randint(4, 240)} for e in HOSPITAL_EQUIPMENT],
        "ambulances": [{**a, "eta_minutes": random.randint(2, 18) if a["status"] != "available" else 0}
                       for a in HOSPITAL_AMBULANCES],
        "pharmacy": {"stock_percent": 82, "critical_low": 2, "orders_open": 5},
        "events": [], "alerts": [],
    }


def hospital_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    surge = state["scenario"] == "Emergency surge"
    icu_surge = state["scenario"] == "ICU surge"
    ambulance_surge = state["scenario"] == "Ambulance surge"
    equip_fail = state["scenario"] == "Equipment failure"

    for d in state["depts"]:
        if d.get("offline"):
            d["state"] = "OFFLINE"
            continue
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

    # ICU beds vitals evolution
    for b in state["icu_beds"]:
        if not b["occupied"]:
            continue
        b["heart_rate"] = max(50, min(160, b["heart_rate"] + random.randint(-3, 3)))
        b["spo2"] = max(85, min(100, b["spo2"] + random.choice([-1, 0, 0, 1])))
        if icu_surge and random.random() < 0.06 and b["condition"] == "Stable":
            b["condition"] = "Critical"; b["state"] = "CRITICAL"
        if b["condition"] == "Critical" and (b["heart_rate"] > 130 or b["spo2"] < 88):
            b["state"] = "CRITICAL"

    # ER queue evolution
    if surge and state["tick"] % 4 == 0 and len(state["er_queue"]) < 20:
        state["er_queue"].insert(0, {
            "id": _uid("TRI"), "name": f"Walk-in {state['tick']}",
            "triage": random.choice(["red", "orange", "yellow", "green"]),
            "wait_minutes": 0, "chief_complaint": random.choice(["Chest pain", "Trauma", "Fracture"]),
            "arrived_at": _now(),
            "state": "CRITICAL",
        })
    for p in state["er_queue"]:
        p["wait_minutes"] += 1
    # Occasionally clear one
    if state["er_queue"] and state["tick"] % 6 == 0:
        state["er_queue"].pop()

    for e in state["equipment"]:
        e["hours_since_service"] += 1
        if equip_fail and e["type"] == "ventilator" and state["tick"] % 7 == 3 and e["status"] == "operational":
            e["status"] = "offline"; e["state"] = "CRITICAL"
            state["events"].insert(0, {"id": _uid("EVT"), "domain": "hospital",
                "type": "equipment.failure", "severity": "CRITICAL", "twin_id": e["id"],
                "at": _now(), "description": f"{e['name']} lost heartbeat"})

    for a in state["ambulances"]:
        if ambulance_surge and random.random() < 0.35:
            a["status"] = random.choice(["en_route", "on_scene", "available"])
        if a["status"] == "en_route":
            a["eta_minutes"] = max(0, a.get("eta_minutes", 8) - 1)
            if a["eta_minutes"] == 0:
                a["status"] = "on_scene"
        elif a["status"] == "on_scene" and state["tick"] % 8 == 0:
            a["status"] = "returning"; a["eta_minutes"] = random.randint(6, 18)
        elif a["status"] == "returning":
            a["eta_minutes"] = max(0, a.get("eta_minutes", 8) - 1)
            if a["eta_minutes"] == 0:
                a["status"] = "available"

    state["events"] = state["events"][:60]
    state["alerts"] = state["alerts"][:60]


def hospital_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    total_beds = sum(d["beds"] for d in state["depts"])
    occupied = sum(d["occupied"] for d in state["depts"])
    icu = next(d for d in state["depts"] if d["id"] == "dept-icu")
    er = next(d for d in state["depts"] if d["id"] == "dept-er")
    icu_beds = state.get("icu_beds", [])
    icu_occupied = sum(1 for b in icu_beds if b["occupied"])
    er_queue = state.get("er_queue", [])
    return {
        "occupancy_percent": round(occupied / max(1, total_beds) * 100, 1),
        "icu_occupancy": round(icu["occupied"] / max(1, icu["beds"]) * 100, 1),
        "icu_beds_occupied": icu_occupied,
        "icu_beds_total": len(icu_beds),
        "er_queue": er["queue"],
        "er_waiting": len(er_queue),
        "er_critical": sum(1 for p in er_queue if p["triage"] == "red"),
        "operational_equipment": sum(1 for e in state["equipment"] if e["status"] == "operational"),
        "total_equipment": len(state["equipment"]),
        "available_ambulances": sum(1 for a in state["ambulances"] if a["status"] == "available"),
        "active_alerts": len(state["alerts"]),
    }


# ============================================================
# Building domain
# ============================================================
BUILDING_FLOORS = [{"id": f"floor-{i}", "name": f"Floor {i}", "rooms": 12} for i in range(1, 11)]


def _make_hvac_zones():
    return [{"id": f"hvac-z{i}", "name": f"Zone {i}", "floors": list(range((i-1)*3+1, i*3+1)),
             "setpoint": 22.5, "current": 22.5 + random.uniform(-0.6, 0.6), "load": 45,
             "state": "NORMAL", "enabled": True} for i in range(1, 5)]


def _make_access_doors():
    doors = []
    for i in range(1, 9):
        doors.append({"id": f"door-{i:02d}", "name": f"Door {i}",
                      "zone": ["Lobby", "Service", "Parking", "Roof", "Executive", "Data Center", "Cafeteria", "Fire Exit"][i-1],
                      "locked": i in (5, 6), "state": "NORMAL",
                      "last_swipe": _now()})
    return doors


def building_init() -> Dict[str, Any]:
    return {
        "scenario": "Normal occupancy", "tick": 0, "running": True,
        "floors": [{**f, "occupancy": random.randint(20, 80),
                    "temperature": round(22 + random.uniform(-1, 2), 1),
                    "humidity": random.randint(40, 55),
                    "state": "NORMAL"} for f in BUILDING_FLOORS],
        "hvac_zones": _make_hvac_zones(),
        "hvac": {"status": "operational", "load_percent": 55, "setpoint": 22.5, "state": "NORMAL"},
        "elevators": [{"id": f"lift-{i}", "state": "moving", "current_floor": random.randint(1, 10),
                       "load": random.randint(0, 6), "capacity": 12, "trips_today": random.randint(80, 220)} for i in range(1, 5)],
        "access_doors": _make_access_doors(),
        "energy_kwh": 128.4, "solar_kwh": 32.1, "grid_kwh": 96.3,
        "fire_alarm": "clear", "sprinkler_zones": [{"id": f"spr-z{i}", "armed": True, "state": "NORMAL"} for i in range(1, 5)],
        "events": [], "alerts": []
    }


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

    # HVAC zones respond to their floor group + setpoint
    for z in state["hvac_zones"]:
        if not z["enabled"]:
            z["state"] = "OFFLINE"; z["load"] = 0; continue
        z_floors = [f for f in state["floors"] if int(f["id"].split("-")[1]) in z["floors"]]
        target_occ = sum(f["occupancy"] for f in z_floors) / max(1, len(z_floors))
        z["load"] = round(max(20, min(100, 30 + target_occ * 0.7 + (30 if hvac_fail else 0))), 1)
        # current temp drifts toward setpoint (harder under high load / failure)
        drift = (z["setpoint"] - z["current"]) * (0.05 if hvac_fail else 0.2)
        z["current"] = round(z["current"] + drift + random.uniform(-0.15, 0.15), 2)
        z["state"] = "WARNING" if abs(z["current"] - z["setpoint"]) > 2 else "NORMAL"

    load = min(100, 40 + sum(f["occupancy"] for f in state["floors"]) / 12)
    state["hvac"]["load_percent"] = round(load, 1)
    if hvac_fail:
        state["hvac"]["status"] = "degraded"; state["hvac"]["state"] = "WARNING"
    else:
        state["hvac"]["status"] = "operational"; state["hvac"]["state"] = "NORMAL"

    for lift in state["elevators"]:
        if lift.get("maintenance"):
            lift["state"] = "MAINTENANCE"; continue
        lift["current_floor"] = max(1, min(10, lift["current_floor"] + random.choice([-1, 1])))
        lift["load"] = random.randint(0, 8)
        lift["state"] = "MAINTENANCE" if lift_fail and lift["id"] == "lift-2" else "moving"
        if lift["state"] == "moving":
            lift["trips_today"] += 1 if state["tick"] % 3 == 0 else 0

    state["fire_alarm"] = "TRIGGERED" if fire else "clear"
    state["energy_kwh"] = round(state["energy_kwh"] + load * 0.005, 1)
    state["solar_kwh"] = round(state["solar_kwh"] + max(0, math.sin(state["tick"] / 12) * 0.4), 1)
    state["grid_kwh"] = round(state["energy_kwh"] - state["solar_kwh"], 1)

    if state["fire_alarm"] == "TRIGGERED" and state["tick"] % 6 == 1:
        state["alerts"].insert(0, {"id": _uid("ALR"), "domain": "building", "severity": "CRITICAL",
            "twin_id": "building-01", "at": _now(), "message": "Fire alarm active — evacuate"})
    state["events"] = state["events"][:60]; state["alerts"] = state["alerts"][:60]


def building_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    avg_occ = sum(f["occupancy"] for f in state["floors"]) / max(1, len(state["floors"]))
    return {"average_occupancy": round(avg_occ, 1),
            "hvac_load": state["hvac"]["load_percent"],
            "hvac_zones_active": sum(1 for z in state.get("hvac_zones", []) if z.get("enabled")),
            "average_temperature": round(sum(f["temperature"] for f in state["floors"]) / max(1, len(state["floors"])), 1),
            "energy_kwh": state["energy_kwh"], "solar_kwh": state.get("solar_kwh", 0),
            "elevators_active": sum(1 for l in state["elevators"] if l["state"] == "moving"),
            "doors_locked": sum(1 for d in state.get("access_doors", []) if d.get("locked")),
            "fire_alarm": state["fire_alarm"],
            "active_alerts": len(state["alerts"])}


# ============================================================
# Industrial domain
# ============================================================
def _make_machines():
    types = ["CNC", "Press", "Robot Arm", "Welder", "Conveyor", "Injection Molder", "Assembler", "Painter"]
    m = []
    for i in range(1, 13):
        m.append({
            "id": f"mach-{i:02d}", "name": f"{types[i % len(types)]} #{i:02d}",
            "type": types[i % len(types)], "line": f"line-{(i % 4) + 1}",
            "state": "NORMAL", "status": "running",
            "temperature": round(55 + random.uniform(-5, 15), 1),
            "vibration_hz": round(45 + random.uniform(-8, 12), 1),
            "utilization": round(72 + random.uniform(-10, 20), 1),
            "cycles_today": random.randint(180, 1400),
            "maintenance_due_days": random.randint(3, 90),
        })
    return m


def _make_quality():
    return {"defect_rate_ppm": 320, "yield_percent": 96.4,
            "batches_today": 42, "inspections_pass": 386, "inspections_fail": 12,
            "iso9001_compliance": 98.1, "last_audit": _now()}


def industrial_init() -> Dict[str, Any]:
    return {
        "scenario": "Normal production", "tick": 0, "running": True,
        "lines": [{"id": f"line-{i}", "name": f"Production Line {i}", "throughput": 82 + i * 3,
                   "state": "NORMAL", "output_units": 1200 + i * 50, "uptime_percent": 96,
                   "target_units": 1500 + i * 40, "operators": 8 + i} for i in range(1, 5)],
        "machines": _make_machines(),
        "sensors": [{"id": f"sen-{i}", "kind": ["vibration", "temperature", "pressure"][i % 3],
                     "value": 62 + i * 4, "unit": ["Hz", "°C", "bar"][i % 3],
                     "state": "NORMAL", "machine_id": f"mach-{(i % 12) + 1:02d}"} for i in range(1, 13)],
        "quality": _make_quality(),
        "safety": {"incidents_this_month": 0, "last_incident_days_ago": 47,
                   "ppe_compliance": 98.4, "audits_open": 2, "state": "NORMAL"},
        "events": [], "alerts": []
    }


def industrial_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    shutdown = state["scenario"] == "Line shutdown"
    for i, line in enumerate(state["lines"]):
        if line.get("offline"):
            line["throughput"] = 0; line["state"] = "OFFLINE"; continue
        if shutdown and i == 1:
            line["throughput"] = max(0, line["throughput"] - 6); line["state"] = "CRITICAL"
        else:
            line["throughput"] = max(50, min(100, line["throughput"] + random.randint(-3, 3)))
            line["state"] = "WARNING" if line["throughput"] < 65 else "NORMAL"
        line["output_units"] += int(line["throughput"] / 10)

    for m in state["machines"]:
        if m["status"] == "stopped":
            m["state"] = "OFFLINE"; continue
        if m["status"] == "maintenance":
            m["state"] = "MAINTENANCE"; continue
        m["temperature"] = round(max(30, min(120, m["temperature"] + random.uniform(-1.5, 2.0))), 1)
        m["vibration_hz"] = round(max(20, min(120, m["vibration_hz"] + random.uniform(-2, 2))), 1)
        m["utilization"] = round(max(30, min(100, m["utilization"] + random.uniform(-3, 3))), 1)
        m["cycles_today"] += 1 if state["tick"] % 2 == 0 else 0
        m["state"] = ("CRITICAL" if m["temperature"] > 100 or m["vibration_hz"] > 100
                      else "WARNING" if m["temperature"] > 85 or m["vibration_hz"] > 80 else "NORMAL")

    for s in state["sensors"]:
        s["value"] = round(max(30, min(120, s["value"] + random.uniform(-3, 3))), 1)
        s["state"] = "WARNING" if s["value"] > 95 else "NORMAL"

    # quality metrics drift
    q = state["quality"]
    q["defect_rate_ppm"] = max(100, min(1200, q["defect_rate_ppm"] + random.randint(-20, 25)))
    q["yield_percent"] = round(max(88, min(99.5, 100 - q["defect_rate_ppm"] / 300)), 2)


def industrial_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    machines = state.get("machines", [])
    return {"average_throughput": round(sum(l["throughput"] for l in state["lines"]) / max(1, len(state["lines"])), 1),
            "total_output": sum(l["output_units"] for l in state["lines"]),
            "active_lines": sum(1 for l in state["lines"] if l["state"] not in ("CRITICAL", "OFFLINE")),
            "machines_running": sum(1 for m in machines if m["status"] == "running"),
            "machines_total": len(machines),
            "defect_rate_ppm": state.get("quality", {}).get("defect_rate_ppm", 0),
            "yield_percent": state.get("quality", {}).get("yield_percent", 0),
            "sensor_warnings": sum(1 for s in state["sensors"] if s["state"] == "WARNING")}


# ============================================================
# Energy domain
# ============================================================
def _make_transformers():
    t = []
    for i in range(1, 9):
        t.append({"id": f"tr-{i:02d}", "name": f"Transformer T{i}",
                  "substation": f"sub-{(i % 4) + 1}",
                  "load_mva": round(30 + random.uniform(-8, 15), 1),
                  "temperature_c": round(65 + random.uniform(-8, 15), 1),
                  "oil_level_percent": random.randint(70, 96),
                  "state": "NORMAL", "status": "online"})
    return t


def _make_feeders():
    f = []
    zones = ["Gachibowli", "HITEC City", "Financial District", "Jubilee", "Banjara", "Uppal", "Miyapur", "Secunderabad"]
    for i, z in enumerate(zones):
        f.append({"id": f"feed-{i+1:02d}", "name": f"Feeder {z}",
                  "substation": f"sub-{(i % 4) + 1}",
                  "load_kw": round(1200 + random.uniform(-200, 400), 1),
                  "voltage_kv": 11, "customers": 4200 + i * 130,
                  "state": "NORMAL", "energized": True})
    return f


def energy_init() -> Dict[str, Any]:
    return {
        "scenario": "Balanced grid", "tick": 0, "running": True,
        "substations": [{"id": f"sub-{i}", "name": f"Substation {['HYD-01','KPH-02','SEC-03','ORR-04'][i-1]}",
                         "load_mw": 42 + i * 6, "voltage_kv": 220,
                         "capacity_mw": 120, "state": "NORMAL", "isolated": False,
                         "connected_transformers": 2} for i in range(1, 5)],
        "transformers": _make_transformers(),
        "feeders": _make_feeders(),
        "generation": {"solar_mw": 28, "wind_mw": 12, "grid_mw": 240, "battery_percent": 68,
                       "battery_mw": 40, "battery_flow": "discharging"},
        "solar_arrays": [{"id": f"sol-{i}", "name": f"Solar Field {i}", "output_mw": round(6 + random.uniform(-2, 3), 1),
                          "panels_online": 480 + i * 40, "state": "NORMAL"} for i in range(1, 5)],
        "wind_turbines": [{"id": f"wt-{i}", "name": f"Turbine {i}", "output_mw": round(2.5 + random.uniform(-0.8, 1.2), 1),
                           "rpm": random.randint(12, 22), "state": "NORMAL"} for i in range(1, 5)],
        "load_forecast": [{"hour": h, "load_mw": round(180 + 40 * math.sin(h/24 * 2 * math.pi))} for h in range(0, 24)],
        "events": [], "alerts": []
    }


def energy_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    peak = state["scenario"] == "Peak demand"
    outage = state["scenario"] == "Substation outage"

    for i, s in enumerate(state["substations"]):
        if s.get("isolated"):
            s["load_mw"] = 0; s["state"] = "OFFLINE"; continue
        if outage and i == 2:
            s["load_mw"] = 0; s["state"] = "OFFLINE"
        else:
            drift = random.randint(-2, 4 if peak else 2)
            s["load_mw"] = max(20, min(120, s["load_mw"] + drift))
            s["state"] = "WARNING" if s["load_mw"] > 95 else "NORMAL"

    # Transformers respond to substation state
    for t in state["transformers"]:
        parent = next((s for s in state["substations"] if s["id"] == t["substation"]), None)
        if not parent or parent["state"] == "OFFLINE" or t["status"] != "online":
            t["load_mva"] = 0; t["state"] = "OFFLINE"; continue
        t["load_mva"] = round(max(10, min(90, t["load_mva"] + random.uniform(-2, 3))), 1)
        t["temperature_c"] = round(max(40, min(110, t["temperature_c"] + random.uniform(-1.5, 2))), 1)
        t["state"] = "CRITICAL" if t["temperature_c"] > 95 else "WARNING" if t["temperature_c"] > 85 else "NORMAL"

    # Feeders follow transformer / substation
    for f in state["feeders"]:
        parent = next((s for s in state["substations"] if s["id"] == f["substation"]), None)
        if not parent or parent["state"] == "OFFLINE" or not f["energized"]:
            f["load_kw"] = 0; f["state"] = "OFFLINE"; continue
        f["load_kw"] = round(max(200, min(3200, f["load_kw"] + random.uniform(-60, 90))), 1)
        f["state"] = "WARNING" if f["load_kw"] > 2600 else "NORMAL"

    # generation
    gen = state["generation"]
    gen["solar_mw"] = max(0, round(gen["solar_mw"] + random.uniform(-1.5, 1.5), 1))
    gen["wind_mw"] = max(0, round(gen["wind_mw"] + random.uniform(-1, 1), 1))
    gen["battery_percent"] = max(10, min(100, round(gen["battery_percent"] + random.uniform(-0.4, 0.4), 1)))
    gen["battery_flow"] = "discharging" if peak else "charging"

    for s in state["solar_arrays"]:
        s["output_mw"] = round(max(0, s["output_mw"] + random.uniform(-0.5, 0.6)), 1)
    for w in state["wind_turbines"]:
        w["output_mw"] = round(max(0, w["output_mw"] + random.uniform(-0.4, 0.5)), 1)
        w["rpm"] = max(6, min(28, w["rpm"] + random.randint(-2, 2)))


def energy_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    total_load = sum(s["load_mw"] for s in state["substations"] if s.get("state") != "OFFLINE")
    gen = state["generation"]
    solar_total = sum(s["output_mw"] for s in state.get("solar_arrays", []))
    wind_total = sum(w["output_mw"] for w in state.get("wind_turbines", []))
    return {"total_load_mw": round(total_load, 1),
            "renewable_mw": round(solar_total + wind_total, 1),
            "solar_mw": round(solar_total, 1),
            "wind_mw": round(wind_total, 1),
            "grid_supply_mw": gen["grid_mw"], "battery_percent": gen["battery_percent"],
            "battery_flow": gen.get("battery_flow", "idle"),
            "substations_online": sum(1 for s in state["substations"] if s.get("state") != "OFFLINE"),
            "transformers_online": sum(1 for t in state.get("transformers", []) if t.get("state") != "OFFLINE"),
            "feeders_online": sum(1 for f in state.get("feeders", []) if f.get("state") != "OFFLINE"),
            "active_alerts": len(state["alerts"])}


# ============================================================
# Water domain
# ============================================================
def _make_valves():
    v = []
    zones = ["Main Trunk", "North Distribution", "West Distribution", "Airport Feed",
             "IT Corridor Feed", "Old City Feed", "Emergency Bypass", "Reservoir Isolation"]
    for i, z in enumerate(zones):
        v.append({"id": f"vlv-{i+1:02d}", "name": z, "open": True,
                  "flow_lps": 400 + i * 40, "pressure_bar": round(4.2 + random.uniform(-0.4, 0.5), 2),
                  "state": "NORMAL"})
    return v


def _make_pipeline_segments():
    segs = []
    for i in range(1, 13):
        segs.append({"id": f"pipe-{i:02d}", "name": f"Segment {i}", "length_km": round(1.2 + i * 0.3, 1),
                     "flow_lps": 380 + i * 15, "pressure_bar": round(3.8 + random.uniform(-0.3, 0.4), 2),
                     "leak_probability": round(random.uniform(0.001, 0.02), 3),
                     "state": "NORMAL"})
    return segs


def water_init() -> Dict[str, Any]:
    return {
        "scenario": "Normal supply", "tick": 0, "running": True,
        "reservoirs": [{"id": f"res-{i}", "name": ["Manjira", "Nagarjuna", "Osman Sagar", "Krishna"][i-1],
                        "level_percent": 62 + i * 4,
                        "capacity_ml": 4200 + i * 800,
                        "inflow_lps": 260 + i * 20, "outflow_lps": 240 + i * 15,
                        "state": "NORMAL"} for i in range(1, 5)],
        "pumps": [{"id": f"pmp-{i}", "name": f"Pump Station {i}",
                   "flow_lps": 240 + i * 15, "power_kw": 45 + i * 8,
                   "vibration": round(2.4 + random.uniform(-0.4, 0.8), 2),
                   "state": "NORMAL", "status": "running"} for i in range(1, 7)],
        "valves": _make_valves(),
        "pipeline_segments": _make_pipeline_segments(),
        "quality": {"ph": 7.2, "turbidity_ntu": 1.4, "chlorine_ppm": 0.6,
                    "tds_ppm": 320, "temperature_c": 26.4, "bacteria_check": "PASS"},
        "leak_sensors": [{"id": f"leak-{i}", "location": f"Zone {i}", "status": "clear", "state": "NORMAL"} for i in range(1, 9)],
        "events": [], "alerts": []
    }


def water_tick(state: Dict[str, Any]) -> None:
    if not state["running"]:
        return
    state["tick"] += 1
    drought = state["scenario"] == "Drought stress"
    leak = state["scenario"] == "Leak detected"

    for r in state["reservoirs"]:
        # inflow / outflow recomputed from downstream valves
        drift = -0.4 if drought else random.uniform(-0.2, 0.3)
        r["level_percent"] = max(0, min(100, round(r["level_percent"] + drift, 1)))
        r["inflow_lps"] = max(50, min(600, r["inflow_lps"] + random.randint(-8, 8)))
        r["outflow_lps"] = max(50, min(600, r["outflow_lps"] + random.randint(-8, 8)))
        r["state"] = "WARNING" if r["level_percent"] < 40 else "NORMAL"

    for i, p in enumerate(state["pumps"]):
        if p["status"] != "running":
            p["flow_lps"] = 0; p["state"] = "OFFLINE"; continue
        if leak and i == 2:
            p["flow_lps"] = max(0, p["flow_lps"] - 8); p["state"] = "CRITICAL"
        else:
            p["flow_lps"] = max(100, min(400, p["flow_lps"] + random.randint(-4, 4)))
            p["state"] = "NORMAL"
        p["vibration"] = round(max(1, min(6, p["vibration"] + random.uniform(-0.15, 0.15))), 2)

    # Valve state drives flow into pipeline segments
    for v in state["valves"]:
        if not v["open"]:
            v["flow_lps"] = 0; v["pressure_bar"] = 0; v["state"] = "OFFLINE"; continue
        v["flow_lps"] = max(100, min(900, v["flow_lps"] + random.randint(-8, 8)))
        v["pressure_bar"] = round(max(2.0, min(6.5, v["pressure_bar"] + random.uniform(-0.1, 0.1))), 2)
        v["state"] = "WARNING" if v["pressure_bar"] < 2.5 else "NORMAL"

    # Pipeline segments respond to upstream valves; if a leak scenario, mark one
    for i, seg in enumerate(state["pipeline_segments"]):
        seg["flow_lps"] = max(0, min(900, seg["flow_lps"] + random.randint(-10, 10)))
        seg["pressure_bar"] = round(max(1.5, min(6.0, seg["pressure_bar"] + random.uniform(-0.08, 0.08))), 2)
        if leak and i == 4:
            seg["state"] = "CRITICAL"; seg["leak_probability"] = round(min(0.95, seg["leak_probability"] + 0.05), 3)
        else:
            seg["state"] = "WARNING" if seg["pressure_bar"] < 2.5 else "NORMAL"

    for s in state["leak_sensors"]:
        s["status"] = "leak" if leak and s["id"] == "leak-3" else "clear"
        s["state"] = "CRITICAL" if s["status"] == "leak" else "NORMAL"

    q = state["quality"]
    q["ph"] = round(max(6.0, min(8.5, q["ph"] + random.uniform(-0.03, 0.03))), 2)
    q["chlorine_ppm"] = round(max(0.2, min(1.6, q["chlorine_ppm"] + random.uniform(-0.02, 0.02))), 2)
    q["turbidity_ntu"] = round(max(0.4, min(4.0, q["turbidity_ntu"] + random.uniform(-0.08, 0.1))), 2)


def water_kpis(state: Dict[str, Any]) -> Dict[str, Any]:
    return {"avg_reservoir_percent": round(sum(r["level_percent"] for r in state["reservoirs"]) / max(1, len(state["reservoirs"])), 1),
            "total_flow_lps": sum(p["flow_lps"] for p in state["pumps"]),
            "pumps_running": sum(1 for p in state["pumps"] if p["status"] == "running"),
            "valves_open": sum(1 for v in state["valves"] if v.get("open")),
            "reservoirs_low": sum(1 for r in state["reservoirs"] if r["state"] == "WARNING"),
            "leaks_detected": sum(1 for s in state.get("leak_sensors", []) if s.get("status") == "leak"),
            "quality_ph": state["quality"]["ph"],
            "quality_chlorine": state["quality"]["chlorine_ppm"],
            "quality_turbidity": state["quality"]["turbidity_ntu"],
            "active_alerts": len(state["alerts"])}


# ============================================================
# Registry
# ============================================================
DOMAINS = {
    "traffic": {"id": "traffic", "name": "Traffic & Transportation", "icon": "car",
        "description": "Hyderabad ITMS — roads, signals, vehicles, incidents, emergency corridors.",
        "flagship": True, "entities": ["road", "vehicle", "junction", "incident", "convoy"],
        "scenarios": ["Office hours", "Festival mode", "Rainstorm", "Cricket match", "VIP convoy"]},
    "hospital": {"id": "hospital", "name": "Hospital & Healthcare", "icon": "hospital",
        "description": "Bed occupancy, ICU load, emergency queue, equipment health, ambulances.",
        "flagship": True, "entities": ["department", "bed", "equipment", "ambulance"],
        "scenarios": ["Normal operations", "Emergency surge", "ICU surge", "Equipment failure", "Ambulance surge"]},
    "building": {"id": "building", "name": "Building / Architecture", "icon": "building",
        "description": "Multi-floor occupancy, HVAC load, elevators, fire safety, energy.",
        "flagship": False, "entities": ["floor", "room", "hvac", "elevator"],
        "scenarios": ["Normal occupancy", "Peak occupancy", "HVAC failure", "Elevator failure", "Fire alert"]},
    "industrial": {"id": "industrial", "name": "Industrial Facility", "icon": "factory",
        "description": "Production lines, sensor throughput, uptime, output volume.",
        "flagship": False, "entities": ["production_line", "sensor", "machine"],
        "scenarios": ["Normal production", "Line shutdown", "Machine failure"]},
    "energy": {"id": "energy", "name": "Energy Infrastructure", "icon": "zap",
        "description": "Substations, load MW, renewable mix, battery reserves.",
        "flagship": False, "entities": ["substation", "transformer", "feeder", "generator"],
        "scenarios": ["Balanced grid", "Peak demand", "Substation outage"]},
    "water": {"id": "water", "name": "Water Infrastructure", "icon": "droplet",
        "description": "Reservoir levels, pump flow, valves, water quality.",
        "flagship": False, "entities": ["reservoir", "pump", "valve", "pipeline"],
        "scenarios": ["Normal supply", "Drought stress", "Leak detected"]},
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


# ============================================================
# Operator action engine — REAL state mutations
# ============================================================
ACTION_HANDLERS: Dict[str, Dict[str, Callable[[Dict[str, Any], Dict[str, Any]], Dict[str, Any]]]] = {}


def register_action(domain: str, action: str):
    def deco(fn):
        ACTION_HANDLERS.setdefault(domain, {})[action] = fn
        return fn
    return deco


# ------- Hospital actions -------
@register_action("hospital", "ward.offline")
def _hospital_ward_offline(state, params):
    dept_id = params.get("dept_id")
    dept = next((d for d in state["depts"] if d["id"] == dept_id), None)
    if not dept:
        raise HTTPException(400, f"Unknown department {dept_id}")
    dept["offline"] = True; dept["state"] = "OFFLINE"
    return {"dept": dept_id, "offline": True}


@register_action("hospital", "ward.restore")
def _hospital_ward_restore(state, params):
    dept_id = params.get("dept_id")
    dept = next((d for d in state["depts"] if d["id"] == dept_id), None)
    if not dept:
        raise HTTPException(400, f"Unknown department {dept_id}")
    dept["offline"] = False; dept["state"] = "NORMAL"
    return {"dept": dept_id, "restored": True}


@register_action("hospital", "equipment.offline")
def _hospital_equipment_offline(state, params):
    eq_id = params.get("equipment_id")
    eq = next((e for e in state["equipment"] if e["id"] == eq_id), None)
    if not eq:
        raise HTTPException(400, "Unknown equipment")
    eq["status"] = "offline"; eq["state"] = "CRITICAL"
    return {"equipment_id": eq_id, "status": "offline"}


@register_action("hospital", "equipment.restore")
def _hospital_equipment_restore(state, params):
    eq_id = params.get("equipment_id")
    eq = next((e for e in state["equipment"] if e["id"] == eq_id), None)
    if not eq:
        raise HTTPException(400, "Unknown equipment")
    eq["status"] = "operational"; eq["state"] = "NORMAL"; eq["last_check"] = _now()
    eq["hours_since_service"] = 0
    return {"equipment_id": eq_id, "status": "operational"}


@register_action("hospital", "ambulance.dispatch")
def _hospital_amb_dispatch(state, params):
    amb_id = params.get("ambulance_id")
    amb = next((a for a in state["ambulances"] if a["id"] == amb_id), None)
    if not amb:
        raise HTTPException(400, "Unknown ambulance")
    if amb["status"] != "available":
        raise HTTPException(400, f"Ambulance {amb_id} not available (status: {amb['status']})")
    amb["status"] = "en_route"; amb["eta_minutes"] = params.get("eta", 8)
    amb["zone"] = params.get("zone", amb.get("zone", "Unknown"))
    return {"ambulance_id": amb_id, "status": "en_route", "eta_minutes": amb["eta_minutes"]}


@register_action("hospital", "icu_bed.discharge")
def _hospital_icu_discharge(state, params):
    bed_id = params.get("bed_id")
    bed = next((b for b in state["icu_beds"] if b["id"] == bed_id), None)
    if not bed:
        raise HTTPException(400, "Unknown ICU bed")
    if not bed["occupied"]:
        raise HTTPException(400, "Bed already empty")
    bed.update({"occupied": False, "patient_id": None, "condition": "Empty",
                "heart_rate": 0, "spo2": 0, "ventilator": False, "state": "NORMAL"})
    return {"bed_id": bed_id, "discharged": True}


# ------- Building actions -------
@register_action("building", "hvac.setpoint")
def _building_hvac_setpoint(state, params):
    zone_id = params.get("zone_id")
    setpoint = float(params.get("setpoint", 22.5))
    if not (16 <= setpoint <= 28):
        raise HTTPException(400, "Setpoint must be between 16 and 28°C")
    z = next((zn for zn in state["hvac_zones"] if zn["id"] == zone_id), None)
    if not z:
        raise HTTPException(400, "Unknown HVAC zone")
    z["setpoint"] = round(setpoint, 1); z["state"] = "NORMAL"
    return {"zone_id": zone_id, "setpoint": z["setpoint"]}


@register_action("building", "hvac.disable")
def _building_hvac_disable(state, params):
    zone_id = params.get("zone_id")
    z = next((zn for zn in state["hvac_zones"] if zn["id"] == zone_id), None)
    if not z:
        raise HTTPException(400, "Unknown HVAC zone")
    z["enabled"] = False; z["state"] = "OFFLINE"; z["load"] = 0
    return {"zone_id": zone_id, "enabled": False}


@register_action("building", "hvac.enable")
def _building_hvac_enable(state, params):
    zone_id = params.get("zone_id")
    z = next((zn for zn in state["hvac_zones"] if zn["id"] == zone_id), None)
    if not z:
        raise HTTPException(400, "Unknown HVAC zone")
    z["enabled"] = True; z["state"] = "NORMAL"
    return {"zone_id": zone_id, "enabled": True}


@register_action("building", "elevator.maintenance")
def _building_lift_maint(state, params):
    lift_id = params.get("elevator_id")
    l = next((el for el in state["elevators"] if el["id"] == lift_id), None)
    if not l:
        raise HTTPException(400, "Unknown elevator")
    l["maintenance"] = True; l["state"] = "MAINTENANCE"
    return {"elevator_id": lift_id, "state": "MAINTENANCE"}


@register_action("building", "elevator.restore")
def _building_lift_restore(state, params):
    lift_id = params.get("elevator_id")
    l = next((el for el in state["elevators"] if el["id"] == lift_id), None)
    if not l:
        raise HTTPException(400, "Unknown elevator")
    l["maintenance"] = False; l["state"] = "moving"
    return {"elevator_id": lift_id, "state": "moving"}


@register_action("building", "door.lock")
def _building_door_lock(state, params):
    door_id = params.get("door_id"); locked = bool(params.get("locked", True))
    d = next((dr for dr in state["access_doors"] if dr["id"] == door_id), None)
    if not d:
        raise HTTPException(400, "Unknown door")
    d["locked"] = locked; d["last_swipe"] = _now()
    return {"door_id": door_id, "locked": locked}


# ------- Industrial actions -------
@register_action("industrial", "machine.stop")
def _ind_machine_stop(state, params):
    mid = params.get("machine_id")
    m = next((mm for mm in state["machines"] if mm["id"] == mid), None)
    if not m:
        raise HTTPException(400, "Unknown machine")
    m["status"] = "stopped"; m["state"] = "OFFLINE"
    return {"machine_id": mid, "status": "stopped"}


@register_action("industrial", "machine.maintenance")
def _ind_machine_maint(state, params):
    mid = params.get("machine_id")
    m = next((mm for mm in state["machines"] if mm["id"] == mid), None)
    if not m:
        raise HTTPException(400, "Unknown machine")
    m["status"] = "maintenance"; m["state"] = "MAINTENANCE"; m["maintenance_due_days"] = 0
    return {"machine_id": mid, "status": "maintenance"}


@register_action("industrial", "machine.restart")
def _ind_machine_restart(state, params):
    mid = params.get("machine_id")
    m = next((mm for mm in state["machines"] if mm["id"] == mid), None)
    if not m:
        raise HTTPException(400, "Unknown machine")
    m["status"] = "running"; m["state"] = "NORMAL"
    return {"machine_id": mid, "status": "running"}


@register_action("industrial", "line.offline")
def _ind_line_offline(state, params):
    lid = params.get("line_id")
    l = next((ln for ln in state["lines"] if ln["id"] == lid), None)
    if not l:
        raise HTTPException(400, "Unknown line")
    l["offline"] = True; l["state"] = "OFFLINE"; l["throughput"] = 0
    return {"line_id": lid, "state": "OFFLINE"}


@register_action("industrial", "line.restore")
def _ind_line_restore(state, params):
    lid = params.get("line_id")
    l = next((ln for ln in state["lines"] if ln["id"] == lid), None)
    if not l:
        raise HTTPException(400, "Unknown line")
    l["offline"] = False; l["state"] = "NORMAL"; l["throughput"] = 80
    return {"line_id": lid, "state": "NORMAL"}


# ------- Energy actions -------
@register_action("energy", "substation.isolate")
def _energy_sub_isolate(state, params):
    sid = params.get("substation_id")
    s = next((ss for ss in state["substations"] if ss["id"] == sid), None)
    if not s:
        raise HTTPException(400, "Unknown substation")
    s["isolated"] = True; s["load_mw"] = 0; s["state"] = "OFFLINE"
    # Cascade: transformers + feeders under it go offline
    for t in state["transformers"]:
        if t["substation"] == sid:
            t["state"] = "OFFLINE"; t["load_mva"] = 0
    for f in state["feeders"]:
        if f["substation"] == sid:
            f["state"] = "OFFLINE"; f["load_kw"] = 0; f["energized"] = False
    return {"substation_id": sid, "isolated": True, "cascaded": True}


@register_action("energy", "substation.restore")
def _energy_sub_restore(state, params):
    sid = params.get("substation_id")
    s = next((ss for ss in state["substations"] if ss["id"] == sid), None)
    if not s:
        raise HTTPException(400, "Unknown substation")
    s["isolated"] = False; s["load_mw"] = 60; s["state"] = "NORMAL"
    for f in state["feeders"]:
        if f["substation"] == sid:
            f["energized"] = True; f["state"] = "NORMAL"
    return {"substation_id": sid, "restored": True}


@register_action("energy", "transformer.offline")
def _energy_tr_offline(state, params):
    tid = params.get("transformer_id")
    t = next((tt for tt in state["transformers"] if tt["id"] == tid), None)
    if not t:
        raise HTTPException(400, "Unknown transformer")
    t["status"] = "offline"; t["state"] = "OFFLINE"; t["load_mva"] = 0
    return {"transformer_id": tid, "state": "OFFLINE"}


@register_action("energy", "transformer.restore")
def _energy_tr_restore(state, params):
    tid = params.get("transformer_id")
    t = next((tt for tt in state["transformers"] if tt["id"] == tid), None)
    if not t:
        raise HTTPException(400, "Unknown transformer")
    t["status"] = "online"; t["state"] = "NORMAL"
    return {"transformer_id": tid, "state": "NORMAL"}


@register_action("energy", "feeder.deenergize")
def _energy_feed_off(state, params):
    fid = params.get("feeder_id")
    f = next((ff for ff in state["feeders"] if ff["id"] == fid), None)
    if not f:
        raise HTTPException(400, "Unknown feeder")
    f["energized"] = False; f["state"] = "OFFLINE"; f["load_kw"] = 0
    return {"feeder_id": fid, "energized": False}


@register_action("energy", "feeder.energize")
def _energy_feed_on(state, params):
    fid = params.get("feeder_id")
    f = next((ff for ff in state["feeders"] if ff["id"] == fid), None)
    if not f:
        raise HTTPException(400, "Unknown feeder")
    f["energized"] = True; f["state"] = "NORMAL"
    return {"feeder_id": fid, "energized": True}


# ------- Water actions -------
@register_action("water", "valve.close")
def _water_valve_close(state, params):
    vid = params.get("valve_id")
    v = next((vv for vv in state["valves"] if vv["id"] == vid), None)
    if not v:
        raise HTTPException(400, "Unknown valve")
    v["open"] = False; v["flow_lps"] = 0; v["state"] = "OFFLINE"
    # Cascade: downstream segments lose pressure
    for seg in state["pipeline_segments"]:
        if seg["id"] in params.get("cascade_segments", []):
            seg["flow_lps"] = 0; seg["pressure_bar"] = 0; seg["state"] = "OFFLINE"
    return {"valve_id": vid, "open": False}


@register_action("water", "valve.open")
def _water_valve_open(state, params):
    vid = params.get("valve_id")
    v = next((vv for vv in state["valves"] if vv["id"] == vid), None)
    if not v:
        raise HTTPException(400, "Unknown valve")
    v["open"] = True; v["flow_lps"] = 500; v["state"] = "NORMAL"
    return {"valve_id": vid, "open": True}


@register_action("water", "pump.stop")
def _water_pump_stop(state, params):
    pid = params.get("pump_id")
    p = next((pp for pp in state["pumps"] if pp["id"] == pid), None)
    if not p:
        raise HTTPException(400, "Unknown pump")
    p["status"] = "stopped"; p["state"] = "OFFLINE"; p["flow_lps"] = 0
    return {"pump_id": pid, "status": "stopped"}


@register_action("water", "pump.start")
def _water_pump_start(state, params):
    pid = params.get("pump_id")
    p = next((pp for pp in state["pumps"] if pp["id"] == pid), None)
    if not p:
        raise HTTPException(400, "Unknown pump")
    p["status"] = "running"; p["state"] = "NORMAL"; p["flow_lps"] = 260
    return {"pump_id": pid, "status": "running"}


# ============================================================
# History buffers per domain (rolling 60min)
# ============================================================
HISTORY: Dict[str, Deque[Dict[str, Any]]] = {d: deque(maxlen=HISTORY_MAX) for d in INITIALIZERS}


def record_history(domain: str, state: Dict[str, Any]) -> None:
    """Snapshot each tick with a lightweight copy for replay."""
    import copy
    HISTORY[domain].append({
        "tick": state["tick"], "at": _now(),
        "kpis": KPI_FNS[domain](state),
        "scenario": state["scenario"], "running": state["running"],
        # Store a deep copy so mutations later don't affect the snapshot
        "state": copy.deepcopy(state),
    })


def history_slice(domain: str, minutes: int = 60) -> List[Dict[str, Any]]:
    buf = HISTORY.get(domain)
    if not buf:
        return []
    max_frames = min(len(buf), max(1, int(minutes * 60 / 2)))
    return list(buf)[-max_frames:]


# ============================================================
# Router
# ============================================================
class SimCmd(BaseModel):
    running: Optional[bool] = None
    scenario: Optional[str] = None


class ActionCmd(BaseModel):
    action: str
    params: Dict[str, Any] = {}


def build_twins_router(store_getter: Callable[[], Dict[str, Any]],
                       broadcaster: Optional[Callable[[str, Any], Any]] = None,
                       auditor: Optional[Callable] = None,
                       user_dep: Optional[Callable] = None) -> APIRouter:
    router = APIRouter(prefix="/api")
    from fastapi import Depends

    def _resolve_user_dep():
        if user_dep is None:
            async def _no_op(): return None
            return _no_op
        return user_dep

    def _user_domains(user) -> List[str]:
        if not user:
            return []
        role = user.get("role", "viewer")
        try:
            from auth import ROLES as _ROLES  # lazy import to avoid cycle
            return _ROLES.get(role, {}).get("domains", []) or user.get("domains", []) or []
        except Exception:
            return user.get("domains", []) or []

    def _guard_read(user, domain: str):
        if user is None:
            # Hard-fail: never silently allow anonymous access.
            raise HTTPException(status_code=401, detail="Authentication required for twin data.")
        domains = _user_domains(user)
        if "*" in domains or domain in domains:
            return
        raise HTTPException(status_code=403,
            detail=f"Your role does not permit access to '{domain}' domain data.")

    def _guard_mutate(user, domain: str):
        _guard_read(user, domain)
        if user and user.get("role") == "viewer":
            raise HTTPException(status_code=403, detail="Viewer role cannot execute operator actions.")

    # Expose the guards so server.py can reuse them for traffic + AIRA endpoints
    router._guard_read = _guard_read           # type: ignore[attr-defined]
    router._guard_mutate = _guard_mutate       # type: ignore[attr-defined]
    router._user_domains = _user_domains       # type: ignore[attr-defined]

    @router.get("/domains")
    async def list_domains():
        return [DOMAINS[k] for k in ("traffic", "hospital", "building", "industrial", "energy", "water")]

    @router.get("/domains/{domain_id}")
    async def get_domain(domain_id: str):
        if domain_id not in DOMAINS:
            raise HTTPException(status_code=404, detail="Domain not found")
        return DOMAINS[domain_id]

    @router.get("/twins/{domain}")
    async def twin_snapshot(domain: str, user=Depends(_resolve_user_dep())):
        _guard_read(user, domain)
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
    async def twin_state(domain: str, user=Depends(_resolve_user_dep())):
        return await twin_snapshot(domain, user=user)

    @router.get("/twins/{domain}/events")
    async def twin_events(domain: str, user=Depends(_resolve_user_dep())):
        _guard_read(user, domain)
        if domain == "traffic":
            return []
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        return store[domain].get("events", [])

    @router.get("/twins/{domain}/alerts")
    async def twin_alerts(domain: str, user=Depends(_resolve_user_dep())):
        _guard_read(user, domain)
        if domain == "traffic":
            return []
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        return store[domain].get("alerts", [])

    @router.get("/twins/{domain}/history")
    async def twin_history(domain: str, minutes: int = 60, user=Depends(_resolve_user_dep())):
        _guard_read(user, domain)
        if domain not in HISTORY:
            raise HTTPException(status_code=404, detail="Domain has no history")
        frames = history_slice(domain, minutes)
        return {"domain": domain, "minutes": minutes, "frame_count": len(frames),
                "first_at": frames[0]["at"] if frames else None,
                "last_at": frames[-1]["at"] if frames else None,
                "frames": frames}

    @router.get("/twins/{domain}/history/frame")
    async def twin_history_frame(domain: str, index: int, user=Depends(_resolve_user_dep())):
        _guard_read(user, domain)
        frames = history_slice(domain, 60)
        if not frames:
            raise HTTPException(status_code=404, detail="No history yet")
        idx = max(0, min(len(frames) - 1, index))
        return frames[idx]

    @router.get("/twins/{domain}/actions")
    async def twin_actions(domain: str):
        return {"domain": domain, "actions": sorted(ACTION_HANDLERS.get(domain, {}).keys())}

    @router.post("/twins/{domain}/action")
    async def twin_action(domain: str, cmd: ActionCmd, user=Depends(_resolve_user_dep())):
        _guard_mutate(user, domain)
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        handlers = ACTION_HANDLERS.get(domain, {})
        handler = handlers.get(cmd.action)
        if not handler:
            raise HTTPException(status_code=400, detail=f"Unknown action '{cmd.action}' for domain '{domain}'. Available: {sorted(handlers.keys())}")
        state = store[domain]
        result = handler(state, cmd.params or {})
        evt = {"id": _uid("EVT"), "domain": domain, "type": f"action.{cmd.action}",
               "severity": "INFO", "at": _now(),
               "description": f"Operator action {cmd.action} executed",
               "params": cmd.params, "result": result, "twin_id": next(iter((cmd.params or {}).values()), "-")}
        state.setdefault("events", []).insert(0, evt)
        state["events"] = state["events"][:60]
        if auditor:
            try:
                await auditor(action=f"twin.{domain}.{cmd.action}", target=str(evt["twin_id"]),
                              meta={"params": cmd.params, "result": result})
            except Exception:
                pass
        if broadcaster:
            try:
                await broadcaster("twin_action", {"domain": domain, "action": cmd.action, "params": cmd.params, "result": result, "at": _now()})
                await broadcaster("domain_snapshot", {"domain": domain, "state": state,
                                                     "kpis": KPI_FNS[domain](state),
                                                     "tick": state["tick"], "scenario": state["scenario"],
                                                     "running": state["running"]})
            except Exception:
                pass
        return {"ok": True, "domain": domain, "action": cmd.action, "result": result, "event": evt}

    @router.post("/twins/{domain}/simulation")
    async def sim_control(domain: str, cmd: SimCmd, user=Depends(_resolve_user_dep())):
        _guard_mutate(user, domain)
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
    async def sim_reset(domain: str, user=Depends(_resolve_user_dep())):
        _guard_mutate(user, domain)
        store = store_getter()
        if domain not in store:
            raise HTTPException(status_code=404, detail="Domain not found")
        store[domain] = INITIALIZERS[domain]()
        HISTORY[domain].clear()
        return {"domain": domain, "reset": True, "at": _now()}

    @router.get("/data-sources")
    async def data_sources():
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
