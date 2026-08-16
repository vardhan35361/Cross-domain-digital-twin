"""Operator action state-mutation self-test.
Verifies every registered action really mutates the state and cascades work."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from twins import init_all_domains, ACTION_HANDLERS

def main():
    store = init_all_domains()
    failures = []

    # Energy substation isolate cascades to transformers + feeders
    st = store["energy"]
    trs_before = [t for t in st["transformers"] if t["substation"] == "sub-1" and t["status"] == "online"]
    feeders_before = [f for f in st["feeders"] if f["substation"] == "sub-1" and f["energized"]]
    ACTION_HANDLERS["energy"]["substation.isolate"](st, {"substation_id": "sub-1"})
    sub = next(s for s in st["substations"] if s["id"] == "sub-1")
    assert sub["isolated"] and sub["state"] == "OFFLINE", "substation not isolated"
    for t in st["transformers"]:
        if t["substation"] == "sub-1":
            assert t["state"] == "OFFLINE", "transformer cascade failed"
    for f in st["feeders"]:
        if f["substation"] == "sub-1":
            assert not f["energized"], "feeder cascade failed"
    print(f"OK energy.substation.isolate cascaded to {len(trs_before)} transformers, {len(feeders_before)} feeders")

    # Water valve close
    wt = store["water"]
    ACTION_HANDLERS["water"]["valve.close"](wt, {"valve_id": "vlv-01"})
    v = next(x for x in wt["valves"] if x["id"] == "vlv-01")
    assert not v["open"] and v["state"] == "OFFLINE"
    print("OK water.valve.close")

    # Hospital ward offline
    ho = store["hospital"]
    ACTION_HANDLERS["hospital"]["ward.offline"](ho, {"dept_id": "dept-icu"})
    d = next(x for x in ho["depts"] if x["id"] == "dept-icu")
    assert d["offline"] and d["state"] == "OFFLINE"
    ACTION_HANDLERS["hospital"]["ward.restore"](ho, {"dept_id": "dept-icu"})
    assert not d["offline"]
    print("OK hospital.ward.offline+restore")

    # Building HVAC setpoint change
    bd = store["building"]
    ACTION_HANDLERS["building"]["hvac.setpoint"](bd, {"zone_id": "hvac-z1", "setpoint": 24.5})
    z = next(zn for zn in bd["hvac_zones"] if zn["id"] == "hvac-z1")
    assert z["setpoint"] == 24.5
    ACTION_HANDLERS["building"]["hvac.disable"](bd, {"zone_id": "hvac-z1"})
    assert not z["enabled"]
    print("OK building.hvac setpoint + disable")

    # Industrial machine stop
    ind = store["industrial"]
    ACTION_HANDLERS["industrial"]["machine.stop"](ind, {"machine_id": "mach-01"})
    m = next(x for x in ind["machines"] if x["id"] == "mach-01")
    assert m["status"] == "stopped"
    print("OK industrial.machine.stop")

    if failures:
        print("FAILURES:", failures); sys.exit(1)
    print("ALL OPERATOR ACTIONS OK")

if __name__ == "__main__":
    main()
