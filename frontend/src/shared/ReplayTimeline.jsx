import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { Panel, Chip } from "./Panel";

/** 60-minute replay scrubber. Loads history frames from backend and applies
 * the selected frame's state/kpis via onFrame(frame). */
export default function ReplayTimeline({ domain, onFrame, minutes = 60, testIdPrefix = "replay" }) {
  const [frames, setFrames] = useState([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const h = domain === "traffic" ? await api.trafficHistory(minutes) : await api.twinHistory(domain, minutes);
      setFrames(h.frames || []);
      setIdx((h.frames || []).length - 1);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [domain, minutes]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (playing && frames.length) {
      timerRef.current = setInterval(() => {
        setIdx(i => {
          if (i >= frames.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }, Math.max(50, 1000 / speed));
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed, frames.length]);

  useEffect(() => {
    if (frames[idx]) onFrame?.(frames[idx]);
    // eslint-disable-next-line
  }, [idx, frames]);

  const current = frames[idx];
  const rawEvents = frames.slice(0, idx + 1).flatMap(f => (f.state?.events || []).slice(0, 3))
    .filter(e => e?.type?.startsWith("action."));
  const events = Array.from(new Map(rawEvents.map(e => [e.id || `${e.type}-${e.at}`, e])).values()).slice(-8);

  return (
    <Panel kicker={`${domain.toUpperCase()} · REPLAY`} title={`60-minute historical playback`}
      testId={`${testIdPrefix}-panel`}
      right={<div style={{display:"flex", gap:8, alignItems:"center"}}>
        <Chip tone={loading ? "amber" : error ? "red" : "cyan"}>{loading ? "Loading" : error ? "Error" : `${frames.length} frames`}</Chip>
        <button className="op-btn op-btn-slate op-btn-sm" onClick={load} data-testid={`${testIdPrefix}-refresh`}>Refresh</button>
      </div>}
    >
      {error && <div className="empty-cell" data-testid={`${testIdPrefix}-error`}>Replay error: {error}</div>}
      {!error && (
        <div className="replay-body">
          <div className="replay-controls">
            <button className="op-btn op-btn-cyan op-btn-sm" onClick={() => setPlaying(p => !p)}
              disabled={!frames.length} data-testid={`${testIdPrefix}-play`}>
              {playing ? "Pause" : "Play"}
            </button>
            <button className="op-btn op-btn-slate op-btn-sm" onClick={() => setIdx(0)} data-testid={`${testIdPrefix}-start`}>«</button>
            <button className="op-btn op-btn-slate op-btn-sm" onClick={() => setIdx(i => Math.max(0, i-1))} data-testid={`${testIdPrefix}-prev`}>‹</button>
            <button className="op-btn op-btn-slate op-btn-sm" onClick={() => setIdx(i => Math.min(frames.length-1, i+1))} data-testid={`${testIdPrefix}-next`}>›</button>
            <button className="op-btn op-btn-slate op-btn-sm" onClick={() => setIdx(frames.length-1)} data-testid={`${testIdPrefix}-end`}>»</button>
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="replay-speed" data-testid={`${testIdPrefix}-speed`}>
              <option value={0.5}>0.5×</option><option value={1}>1×</option>
              <option value={2}>2×</option><option value={4}>4×</option><option value={8}>8×</option>
            </select>
            <span className="replay-ts" data-testid={`${testIdPrefix}-timestamp`}>
              {current ? new Date(current.at || current.time).toLocaleTimeString() : "—"}
            </span>
          </div>
          <input type="range" min={0} max={Math.max(0, frames.length-1)} value={idx}
            onChange={e => setIdx(Number(e.target.value))}
            className="replay-slider" data-testid={`${testIdPrefix}-slider`} />
          <div className="replay-meta">
            <span>Frame {idx+1} / {frames.length}</span>
            {current?.scenario && <Chip tone="cyan">Scenario: {current.scenario}</Chip>}
            {current?.kpis && Object.entries(current.kpis).slice(0, 5).map(([k, v]) =>
              <Chip key={k} tone="slate">{k.replace(/_/g, " ")}: {typeof v === "number" ? v.toFixed?.(1) ?? v : v}</Chip>
            )}
          </div>
          {events.length > 0 && (
            <div className="replay-events" data-testid={`${testIdPrefix}-events`}>
              <span className="section-kicker">OPERATOR ACTIONS IN THIS WINDOW</span>
              {events.map((e, i) => (
                <div key={e.id || i} className="replay-event">
                  <Chip tone="amber">{e.type}</Chip>
                  <span>{new Date(e.at).toLocaleTimeString()}</span>
                  <em>{e.description}</em>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
