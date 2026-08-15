import { useEffect, useState } from "react";
import { FastForward, Pause, Play, Radio, Rewind } from "lucide-react";
import { api } from "../services/api";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

export default function Replay() {
  const { corridors } = useTwin();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  useEffect(() => { (async () => { setLoading(true); try { setHistory(await api.corridorList()); } catch (_) { setHistory(corridors); } finally { setLoading(false); } })(); }, [corridors]);
  useEffect(() => {
    if (!playing || !detail?.frames?.length) return;
    const id = setInterval(() => setT(prev => Math.min(detail.frames.length - 1, prev + rate)), 500);
    return () => clearInterval(id);
  }, [playing, rate, detail]);
  const load = async (route_id) => {
    setSelected(route_id); setT(0); setPlaying(false);
    try { setDetail(await api.corridorDetail(route_id)); } catch (_) { setDetail(null); }
  };
  return (
    <div className="page" data-testid="page-replay">
      <div className="section-heading">
        <div><span className="section-kicker">REPLAY / 09</span><h2>Timeline & corridor playback</h2></div>
        <div className="system-live"><Radio size={13}/> LAST 60 MINUTES</div>
      </div>
      <div className="replay-grid">
        <Panel kicker="CORRIDORS" title="Recorded operations" testId="replay-list-panel">
          {loading && (
            <div data-testid="replay-loading-skeleton">
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton-row"><span className="skeleton-line" style={{width:"70%"}}/><span className="skeleton-line" style={{width:"40%"}}/></div>
              ))}
            </div>
          )}
          {!loading && history.length === 0 && <div className="empty-row">No corridor operations recorded yet.</div>}
          {!loading && history.map(c => (
            <button key={c.route_id} className={selected === c.route_id ? "replay-row on" : "replay-row"}
              onClick={() => load(c.route_id)} data-testid={`replay-row-${c.route_id}`}>
              <div><strong>{c.route_id}</strong><span>{c.vehicle_type} · {c.origin} → {c.destination}</span></div>
              <em>{c.frames || 0} frames</em>
            </button>
          ))}
        </Panel>
        <Panel kicker="PLAYBACK" title={detail ? detail.route_id : "Select a corridor"} testId="replay-player-panel">
          {detail ? (
            <>
              <div className="replay-info">
                <span>Recorded {new Date(detail.recorded_at).toLocaleTimeString()}</span>
                <strong>{detail.vehicle_type} · ETA {detail.eta_minutes} min · {detail.distance_km} km</strong>
              </div>
              <div className="replay-timeline">
                <input type="range" min="0" max={(detail.frames?.length || 1) - 1} value={t}
                  onChange={e => setT(+e.target.value)} data-testid="replay-timeline-slider"/>
                <div className="timeline-labels"><span>T-0</span><span>frame {t + 1} / {detail.frames?.length || 0}</span></div>
              </div>
              <div className="replay-controls">
                <button className="control-btn" onClick={() => setT(Math.max(0, t - 1))} data-testid="replay-rewind-button"><Rewind size={12}/></button>
                <button className="control-btn primary" onClick={() => setPlaying(p => !p)} data-testid="replay-play-button">
                  {playing ? <Pause size={12}/> : <Play size={12}/>} {playing ? "PAUSE" : "PLAY"}
                </button>
                <button className="control-btn" onClick={() => setRate(r => (r === 4 ? 1 : r * 2))} data-testid="replay-fastforward-button">
                  <FastForward size={12}/> {rate}×
                </button>
              </div>
              <div className="replay-frame" data-testid="replay-frame">
                <span>PROGRESS</span>
                <div className="bar"><span style={{width: `${((t + 1) / (detail.frames?.length || 1)) * 100}%`}}/></div>
                <em>{Math.round(((t + 1) / (detail.frames?.length || 1)) * 100)}%</em>
              </div>
            </>
          ) : <div className="empty-row">Select a corridor to view its playback.</div>}
        </Panel>
      </div>
    </div>
  );
}
