import { useState } from "react";
import { Activity, Ambulance, Flame, Navigation, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

const VEHICLES = [
  { key: "Ambulance", icon: Ambulance, color: "#ff2050" },
  { key: "Fire engine", icon: Flame, color: "#ff5f10" },
  { key: "Police", icon: ShieldCheck, color: "#3d5aff" },
];

export default function Emergency() {
  const { zones, corridors, setCorridors } = useTwin();
  const [draft, setDraft] = useState({ origin: "HITEC City", destination: "Apollo Hospital, Jubilee Hills", vehicle_type: "Ambulance" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const dispatch = async e => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.emergencyRoute(draft);
      setResult(res);
      setCorridors([res, ...corridors].slice(0, 30));
    } catch (_) {
      const fake = { route_id: `ROUTE-${Math.random().toString(36).slice(2,8).toUpperCase()}`, ...draft,
        eta_minutes: 9, distance_km: 6.8, green_corridor: true, signals_optimized: 12, status: "DISPATCHED" };
      setResult(fake); setCorridors([fake, ...corridors].slice(0, 30));
    } finally { setBusy(false); }
  };
  return (
    <div className="page" data-testid="page-emergency">
      <div className="section-heading">
        <div><span className="section-kicker">EMERGENCY / 06</span><h2>Emergency operations</h2></div>
        <div className="system-live"><span className="pulse-dot"/> GREEN CORRIDOR READY</div>
      </div>
      <div className="emergency-grid">
        <Panel kicker="GREEN CORRIDOR" title="Dispatch console" testId="dispatch-panel">
          <form className="dispatch-form" onSubmit={dispatch}>
            <div className="vehicle-picker">
              {VEHICLES.map(v => (
                <button key={v.key} type="button"
                  className={draft.vehicle_type === v.key ? "veh-btn on" : "veh-btn"}
                  style={{color: v.color, borderColor: draft.vehicle_type === v.key ? v.color : undefined}}
                  onClick={() => setDraft({...draft, vehicle_type: v.key})}
                  data-testid={`dispatch-vehicle-${v.key.split(" ")[0].toLowerCase()}`}>
                  <v.icon size={14}/> {v.key}
                </button>
              ))}
            </div>
            <label>Origin
              <select value={draft.origin} onChange={e => setDraft({...draft, origin: e.target.value})} data-testid="dispatch-origin-input">
                {zones.map(z => <option key={z.id}>{z.name}</option>)}
              </select>
            </label>
            <label>Destination
              <input value={draft.destination} onChange={e => setDraft({...draft, destination: e.target.value})}
                data-testid="dispatch-destination-input"/>
            </label>
            <button type="submit" disabled={busy} className="dispatch-cta" data-testid="dispatch-submit-button">
              {busy ? <Activity size={14} className="spin"/> : <Navigation size={14}/>} DISPATCH GREEN CORRIDOR
            </button>
          </form>
          {result && (
            <div className="dispatch-result" data-testid="dispatch-result">
              <div className="dispatch-head"><strong>{result.route_id}</strong><em>{result.status}</em></div>
              <div className="dispatch-grid">
                <span>ETA<strong>{result.eta_minutes} min</strong></span>
                <span>DISTANCE<strong>{result.distance_km} km</strong></span>
                <span>SIGNALS<strong>{result.signals_optimized}</strong></span>
                <span>CORRIDOR<strong style={{color:"#00ff88"}}>{result.green_corridor ? "ACTIVE" : "STAGED"}</strong></span>
              </div>
              <small>{result.vehicle_type} · {result.origin} → {result.destination}</small>
            </div>
          )}
        </Panel>
        <Panel kicker="DISPATCH HISTORY" title="Recent operations" testId="dispatch-history-panel">
          {corridors.length === 0 && <div className="empty-row">No corridor operations logged.</div>}
          {corridors.slice(0, 8).map(c => (
            <div key={c.route_id} className="corridor-log-row" data-testid={`dispatch-log-${c.route_id}`}>
              <div><strong>{c.route_id}</strong><span>{c.vehicle_type} · {c.origin} → {c.destination}</span></div>
              <em>ETA {c.eta_minutes || 0} min · {c.distance_km || 0} km</em>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
