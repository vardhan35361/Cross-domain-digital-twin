import { useEffect, useRef, useState } from "react";
import { Battery, Camera, Focus, Move3D, Pause, Play, Signal } from "lucide-react";
import { api } from "../services/api";
import { Panel } from "../shared/Panel";
import { DroneCanvas } from "../scene/DroneCanvas";

export default function DroneSurveillance() {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [ptz, setPtz] = useState({ yaw: 0, pitch: 0, zoom: 1 });
  const [playing, setPlaying] = useState(true);
  useEffect(() => { setLoading(true); api.drones().then(d => { setDrones(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const focus = selected || drones[0];
  const control = (key, delta) => setPtz(p => ({...p, [key]: Math.min(3, Math.max(-45, p[key] + delta))}));
  return (
    <div className="page" data-testid="page-drones">
      <div className="section-heading">
        <div><span className="section-kicker">DRONE SURVEILLANCE / 12</span><h2>Aerial monitoring grid</h2></div>
        <div className="system-live"><span className="pulse-dot"/> {drones.filter(d => d.status === "streaming").length} DRONES STREAMING</div>
      </div>
      <div className="drone-grid">
        <Panel kicker="LIVE FEEDS" title="Surveillance grid" testId="drone-grid-panel">
          {loading && (
            <div data-testid="drone-loading-skeleton" style={{padding: "0 16px 16px"}}>
              <div className="skeleton-row"><span className="skeleton-line"/><span className="skeleton-line" style={{width: "60%"}}/></div>
              <div className="skeleton-row"><span className="skeleton-line"/><span className="skeleton-line" style={{width: "50%"}}/></div>
            </div>
          )}
          <div className="drone-tiles">
            {drones.map(d => (
              <button key={d.id} className={`drone-tile ${focus?.id === d.id ? "on" : ""}`}
                onClick={() => setSelected(d)} data-testid={`drone-tile-${d.callsign}`}>
                <DroneCanvas seed={d.id} playing={playing} ptz={focus?.id === d.id ? ptz : {yaw:0, pitch:0, zoom:1}} label={d.callsign}/>
                <div className="drone-caption">
                  <span><Camera size={11}/> {d.callsign} · {d.zone}</span>
                  <em>{d.resolution} · alt {d.altitude_m}m</em>
                </div>
              </button>
            ))}
          </div>
        </Panel>
        <Panel kicker="ACTIVE FEED" title={focus ? `${focus.callsign} · ${focus.zone}` : "Select a drone"} testId="drone-active-panel">
          {focus ? (
            <>
              <div className="drone-active">
                <DroneCanvas seed={focus.id + "-hero"} playing={playing} ptz={ptz} label={focus.callsign} hero/>
              </div>
              <div className="drone-controls">
                <div className="ptz-pad">
                  <button className="control-btn" onClick={() => control("pitch", 3)} data-testid="drone-tilt-up">TILT ↑</button>
                  <div className="ptz-row">
                    <button className="control-btn" onClick={() => control("yaw", -6)} data-testid="drone-pan-left">← PAN</button>
                    <button className="control-btn" onClick={() => control("yaw", 6)} data-testid="drone-pan-right">PAN →</button>
                  </div>
                  <button className="control-btn" onClick={() => control("pitch", -3)} data-testid="drone-tilt-down">TILT ↓</button>
                </div>
                <div className="ptz-actions">
                  <button className="control-btn" onClick={() => control("zoom", 0.2)} data-testid="drone-zoom-in">ZOOM +</button>
                  <button className="control-btn" onClick={() => control("zoom", -0.2)} data-testid="drone-zoom-out">ZOOM −</button>
                  <button className="control-btn" onClick={() => setPtz({yaw:0, pitch:0, zoom:1})} data-testid="drone-recenter">
                    <Focus size={12}/> RECENTER
                  </button>
                  <button className="control-btn primary" onClick={() => setPlaying(p => !p)} data-testid="drone-play-pause">
                    {playing ? <Pause size={12}/> : <Play size={12}/>} {playing ? "PAUSE" : "RESUME"}
                  </button>
                </div>
                <div className="drone-meta">
                  <span><Battery size={12}/> {focus.battery}%</span>
                  <span><Move3D size={12}/> ALT {focus.altitude_m}m</span>
                  <span><Signal size={12}/> LTE-A</span>
                  <span>FOLLOW · {focus.target}</span>
                </div>
              </div>
            </>
          ) : <div className="empty-row">No drone selected.</div>}
        </Panel>
      </div>
    </div>
  );
}
