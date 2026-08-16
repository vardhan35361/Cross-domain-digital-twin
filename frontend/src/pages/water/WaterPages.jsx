import { Link } from "react-router-dom";
import { AlertTriangle, Droplets, Lock, Microscope, Waves } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";
import { Panel } from "../../shared/Panel";
import { KpiGrid, EntityTable, ActionButton, StateBadge } from "../../shared/Workspace";
import { useDomainSnapshot } from "../../shared/useDomainSnapshot";
import DomainScene from "../../scene/DomainScene";
import ReplayTimeline from "../../shared/ReplayTimeline";

const DOMAIN = "water";
function Loader() { return <div className="page" data-testid="workspace-loading"><div className="skeleton-row"><span className="skeleton-line"/></div></div>; }
function ErrorRow({ error }) { return <div className="page" data-testid="workspace-error"><div className="empty-row"><AlertTriangle size={14}/> {error}</div></div>; }

export function WaterOverview() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const { kpis } = snap;
  const tiles = [
    { to: "/water/reservoirs", label: "Reservoirs", icon: Droplets, stat: `${kpis.avg_reservoir_percent}% avg` },
    { to: "/water/pumps", label: "Pumps", icon: Waves, stat: `${kpis.pumps_running} running` },
    { to: "/water/valves", label: "Valves & pipelines", icon: Lock, stat: `${kpis.valves_open} open` },
    { to: "/water/quality", label: "Water quality", icon: Microscope, stat: `pH ${kpis.quality_ph}` },
    { to: "/water/leaks", label: "Leak detection", icon: AlertTriangle, stat: `${kpis.leaks_detected} leaks` },
  ];
  return (
    <div className="page domain-workspace" data-testid="workspace-water-overview">
      <KpiGrid items={[
        { label: "Avg reservoir", value: kpis.avg_reservoir_percent, suffix: "%", tone: "cyan", icon: Droplets },
        { label: "Total flow", value: kpis.total_flow_lps, suffix: "L/s", tone: "cyan", icon: Waves },
        { label: "Pumps running", value: kpis.pumps_running, tone: "cyan" },
        { label: "Valves open", value: kpis.valves_open, tone: "cyan" },
        { label: "Leaks detected", value: kpis.leaks_detected, tone: kpis.leaks_detected>0?"red":"cyan" },
        { label: "pH", value: kpis.quality_ph, tone: "cyan" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="MODULES" title="Water operations"><div className="module-grid" data-testid="water-modules">
          {tiles.map(t => (<Link key={t.to} to={t.to} className="module-tile" data-testid={`module-tile-${t.label.toLowerCase().replaceAll(' ','-')}`}>
            <t.icon size={20}/><strong>{t.label}</strong><span>{t.stat}</span></Link>))}
        </div></Panel>
        <Panel kicker="3D NETWORK" title="Digital twin"><div style={{height: 360}}><DomainScene domain="water" state={snap.state}/></div></Panel>
      </div>
    </div>
  );
}

export function WaterReservoirs() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const rs = snap.state.reservoirs || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-water-reservoirs">
      <KpiGrid items={[
        { label: "Reservoirs", value: rs.length, tone: "cyan", icon: Droplets },
        { label: "Total capacity", value: rs.reduce((s,r)=>s+r.capacity_ml,0), suffix: "ML", tone: "cyan" },
        { label: "Below 40%", value: rs.filter(r=>r.level_percent<40).length, tone: "amber" },
      ]}/>
      <Panel kicker="RESERVOIRS" title="Storage levels">
        <EntityTable testId="reservoirs-table" rows={rs} columns={[
          { key: "name", label: "Reservoir", flex: 1 },
          { key: "level_percent", label: "Level", flex: 1.2, render: r => (
            <div className="mini-bar"><div style={{width:`${r.level_percent}%`, background: r.level_percent<40?"#ff2050":"#00e0ff"}}/></div>
          )},
          { key: "capacity_ml", label: "Capacity", flex: 0.8, render: r => `${r.capacity_ml} ML` },
          { key: "inflow_lps", label: "Inflow", flex: 0.7, render: r => `${r.inflow_lps} L/s` },
          { key: "outflow_lps", label: "Outflow", flex: 0.7, render: r => `${r.outflow_lps} L/s` },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
        ]}/>
      </Panel>
    </div>
  );
}

