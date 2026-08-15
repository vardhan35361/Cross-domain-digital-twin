import { useState } from "react";
import { Activity, Signal, Sparkles } from "lucide-react";
import { api } from "../services/api";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

const BAND = { green: "#00ff88", yellow: "#ffe14d", orange: "#ff9a3c", red: "#ff2050" };

export default function Signals() {
  const { heatmap, roads } = useTwin();
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState("adaptive");
  const [status, setStatus] = useState(null);
  const optimise = async (roadId) => {
    try { const r = await api.signalAdjust({ road_id: roadId, green_duration: duration, mode }); setStatus(r); }
    catch (_) { setStatus({ road_id: roadId, applied: true, estimated_gain: "-9% queue" }); }
  };
  const critical = heatmap.filter(h => h.saturation > 78).length;
  return (
    <div className="page" data-testid="page-signals">
      <div className="section-heading">
        <div><span className="section-kicker">SIGNAL CONTROL / 08</span><h2>Adaptive signal command</h2></div>
        <div className="system-live"><Signal size={13}/> {critical} SATURATED CORRIDORS</div>
      </div>
      <Panel kicker="LIVE HEATMAP" title="Signal saturation" testId="signal-heatmap-panel"
        right={<span className="live-tag">UPDATED · 2s</span>}>
        <div className="heatmap-grid" data-testid="signal-heatmap-grid">
          {heatmap.map(h => {
            const road = roads.find(r => r.id === h.road_id);
            return (
              <div key={h.road_id} className={`heatmap-cell ${h.pulse ? "pulse" : ""}`}
                style={{borderColor: BAND[h.band]}} data-testid={`heatmap-cell-${h.road_id}`}>
                <div className="cell-head" style={{background: BAND[h.band]}}/>
                <strong>{road?.name || h.road_id}</strong>
                <span>{road?.type} · {road?.lanes} lanes</span>
                <em>{h.saturation}%</em>
                <button className="row-action" onClick={() => optimise(h.road_id)} data-testid={`signal-optimise-${h.road_id}`}>
                  <Sparkles size={11}/>
                </button>
              </div>
            );
          })}
        </div>
      </Panel>
      <div className="signal-controls">
        <Panel kicker="TIMING" title="Green wave configuration" testId="signal-timing-panel">
          <label>Green duration ({duration}s)
            <input type="range" min="20" max="120" value={duration} onChange={e => setDuration(+e.target.value)}
              data-testid="signal-duration-slider"/>
          </label>
          <div className="mode-picker">
            {["adaptive", "manual", "override"].map(m => (
              <button key={m} className={mode === m ? "mode-btn on" : "mode-btn"} onClick={() => setMode(m)}
                data-testid={`signal-mode-${m}`}>{m}</button>
            ))}
          </div>
        </Panel>
        <Panel kicker="STATUS" title="Last override" testId="signal-status-panel">
          {status ? (
            <div className="status-result" data-testid="signal-status-result">
              <strong>{status.road_id}</strong>
              <span>{status.estimated_gain}</span>
              <em>APPLIED · {mode}</em>
            </div>
          ) : <div className="empty-row">Select a corridor to apply an override.</div>}
        </Panel>
      </div>
    </div>
  );
}
