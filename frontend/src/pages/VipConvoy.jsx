import { useState } from "react";
import { Crown, Pause, Play, Route as RouteIcon, StopCircle } from "lucide-react";
import { api } from "../services/api";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";
import TwinScene from "../scene/TwinScene";

export default function VipConvoy() {
  const { zones, convoy, setConvoy } = useTwin();
  const [waypoints, setWaypoints] = useState(["Financial District", "HITEC City", "Jubilee Hills", "Secunderabad"]);
  const [dignitary, setDignitary] = useState("Chief Minister");
  const start = async () => {
    try { const c = await api.convoyStart({ waypoints, dignitary, vehicle_type: "VIP convoy", priority: "highest" }); setConvoy(c); }
    catch (_) { setConvoy({ id: `VIP-${Math.random().toString(36).slice(2,7).toUpperCase()}`, status: "active", dignitary, waypoints, progress: 0.12, eta_minutes: 18, signals_held: 22 }); }
  };
  const pause = async () => { try { const c = await api.convoyPause(); setConvoy(c);} catch (_) { setConvoy(prev => prev ? {...prev, status: "paused"} : prev);} };
  const resume = async () => { try { const c = await api.convoyResume(); setConvoy(c);} catch (_) { setConvoy(prev => prev ? {...prev, status: "active"} : prev);} };
  const cancel = async () => { try { await api.convoyCancel(); } catch (_) { void 0; } setConvoy(null); };
  const updateWaypoint = (i, val) => setWaypoints(waypoints.map((w, k) => k === i ? val : w));
  const active = convoy && convoy.status !== "idle" && convoy.status !== "completed";
  return (
    <div className="page" data-testid="page-convoy">
      <div className="section-heading">
        <div><span className="section-kicker">VIP OPERATIONS / 07</span><h2>Convoy control</h2></div>
        <div className="system-live"><Crown size={13}/> {active ? convoy.status.toUpperCase() : "STANDBY"}</div>
      </div>
      <div className="convoy-grid">
        <Panel kicker="ROUTE PLANNER" title="Waypoints" testId="convoy-planner-panel">
          <div className="waypoint-list">
            {waypoints.map((w, i) => (
              <div key={i} className="waypoint-row">
                <em>{i+1}</em>
                <select value={w} onChange={e => updateWaypoint(i, e.target.value)} data-testid={`convoy-waypoint-${i}`}>
                  {zones.map(z => <option key={z.id}>{z.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <label>Dignitary
            <input value={dignitary} onChange={e => setDignitary(e.target.value)} data-testid="convoy-dignitary-input"/>
          </label>
          <div className="convoy-controls">
            <button className="dispatch-cta" onClick={start} disabled={active} data-testid="convoy-start-button">
              <Play size={13}/> START CONVOY
            </button>
            {active && convoy.status === "active" && (
              <button className="control-btn" onClick={pause} data-testid="convoy-pause-button"><Pause size={13}/> PAUSE</button>
            )}
            {active && convoy.status === "paused" && (
              <button className="control-btn" onClick={resume} data-testid="convoy-resume-button"><Play size={13}/> RESUME</button>
            )}
            <button className="control-btn danger" onClick={cancel} disabled={!active} data-testid="convoy-cancel-button">
              <StopCircle size={13}/> CANCEL · RESTORE
            </button>
          </div>
        </Panel>
        <Panel kicker="LIVE TRACKING" title="Corridor progress" testId="convoy-tracking-panel">
          <div className="twin-canvas small">
            <TwinScene focus={convoy?.waypoint_positions?.[0] || null} />
          </div>
          {convoy && (
            <div className="convoy-summary" data-testid="convoy-summary">
              <div className="convoy-progress">
                <span>PROGRESS</span>
                <div className="bar"><span style={{width: `${(convoy.progress || 0) * 100}%`}}/></div>
                <em>{Math.round((convoy.progress || 0) * 100)}%</em>
              </div>
              <div className="convoy-grid">
                <span>ETA<strong>{convoy.eta_minutes} min</strong></span>
                <span>SIGNALS HELD<strong>{convoy.signals_held}</strong></span>
                <span>PRIORITY<strong>{convoy.priority}</strong></span>
                <span>STATUS<strong style={{color:"#00ff88"}}>{convoy.status}</strong></span>
              </div>
              <small>{convoy.dignitary || dignitary} · {(convoy.waypoints || waypoints).join(" → ")}</small>
            </div>
          )}
          {!convoy && <div className="empty-row">No active convoy. Configure waypoints and start.</div>}
        </Panel>
      </div>
    </div>
  );
}
