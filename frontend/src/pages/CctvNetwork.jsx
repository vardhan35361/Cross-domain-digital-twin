import { useEffect, useMemo, useState } from "react";
import { Camera, Circle, Filter, Maximize2 } from "lucide-react";
import { api } from "../services/api";
import { Panel } from "../shared/Panel";
import { DroneCanvas } from "../scene/DroneCanvas";

export default function CctvNetwork() {
  const [cameras, setCameras] = useState([]);
  const [filter, setFilter] = useState("all");
  const [focus, setFocus] = useState(null);
  useEffect(() => { api.cameras().then(setCameras).catch(() => void 0); }, []);
  const zones = useMemo(() => Array.from(new Set(cameras.map(c => c.zone))).sort(), [cameras]);
  const visible = filter === "all" ? cameras : cameras.filter(c => c.zone === filter);
  return (
    <div className="page" data-testid="page-cctv">
      <div className="section-heading">
        <div><span className="section-kicker">CCTV NETWORK / 13</span><h2>Camera surveillance grid</h2></div>
        <div className="system-live"><Circle size={10} fill="#00ff88" color="#00ff88"/> {cameras.filter(c => c.status === "online").length} / {cameras.length} ONLINE</div>
      </div>
      <div className="cctv-toolbar">
        <span><Filter size={12}/> Zone</span>
        <button className={filter === "all" ? "zone-chip on" : "zone-chip"} onClick={() => setFilter("all")} data-testid="cctv-filter-all">ALL</button>
        {zones.map(z => (
          <button key={z} className={filter === z ? "zone-chip on" : "zone-chip"}
            onClick={() => setFilter(z)} data-testid={`cctv-filter-${z.split(" ")[0].toLowerCase()}`}>{z}</button>
        ))}
      </div>
      <div className="cctv-grid" data-testid="cctv-grid">
        {visible.map(c => (
          <div key={c.id} className="cctv-card" data-testid={`cctv-card-${c.id}`}>
            <DroneCanvas seed={c.id} playing={c.status === "online"} label={c.id.toUpperCase()}/>
            <div className="cctv-meta">
              <div>
                <strong>{c.location}</strong>
                <span>{c.type} · {c.resolution}</span>
              </div>
              <div className="cctv-actions">
                <span className={`chip chip-${c.status === "online" ? "green" : "amber"}`}>{c.status}</span>
                {c.recording && <span className="chip chip-amber"><Circle size={7} fill="#ff2050" color="#ff2050"/> REC</span>}
                <button className="row-action" onClick={() => setFocus(c)} data-testid={`cctv-open-${c.id}`}><Maximize2 size={11}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {focus && (
        <div className="modal-backdrop" onClick={() => setFocus(null)} data-testid="cctv-modal">
          <div className="cctv-modal" onClick={e => e.stopPropagation()}>
            <div className="panel-head">
              <div><span className="section-kicker">FULLSCREEN FEED</span><h2>{focus.location}</h2></div>
              <button className="icon-btn" onClick={() => setFocus(null)} data-testid="cctv-close-button">✕</button>
            </div>
            <div className="cctv-modal-body">
              <DroneCanvas seed={focus.id + "-full"} playing hero label={focus.id.toUpperCase()}/>
              <div className="cctv-modal-meta">
                <span><Camera size={13}/> {focus.location}</span>
                <span>{focus.zone} · {focus.type}</span>
                <span>{focus.resolution} · {focus.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
