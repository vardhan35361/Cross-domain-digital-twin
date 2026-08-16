import { Link } from "react-router-dom";
import { AlertTriangle, Fuel, LineChart as LC, Sun, TowerControl, Wrench, Zap } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Panel } from "../../shared/Panel";
import { KpiGrid, EntityTable, ActionButton, StateBadge } from "../../shared/Workspace";
import { useDomainSnapshot } from "../../shared/useDomainSnapshot";
import DomainScene from "../../scene/DomainScene";
import ReplayTimeline from "../../shared/ReplayTimeline";

const DOMAIN = "energy";
function Loader() { return <div className="page" data-testid="workspace-loading"><div className="skeleton-row"><span className="skeleton-line"/></div></div>; }
function ErrorRow({ error }) { return <div className="page" data-testid="workspace-error"><div className="empty-row"><AlertTriangle size={14}/> {error}</div></div>; }

export function EnergyOverview() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const { kpis } = snap;
  const tiles = [
    { to: "/energy/substations", label: "Substations", icon: TowerControl, stat: `${kpis.substations_online} online` },
    { to: "/energy/transformers", label: "Transformers", icon: Wrench, stat: `${kpis.transformers_online} online` },
    { to: "/energy/feeders", label: "Feeders", icon: LC, stat: `${kpis.feeders_online} energised` },
    { to: "/energy/renewables", label: "Solar & wind", icon: Sun, stat: `${kpis.renewable_mw} MW` },
    { to: "/energy/battery", label: "Battery", icon: Fuel, stat: `${kpis.battery_percent}%` },
  ];
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-overview">
      <KpiGrid items={[
        { label: "Grid load", value: kpis.total_load_mw, suffix: "MW", tone: "cyan", icon: Zap },
        { label: "Renewables", value: kpis.renewable_mw, suffix: "MW", tone: "cyan" },
        { label: "Solar", value: kpis.solar_mw, suffix: "MW", tone: "amber" },
        { label: "Wind", value: kpis.wind_mw, suffix: "MW", tone: "cyan" },
        { label: "Battery", value: kpis.battery_percent, suffix: "%", tone: "cyan" },
        { label: "Substations online", value: kpis.substations_online, tone: "cyan" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="MODULES" title="Grid operations"><div className="module-grid" data-testid="energy-modules">
          {tiles.map(t => (<Link key={t.to} to={t.to} className="module-tile" data-testid={`module-tile-${t.label.toLowerCase().replaceAll(' ','-')}`}>
            <t.icon size={20}/><strong>{t.label}</strong><span>{t.stat}</span></Link>))}
        </div></Panel>
        <Panel kicker="3D GRID" title="Digital twin"><div style={{height: 360}}><DomainScene domain="energy" state={snap.state}/></div></Panel>
      </div>
    </div>
  );
}

export function EnergySubstations() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const subs = snap.state.substations || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-substations">
      <KpiGrid items={[
        { label: "Substations", value: subs.length, tone: "cyan", icon: TowerControl },
        { label: "Online", value: subs.filter(s=>!s.isolated).length, tone: "cyan" },
        { label: "Isolated", value: subs.filter(s=>s.isolated).length, tone: "red" },
        { label: "Peak load", value: Math.max(...subs.map(s=>s.load_mw)), suffix: "MW", tone: "amber" },
      ]}/>
      <Panel kicker="SUBSTATION FLEET" title="High-voltage substations">
        <EntityTable testId="substations-table" rows={subs} columns={[
          { key: "name", label: "Substation", flex: 1.3 },
          { key: "voltage_kv", label: "Voltage", flex: 0.6, render: r => `${r.voltage_kv} kV` },
          { key: "load_mw", label: "Load", flex: 0.7, render: r => `${r.load_mw} MW` },
          { key: "capacity_mw", label: "Capacity", flex: 0.8, render: r => `${r.capacity_mw} MW` },
          { key: "load_pct", label: "Utilisation", flex: 1, render: r => (
            <div className="mini-bar"><div style={{width: `${(r.load_mw/r.capacity_mw)*100}%`, background: r.load_mw/r.capacity_mw>0.85?"#ff2050":"#00e0ff"}}/></div>
          )},
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.6, align: "right", render: r => r.isolated ? (
            <ActionButton domain="energy" action="substation.restore" params={{substation_id: r.id}} label="Restore" tone="cyan" size="xs" testId={`sub-restore-${r.id}`}/>
          ) : (
            <ActionButton domain="energy" action="substation.isolate" params={{substation_id: r.id}} label="Isolate" tone="red" size="xs"
              confirm={`Isolate ${r.name}? This will cascade to downstream transformers and feeders.`} testId={`sub-isolate-${r.id}`}/>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function EnergyTransformers() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const trs = snap.state.transformers || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-transformers">
      <KpiGrid items={[
        { label: "Transformers", value: trs.length, tone: "cyan", icon: Wrench },
        { label: "Online", value: trs.filter(t=>t.status==="online").length, tone: "cyan" },
        { label: "Overheating", value: trs.filter(t=>t.temperature_c>90).length, tone: "red" },
        { label: "Peak load", value: Math.max(...trs.map(t=>t.load_mva)), suffix: "MVA", tone: "amber" },
      ]}/>
      <Panel kicker="TRANSFORMERS" title="Transformer control">
        <EntityTable testId="transformers-table" rows={trs} columns={[
          { key: "name", label: "Transformer", flex: 1.2 },
          { key: "substation", label: "Parent", flex: 0.8 },
          { key: "load_mva", label: "Load", flex: 0.7, render: r => `${r.load_mva} MVA` },
          { key: "temperature_c", label: "Temp", flex: 0.6, render: r => `${r.temperature_c}°C` },
          { key: "oil_level_percent", label: "Oil", flex: 0.6, render: r => `${r.oil_level_percent}%` },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.4, align: "right", render: r => r.status === "online" ? (
            <ActionButton domain="energy" action="transformer.offline" params={{transformer_id: r.id}} label="Take offline" tone="amber" size="xs" testId={`tr-off-${r.id}`}/>
          ) : (
            <ActionButton domain="energy" action="transformer.restore" params={{transformer_id: r.id}} label="Restore" tone="cyan" size="xs" testId={`tr-on-${r.id}`}/>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function EnergyFeeders() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const feeders = snap.state.feeders || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-feeders">
      <KpiGrid items={[
        { label: "Feeders", value: feeders.length, tone: "cyan", icon: LC },
        { label: "Energised", value: feeders.filter(f=>f.energized).length, tone: "cyan" },
        { label: "Customers served", value: feeders.reduce((s,f)=>s+f.customers,0), tone: "cyan" },
        { label: "Total load", value: Math.round(feeders.reduce((s,f)=>s+f.load_kw,0)), suffix: "kW", tone: "amber" },
      ]}/>
      <Panel kicker="FEEDERS" title="Distribution feeders">
        <EntityTable testId="feeders-table" rows={feeders} columns={[
          { key: "name", label: "Feeder", flex: 1.3 },
          { key: "substation", label: "Sub", flex: 0.7 },
          { key: "customers", label: "Customers", flex: 0.9 },
          { key: "load_kw", label: "Load", flex: 0.8, render: r => `${r.load_kw} kW` },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.4, align: "right", render: r => r.energized ? (
            <ActionButton domain="energy" action="feeder.deenergize" params={{feeder_id: r.id}} label="De-energise" tone="amber" size="xs"
              confirm={`Cut power to ${r.customers} customers on ${r.name}?`} testId={`feed-off-${r.id}`}/>
          ) : (
            <ActionButton domain="energy" action="feeder.energize" params={{feeder_id: r.id}} label="Energise" tone="cyan" size="xs" testId={`feed-on-${r.id}`}/>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function EnergyRenewables() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const solar = snap.state.solar_arrays || [];
  const wind = snap.state.wind_turbines || [];
  const mix = [...solar.map(s => ({ name: s.name, kind: "solar", mw: s.output_mw })),
               ...wind.map(w => ({ name: w.name, kind: "wind", mw: w.output_mw }))];
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-renewables">
      <KpiGrid items={[
        { label: "Solar farms", value: solar.length, tone: "amber", icon: Sun },
        { label: "Solar output", value: solar.reduce((s,x)=>s+x.output_mw,0).toFixed(1), suffix: "MW", tone: "amber" },
        { label: "Wind turbines", value: wind.length, tone: "cyan" },
        { label: "Wind output", value: wind.reduce((s,x)=>s+x.output_mw,0).toFixed(1), suffix: "MW", tone: "cyan" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="RENEWABLE ASSETS" title="Site-level output">
          <EntityTable testId="renewables-table" rows={mix} columns={[
            { key: "name", label: "Asset", flex: 1.3 },
            { key: "kind", label: "Kind", flex: 0.6 },
            { key: "mw", label: "Output", flex: 0.7, render: r => `${r.mw?.toFixed(1)} MW` },
          ]}/>
        </Panel>
        <Panel kicker="OUTPUT" title="Live output chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mix}>
              <XAxis dataKey="name" stroke="#8ba3c7" fontSize={10}/><YAxis stroke="#8ba3c7"/>
              <Tooltip contentStyle={{background:"#0d1a2b", border:"1px solid #1e3a5f"}}/>
              <Bar dataKey="mw" fill="#ffb703"/>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

export function EnergyBattery() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const g = snap.state.generation || {};
  const forecast = snap.state.load_forecast || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-battery">
      <KpiGrid items={[
        { label: "Battery SoC", value: g.battery_percent, suffix: "%", tone: "cyan", icon: Fuel },
        { label: "Rated power", value: g.battery_mw, suffix: "MW", tone: "cyan" },
        { label: "Flow", value: g.battery_flow, tone: g.battery_flow === "discharging" ? "amber" : "cyan" },
        { label: "Grid supply", value: g.grid_mw, suffix: "MW", tone: "cyan" },
      ]}/>
      <Panel kicker="24H LOAD FORECAST" title="Predicted grid demand">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={forecast}>
            <XAxis dataKey="hour" stroke="#8ba3c7"/><YAxis stroke="#8ba3c7"/>
            <Tooltip contentStyle={{background:"#0d1a2b", border:"1px solid #1e3a5f"}}/>
            <Area type="monotone" dataKey="load_mw" stroke="#00e0ff" fill="#00e0ff33"/>
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

export function EnergyAlerts() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-alerts">
      <Panel kicker="EVENTS" title="Recent grid events">
        <EntityTable testId="energy-events-table" rows={snap.state.events || []} empty="No events yet"
          columns={[
            { key: "type", label: "Type", flex: 1.2 },
            { key: "description", label: "Description", flex: 2 },
            { key: "at", label: "Time", flex: 0.9, render: r => new Date(r.at).toLocaleTimeString() },
          ]}/>
      </Panel>
    </div>
  );
}

export function EnergyReplay() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-replay">
      <ReplayTimeline domain={DOMAIN} testIdPrefix="energy-replay" onFrame={f => snap.applyReplayFrame?.(f)}/>
      <Panel kicker="3D VIEW" title={`Grid state ${snap.isReplay ? "@ replay" : "· live"}`}
        right={<button className="op-btn op-btn-slate op-btn-sm" onClick={() => snap.clearReplay()} data-testid="replay-back-to-live">Back to live</button>}>
        <div style={{height: 380}}><DomainScene domain="energy" state={snap.state}/></div>
      </Panel>
    </div>
  );
}

export function EnergyTwin() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-energy-twin">
      <Panel kicker="FULL 3D MODEL" title="Interactive grid twin">
        <div style={{height: 520}}><DomainScene domain="energy" state={snap.state}/></div>
      </Panel>
    </div>
  );
}
