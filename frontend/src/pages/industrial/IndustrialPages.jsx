import { Link } from "react-router-dom";
import { AlertTriangle, Cog, Factory, FlaskConical, Gauge, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Panel } from "../../shared/Panel";
import { KpiGrid, EntityTable, ActionButton, StateBadge } from "../../shared/Workspace";
import { useDomainSnapshot } from "../../shared/useDomainSnapshot";
import DomainScene from "../../scene/DomainScene";
import ReplayTimeline from "../../shared/ReplayTimeline";

const DOMAIN = "industrial";
function Loader() { return <div className="page" data-testid="workspace-loading"><div className="skeleton-row"><span className="skeleton-line"/></div></div>; }
function ErrorRow({ error }) { return <div className="page" data-testid="workspace-error"><div className="empty-row"><AlertTriangle size={14}/> {error}</div></div>; }

export function IndustrialOverview() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const { kpis } = snap;
  const tiles = [
    { to: "/domains/industrial/lines", label: "Production lines", icon: Factory, stat: `${kpis.active_lines} active` },
    { to: "/domains/industrial/machines", label: "Machines", icon: Cog, stat: `${kpis.machines_running}/${kpis.machines_total} running` },
    { to: "/domains/industrial/sensors", label: "Sensors", icon: Gauge, stat: `${kpis.sensor_warnings} warnings` },
    { to: "/domains/industrial/quality", label: "Quality", icon: FlaskConical, stat: `${kpis.yield_percent}% yield` },
    { to: "/domains/industrial/safety", label: "Safety", icon: ShieldCheck, stat: `${snap.state.safety?.ppe_compliance}% PPE` },
  ];
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-overview">
      <KpiGrid items={[
        { label: "Avg throughput", value: kpis.average_throughput, suffix: "%", tone: "cyan", icon: Factory },
        { label: "Machines running", value: `${kpis.machines_running}/${kpis.machines_total}`, tone: "cyan" },
        { label: "Yield", value: kpis.yield_percent, suffix: "%", tone: "cyan" },
        { label: "Defect rate", value: kpis.defect_rate_ppm, suffix: "ppm", tone: "amber" },
        { label: "Sensor warnings", value: kpis.sensor_warnings, tone: kpis.sensor_warnings>0?"amber":"cyan" },
        { label: "Total output", value: kpis.total_output, tone: "cyan" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="MODULES" title="Plant operations"><div className="module-grid" data-testid="industrial-modules">
          {tiles.map(t => (<Link key={t.to} to={t.to} className="module-tile" data-testid={`module-tile-${t.label.toLowerCase().replaceAll(' ','-')}`}>
            <t.icon size={20}/><strong>{t.label}</strong><span>{t.stat}</span></Link>))}
        </div></Panel>
        <Panel kicker="3D FACTORY" title="Digital twin"><div style={{height: 360}}><DomainScene domain="industrial" state={snap.state}/></div></Panel>
      </div>
    </div>
  );
}

export function IndustrialLines() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const lines = snap.state.lines || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-lines">
      <KpiGrid items={[
        { label: "Lines", value: lines.length, tone: "cyan", icon: Factory },
        { label: "Active", value: lines.filter(l=>!l.offline).length, tone: "cyan" },
        { label: "Offline", value: lines.filter(l=>l.offline).length, tone: "red" },
        { label: "Total output", value: lines.reduce((s,l)=>s+l.output_units,0), tone: "cyan" },
      ]}/>
      <Panel kicker="PRODUCTION LINES" title="Line control">
        <EntityTable testId="lines-table" rows={lines} columns={[
          { key: "name", label: "Line", flex: 1.2 },
          { key: "throughput", label: "Throughput", flex: 0.8, render: r => `${r.throughput}%` },
          { key: "output_units", label: "Output", flex: 0.8 },
          { key: "target_units", label: "Target", flex: 0.8 },
          { key: "operators", label: "Ops", flex: 0.5 },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.4, align: "right", render: r => r.offline ? (
            <ActionButton domain="industrial" action="line.restore" params={{line_id: r.id}} label="Restore" tone="cyan" size="xs" testId={`line-restore-${r.id}`}/>
          ) : (
            <ActionButton domain="industrial" action="line.offline" params={{line_id: r.id}} label="Take offline" tone="amber" size="xs" confirm={`Halt ${r.name}?`} testId={`line-off-${r.id}`}/>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function IndustrialMachines() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const machines = snap.state.machines || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-machines">
      <KpiGrid items={[
        { label: "Machines total", value: machines.length, tone: "cyan", icon: Cog },
        { label: "Running", value: machines.filter(m=>m.status==="running").length, tone: "cyan" },
        { label: "Stopped", value: machines.filter(m=>m.status==="stopped").length, tone: "red" },
        { label: "Maintenance", value: machines.filter(m=>m.status==="maintenance").length, tone: "amber" },
        { label: "Overheating", value: machines.filter(m=>m.temperature>90).length, tone: "amber" },
      ]}/>
      <Panel kicker="MACHINE FLEET" title="Individual machine control">
        <EntityTable testId="machines-table" rows={machines} columns={[
          { key: "name", label: "Machine", flex: 1.3 },
          { key: "line", label: "Line", flex: 0.6 },
          { key: "temperature", label: "Temp", flex: 0.6, render: r => `${r.temperature}°C` },
          { key: "vibration_hz", label: "Vib", flex: 0.6, render: r => `${r.vibration_hz} Hz` },
          { key: "utilization", label: "Util", flex: 0.6, render: r => `${r.utilization}%` },
          { key: "cycles_today", label: "Cycles", flex: 0.7 },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 2, align: "right", render: r => (
            <div style={{display:"flex", gap:6, justifyContent:"flex-end", flexWrap:"wrap"}}>
              {r.status !== "running" && <ActionButton domain="industrial" action="machine.restart" params={{machine_id: r.id}} label="Start" tone="cyan" size="xs" testId={`mach-start-${r.id}`}/>}
              {r.status === "running" && <ActionButton domain="industrial" action="machine.stop" params={{machine_id: r.id}} label="Stop" tone="amber" size="xs" testId={`mach-stop-${r.id}`}/>}
              {r.status !== "maintenance" && <ActionButton domain="industrial" action="machine.maintenance" params={{machine_id: r.id}} label="Maint" tone="amber" size="xs" testId={`mach-maint-${r.id}`}/>}
            </div>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function IndustrialSensors() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const sensors = snap.state.sensors || [];
  const trend = sensors.map(s => ({ name: s.id, value: s.value }));
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-sensors">
      <KpiGrid items={[
        { label: "Sensors online", value: sensors.length, tone: "cyan", icon: Gauge },
        { label: "Warnings", value: sensors.filter(s=>s.state==="WARNING").length, tone: "amber" },
        { label: "Avg reading", value: Math.round(sensors.reduce((s,x)=>s+x.value,0)/Math.max(1,sensors.length)), tone: "cyan" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="LIVE SENSORS" title="Telemetry feed">
          <EntityTable testId="sensors-table" rows={sensors} columns={[
            { key: "id", label: "Sensor", flex: 0.6 },
            { key: "kind", label: "Kind", flex: 0.8 },
            { key: "machine_id", label: "Machine", flex: 0.8 },
            { key: "value", label: "Reading", flex: 0.8, render: r => `${r.value} ${r.unit}` },
            { key: "state", label: "State", flex: 0.6, render: r => <StateBadge state={r.state}/> },
          ]}/>
        </Panel>
        <Panel kicker="DISTRIBUTION" title="Sensor readings">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trend}>
              <XAxis dataKey="name" stroke="#8ba3c7"/><YAxis stroke="#8ba3c7"/>
              <Tooltip contentStyle={{background:"#0d1a2b", border:"1px solid #1e3a5f"}}/>
              <Bar dataKey="value" fill="#00e0ff"/>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

export function IndustrialQuality() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const q = snap.state.quality || {};
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-quality">
      <KpiGrid items={[
        { label: "Yield", value: q.yield_percent, suffix: "%", tone: "cyan", icon: FlaskConical },
        { label: "Defect rate", value: q.defect_rate_ppm, suffix: "ppm", tone: "amber" },
        { label: "Batches today", value: q.batches_today, tone: "cyan" },
        { label: "Inspections passed", value: q.inspections_pass, tone: "cyan" },
        { label: "Inspections failed", value: q.inspections_fail, tone: "red" },
        { label: "ISO 9001 compliance", value: q.iso9001_compliance, suffix: "%", tone: "cyan" },
      ]}/>
      <Panel kicker="QC METRICS" title="Recent quality performance">
        <p className="dim">Last audit: {q.last_audit && new Date(q.last_audit).toLocaleString()}</p>
      </Panel>
    </div>
  );
}

export function IndustrialSafety() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const s = snap.state.safety || {};
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-safety">
      <KpiGrid items={[
        { label: "Incidents this month", value: s.incidents_this_month, tone: s.incidents_this_month>0?"red":"cyan", icon: ShieldCheck },
        { label: "Days since incident", value: s.last_incident_days_ago, tone: "cyan" },
        { label: "PPE compliance", value: s.ppe_compliance, suffix: "%", tone: "cyan" },
        { label: "Open audits", value: s.audits_open, tone: "amber" },
      ]}/>
    </div>
  );
}

export function IndustrialAlerts() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-alerts">
      <Panel kicker="EVENTS" title="Recent plant events">
        <EntityTable testId="industrial-events-table" rows={snap.state.events || []} empty="No events yet"
          columns={[
            { key: "type", label: "Type", flex: 1.2 },
            { key: "description", label: "Description", flex: 2 },
            { key: "at", label: "Time", flex: 0.9, render: r => new Date(r.at).toLocaleTimeString() },
          ]}/>
      </Panel>
    </div>
  );
}

export function IndustrialReplay() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-replay">
      <ReplayTimeline domain={DOMAIN} testIdPrefix="industrial-replay" onFrame={f => snap.applyReplayFrame?.(f)}/>
      <Panel kicker="3D VIEW" title={`Plant state ${snap.isReplay ? "@ replay" : "· live"}`}
        right={<button className="op-btn op-btn-slate op-btn-sm" onClick={() => snap.clearReplay()} data-testid="replay-back-to-live">Back to live</button>}>
        <div style={{height: 380}}><DomainScene domain="industrial" state={snap.state}/></div>
      </Panel>
    </div>
  );
}

export function IndustrialTwin() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-industrial-twin">
      <Panel kicker="FULL 3D MODEL" title="Interactive plant twin">
        <div style={{height: 520}}><DomainScene domain="industrial" state={snap.state}/></div>
      </Panel>
    </div>
  );
}
