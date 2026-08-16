import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Building2, Cpu, Droplet, Factory, Hospital, Play, Pause, RotateCcw, Zap } from "lucide-react";
import { api } from "../services/api";
import { Panel, Metric } from "../shared/Panel";
import DomainScene from "../scene/DomainScene";

const ICONS = { traffic: Cpu, hospital: Hospital, building: Building2,
                industrial: Factory, energy: Zap, water: Droplet };

const STATE_COLOR = { NORMAL: "#00ff88", WARNING: "#ffb703", CRITICAL: "#ff2050", OFFLINE: "#6f8b9f", MAINTENANCE: "#58a6ff" };

export default function DomainTwin() {
  const { domain } = useParams();
  const nav = useNavigate();
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState("");
  const [wsStatus, setWsStatus] = useState("CONNECTING");
  const wsRef = useRef(null);

  useEffect(() => {
    setSnap(null); setError("");
    // Initial REST snapshot for immediate render
    api.twin(domain).then(setSnap).catch(e => setError(e?.response?.data?.detail || e.message || "Domain not available"));

    // Live WebSocket subscription — receives {kind:'domain_snapshot', data:{domain,state,kpis,tick,scenario,running}}
    const wsUrl = `${(process.env.REACT_APP_BACKEND_URL || "").replace(/^http/, "ws")}/api/ws/traffic`;
    let alive = true;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => alive && setWsStatus("CONNECTED");
      ws.onclose = () => alive && setWsStatus("DISCONNECTED");
      ws.onerror = () => alive && setWsStatus("DISCONNECTED");
      ws.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.kind === "domain_snapshot" && msg.data?.domain === domain) {
            setSnap(prev => ({
              domain,
              definition: prev?.definition,
              state: msg.data.state,
              kpis: msg.data.kpis,
              tick: msg.data.tick,
              scenario: msg.data.scenario,
              running: msg.data.running,
              updated_at: new Date().toISOString(),
            }));
          }
        } catch (_) { /* noop */ void 0; }
      };
    } catch (_) {
      setWsStatus("DISCONNECTED");
    }
    return () => { alive = false; try { wsRef.current?.close(); } catch (_) { void 0; } };
  }, [domain]);

  if (error) return <div className="page" data-testid="page-domain-error"><div className="empty-row"><AlertCircle size={14}/> {error}</div></div>;
  if (!snap) return <div className="page" data-testid="page-domain-loading"><div className="skeleton-row"><span className="skeleton-line"/></div></div>;

  const Icon = ICONS[domain] || Cpu;
  const control = async (payload) => { try { await api.domainSimControl(domain, payload); } catch (_) { void 0; } };
  const reset = async () => { try { await api.domainSimReset(domain); } catch (_) { void 0; } };

  const kpiEntries = Object.entries(snap.kpis || {});
  const state = snap.state || {};
  const def = snap.definition || {};

  return (
    <div className="page" data-testid={`page-twin-${domain}`}>
      <div className="section-heading">
        <div><span className="section-kicker">{def.name?.toUpperCase()} DIGITAL TWIN</span>
          <h2><Icon size={22} style={{marginRight:8, verticalAlign:"middle"}}/> {def.name}</h2></div>
        <div className="system-live" data-testid="domain-ws-status">
          <span className={`pulse-dot ${wsStatus === "CONNECTED" ? "" : "muted"}`}/>
          {wsStatus} · TICK {snap.tick} · {snap.scenario}
        </div>
      </div>
      <Panel kicker="3D DIGITAL TWIN" title={`${def.name} spatial model`} testId="domain-twin-3d"
        right={<span className="live-tag">{wsStatus}</span>}>
        <div className="twin-canvas" data-testid={`domain-3d-${domain}`}>
          <DomainScene domain={domain} state={state}/>
        </div>
      </Panel>
      <div className="metrics-grid" data-testid="domain-kpis">
        {kpiEntries.slice(0, 5).map(([k, v]) => (
          <Metric key={k} label={k.replaceAll("_", " ")} value={v} tone={k.includes("alert") ? "red" : k.includes("occup") ? "amber" : "cyan"}/>
        ))}
      </div>
      <div className="settings-grid">
        <Panel kicker="SIMULATION" title="Scenario control" testId="domain-sim-panel">
          <div className="scenario-buttons">
            {(def.scenarios || []).map(s => (
              <button key={s} onClick={() => control({scenario: s})}
                className={snap.scenario === s ? "scenario active" : "scenario"}
                data-testid={`domain-scenario-${s.split(" ")[0].toLowerCase()}`}>{s}</button>
            ))}
          </div>
          <div className="convoy-controls">
            <button className="control-btn" onClick={() => control({running: !snap.running})} data-testid="domain-sim-toggle">
              {snap.running ? <><Pause size={12}/> PAUSE</> : <><Play size={12}/> RESUME</>}
            </button>
            <button className="control-btn danger" onClick={reset} data-testid="domain-sim-reset">
              <RotateCcw size={12}/> RESET
            </button>
          </div>
        </Panel>
        <Panel kicker="ALERTS" title="Live alerts" testId="domain-alerts-panel">
          {(state.alerts || []).length === 0 && <div className="empty-row">No active alerts.</div>}
          {(state.alerts || []).slice(0, 6).map(a => (
            <div key={a.id} className="alert-row" data-testid={`domain-alert-${a.id}`}>
              <span className="alert-icon" style={{color: STATE_COLOR[a.severity] || "#ff2050"}}><AlertCircle size={14}/></span>
              <div><strong>{a.severity} <i>{a.twin_id}</i></strong><span>{a.message}</span></div>
              <em className="severity">{new Date(a.at).toLocaleTimeString([], {hour12:false})}</em>
            </div>
          ))}
        </Panel>
        <Panel kicker="EVENTS" title="Event feed" testId="domain-events-panel">
          {(state.events || []).length === 0 && <div className="empty-row">No recent events.</div>}
          {(state.events || []).slice(0, 6).map(e => (
            <div key={e.id} className="alert-row" data-testid={`domain-event-${e.id}`}>
              <span className="alert-icon"><AlertCircle size={14}/></span>
              <div><strong>{e.type} <i>{e.twin_id}</i></strong><span>{e.description}</span></div>
              <em className="severity">{e.severity}</em>
            </div>
          ))}
        </Panel>
      </div>
      <DomainEntities domain={domain} state={state} />
    </div>
  );
}