export function WaterPumps() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const ps = snap.state.pumps || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-water-pumps">
      <KpiGrid items={[
        { label: "Pumps total", value: ps.length, tone: "cyan", icon: Waves },
        { label: "Running", value: ps.filter(p=>p.status==="running").length, tone: "cyan" },
        { label: "Stopped", value: ps.filter(p=>p.status==="stopped").length, tone: "red" },
        { label: "Total power", value: ps.reduce((s,p)=>s+p.power_kw,0), suffix: "kW", tone: "amber" },
      ]}/>
      <Panel kicker="PUMP STATIONS" title="Pump control">
        <EntityTable testId="pumps-table" rows={ps} columns={[
          { key: "name", label: "Pump", flex: 1.3 },
          { key: "flow_lps", label: "Flow", flex: 0.7, render: r => `${r.flow_lps} L/s` },
          { key: "power_kw", label: "Power", flex: 0.7, render: r => `${r.power_kw} kW` },
          { key: "vibration", label: "Vibration", flex: 0.7, render: r => `${r.vibration}` },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.4, align: "right", render: r => r.status === "running" ? (
            <ActionButton domain="water" action="pump.stop" params={{pump_id: r.id}} label="Stop" tone="amber" size="xs" confirm={`Stop ${r.name}?`} testId={`pump-stop-${r.id}`}/>
          ) : (
            <ActionButton domain="water" action="pump.start" params={{pump_id: r.id}} label="Start" tone="cyan" size="xs" testId={`pump-start-${r.id}`}/>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function WaterValves() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const vs = snap.state.valves || [];
  const segs = snap.state.pipeline_segments || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-water-valves">
      <KpiGrid items={[
        { label: "Valves", value: vs.length, tone: "cyan", icon: Lock },
        { label: "Open", value: vs.filter(v=>v.open).length, tone: "cyan" },
        { label: "Closed", value: vs.filter(v=>!v.open).length, tone: "amber" },
        { label: "Pipeline segments", value: segs.length, tone: "cyan" },
        { label: "Segments offline", value: segs.filter(s=>s.state==="OFFLINE").length, tone: "red" },
      ]}/>
      <Panel kicker="VALVES" title="Manual valve control">
        <EntityTable testId="valves-table" rows={vs} columns={[
          { key: "name", label: "Valve", flex: 1.5 },
          { key: "open", label: "Position", flex: 0.6, render: r => r.open ? "Open" : "Closed" },
          { key: "flow_lps", label: "Flow", flex: 0.7, render: r => `${r.flow_lps} L/s` },
          { key: "pressure_bar", label: "Pressure", flex: 0.8, render: r => `${r.pressure_bar} bar` },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.4, align: "right", render: r => r.open ? (
            <ActionButton domain="water" action="valve.close" params={{valve_id: r.id}} label="Close valve" tone="amber" size="xs"
              confirm={`Close ${r.name}? Downstream pressure may drop.`} testId={`valve-close-${r.id}`}/>
          ) : (
            <ActionButton domain="water" action="valve.open" params={{valve_id: r.id}} label="Open valve" tone="cyan" size="xs" testId={`valve-open-${r.id}`}/>
          )},
        ]}/>
      </Panel>
      <Panel kicker="PIPELINE SEGMENTS" title="Flow & pressure per segment">
        <EntityTable testId="pipeline-table" rows={segs} columns={[
          { key: "name", label: "Segment", flex: 0.8 },
          { key: "length_km", label: "Length", flex: 0.6, render: r => `${r.length_km} km` },
          { key: "flow_lps", label: "Flow", flex: 0.7, render: r => `${r.flow_lps} L/s` },
          { key: "pressure_bar", label: "Pressure", flex: 0.7, render: r => `${r.pressure_bar} bar` },
          { key: "leak_probability", label: "Leak risk", flex: 0.8, render: r => `${(r.leak_probability*100).toFixed(1)}%` },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
        ]}/>
      </Panel>
    </div>
  );
}

export function WaterQuality() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const q = snap.state.quality || {};
  return (
    <div className="page domain-workspace" data-testid="workspace-water-quality">
      <KpiGrid items={[
        { label: "pH", value: q.ph, tone: q.ph<6.5||q.ph>8?"amber":"cyan", icon: Microscope },
        { label: "Turbidity", value: q.turbidity_ntu, suffix: "NTU", tone: q.turbidity_ntu>2?"amber":"cyan" },
        { label: "Chlorine", value: q.chlorine_ppm, suffix: "ppm", tone: "cyan" },
        { label: "TDS", value: q.tds_ppm, suffix: "ppm", tone: "cyan" },
        { label: "Temperature", value: q.temperature_c, suffix: "°C", tone: "cyan" },
        { label: "Bacteria", value: q.bacteria_check, tone: q.bacteria_check==="PASS"?"cyan":"red" },
      ]}/>
    </div>
  );
}

export function WaterLeaks() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const ls = snap.state.leak_sensors || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-water-leaks">
      <KpiGrid items={[
        { label: "Sensors online", value: ls.length, tone: "cyan", icon: AlertTriangle },
        { label: "Leaks detected", value: ls.filter(s=>s.status==="leak").length, tone: ls.filter(s=>s.status==="leak").length>0?"red":"cyan" },
        { label: "Clear", value: ls.filter(s=>s.status==="clear").length, tone: "cyan" },
      ]}/>
      <Panel kicker="LEAK NETWORK" title="Sensor grid">
        <EntityTable testId="leaks-table" rows={ls} columns={[
          { key: "id", label: "Sensor", flex: 0.8 },
          { key: "location", label: "Location", flex: 1.2 },
          { key: "status", label: "Status", flex: 0.7 },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
        ]}/>
      </Panel>
    </div>
  );
}

export function WaterAlerts() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-water-alerts">
      <Panel kicker="EVENTS" title="Recent water events">
        <EntityTable testId="water-events-table" rows={snap.state.events || []} empty="No events yet"
          columns={[
            { key: "type", label: "Type", flex: 1.2 },
            { key: "description", label: "Description", flex: 2 },
            { key: "at", label: "Time", flex: 0.9, render: r => new Date(r.at).toLocaleTimeString() },
          ]}/>
      </Panel>
    </div>
  );
}

export function WaterReplay() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-water-replay">
      <ReplayTimeline domain={DOMAIN} testIdPrefix="water-replay" onFrame={f => snap.applyReplayFrame?.(f)}/>
      <Panel kicker="3D VIEW" title={`Water state ${snap.isReplay ? "@ replay" : "· live"}`}
        right={<button className="op-btn op-btn-slate op-btn-sm" onClick={() => snap.clearReplay()} data-testid="replay-back-to-live">Back to live</button>}>
        <div style={{height: 380}}><DomainScene domain="water" state={snap.state}/></div>
      </Panel>
    </div>
  );
}

export function WaterTwin() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-water-twin">
      <Panel kicker="FULL 3D MODEL" title="Interactive water network twin">
        <div style={{height: 520}}><DomainScene domain="water" state={snap.state}/></div>
      </Panel>
    </div>
  );
}