function DomainEntities({ domain, state }) {
  if (domain === "hospital") return <HospitalEntities state={state}/>;
  if (domain === "building") return <BuildingEntities state={state}/>;
  if (domain === "industrial") return <IndustrialEntities state={state}/>;
  if (domain === "energy") return <EnergyEntities state={state}/>;
  if (domain === "water") return <WaterEntities state={state}/>;
  return null;
}

function StatePill({ value }) {
  return <em className="chip" style={{color: STATE_COLOR[value] || "#00ff88", borderColor: STATE_COLOR[value] || "#00ff88"}}>{value}</em>;
}

function HospitalEntities({ state }) {
  return (
    <div className="analytics-grid">
      <Panel kicker="DEPARTMENTS" title="Bed occupancy" testId="hospital-departments-panel">
        <div className="table-head" style={{gridTemplateColumns: "1.4fr 90px 90px 90px 90px"}}>
          <span>DEPT</span><span>OCC</span><span>BEDS</span><span>QUEUE</span><span>STATE</span>
        </div>
        {(state.depts || []).map(d => (
          <div key={d.id} className="table-row" style={{gridTemplateColumns: "1.4fr 90px 90px 90px 90px"}} data-testid={`hospital-dept-${d.id}`}>
            <div><strong>{d.name}</strong><span>Floor {d.floor}</span></div>
            <span>{d.occupied}</span><span>{d.beds}</span><span>{d.queue}</span><StatePill value={d.state}/>
          </div>
        ))}
      </Panel>
      <Panel kicker="EQUIPMENT" title="Devices" testId="hospital-equipment-panel">
        {(state.equipment || []).map(e => (
          <div key={e.id} className="corridor-log-row" data-testid={`hospital-eq-${e.id}`}>
            <div><strong>{e.name}</strong><span>{e.type} · {e.dept}</span></div>
            <StatePill value={e.status === "operational" ? "NORMAL" : "CRITICAL"}/>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function BuildingEntities({ state }) {
  return (
    <div className="analytics-grid">
      <Panel kicker="FLOORS" title="Occupancy + climate" testId="building-floors-panel">
        <div className="table-head" style={{gridTemplateColumns: "1fr 100px 100px 100px 100px"}}>
          <span>FLOOR</span><span>OCC %</span><span>TEMP °C</span><span>HUM %</span><span>STATE</span>
        </div>
        {(state.floors || []).map(f => (
          <div key={f.id} className="table-row" style={{gridTemplateColumns: "1fr 100px 100px 100px 100px"}} data-testid={`building-floor-${f.id}`}>
            <div><strong>{f.name}</strong><span>{f.rooms} rooms</span></div>
            <span>{f.occupancy}%</span><span>{f.temperature}</span><span>{f.humidity}</span><StatePill value={f.state}/>
          </div>
        ))}
      </Panel>
      <Panel kicker="SYSTEMS" title="HVAC + elevators" testId="building-systems-panel">
        <div className="corridor-log-row"><div><strong>HVAC</strong><span>Setpoint {state.hvac?.setpoint}°C</span></div><StatePill value={state.hvac?.state}/></div>
        {(state.elevators || []).map(l => (
          <div key={l.id} className="corridor-log-row" data-testid={`building-elev-${l.id}`}>
            <div><strong>{l.id.toUpperCase()}</strong><span>Floor {l.current_floor} · {l.load} pax</span></div>
            <StatePill value={l.state === "moving" ? "NORMAL" : "MAINTENANCE"}/>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function IndustrialEntities({ state }) {
  return (
    <Panel kicker="PRODUCTION" title="Lines + sensors" testId="industrial-lines-panel">
      <div className="table-head" style={{gridTemplateColumns: "1.4fr 100px 100px 100px 90px"}}>
        <span>LINE</span><span>THROUGHPUT</span><span>OUTPUT</span><span>UPTIME</span><span>STATE</span>
      </div>
      {(state.lines || []).map(l => (
        <div key={l.id} className="table-row" style={{gridTemplateColumns: "1.4fr 100px 100px 100px 90px"}} data-testid={`industrial-line-${l.id}`}>
          <div><strong>{l.name}</strong><span>{l.id}</span></div>
          <span>{l.throughput}%</span><span>{l.output_units}</span><span>{l.uptime_percent}%</span><StatePill value={l.state}/>
        </div>
      ))}
    </Panel>
  );
}

function EnergyEntities({ state }) {
  return (
    <Panel kicker="GRID" title="Substations + generation" testId="energy-grid-panel">
      <div className="table-head" style={{gridTemplateColumns: "1.4fr 100px 100px 90px"}}>
        <span>SUBSTATION</span><span>LOAD MW</span><span>VOLTAGE</span><span>STATE</span>
      </div>
      {(state.substations || []).map(s => (
        <div key={s.id} className="table-row" style={{gridTemplateColumns: "1.4fr 100px 100px 90px"}} data-testid={`energy-sub-${s.id}`}>
          <div><strong>{s.name}</strong><span>{s.id}</span></div>
          <span>{s.load_mw}</span><span>{s.voltage_kv} kV</span><StatePill value={s.state}/>
        </div>
      ))}
      <div className="dispatch-grid" style={{padding: "12px 20px 18px"}}>
        <span>SOLAR<strong>{state.generation?.solar_mw} MW</strong></span>
        <span>WIND<strong>{state.generation?.wind_mw} MW</strong></span>
        <span>GRID<strong>{state.generation?.grid_mw} MW</strong></span>
        <span>BATTERY<strong>{state.generation?.battery_percent}%</strong></span>
      </div>
    </Panel>
  );
}

function WaterEntities({ state }) {
  return (
    <div className="analytics-grid">
      <Panel kicker="RESERVOIRS" title="Storage levels" testId="water-reservoirs-panel">
        {(state.reservoirs || []).map(r => (
          <div key={r.id} className="corridor-log-row" data-testid={`water-res-${r.id}`}>
            <div><strong>{r.name}</strong><span>{r.level_percent}% full</span></div>
            <StatePill value={r.state}/>
          </div>
        ))}
      </Panel>
      <Panel kicker="PUMPS" title="Distribution flow" testId="water-pumps-panel">
        {(state.pumps || []).map(p => (
          <div key={p.id} className="corridor-log-row" data-testid={`water-pump-${p.id}`}>
            <div><strong>{p.id.toUpperCase()}</strong><span>{p.flow_lps} L/s</span></div>
            <StatePill value={p.state}/>
          </div>
        ))}
      </Panel>
    </div>
  );
}
