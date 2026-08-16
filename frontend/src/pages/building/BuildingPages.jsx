import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Tooltip, AreaChart, Area } from "recharts";
import { AirVent, AlertTriangle, Archive, Building2, KeyRound, ShieldCheck, Zap } from "lucide-react";
import { Panel } from "../../shared/Panel";
import { KpiGrid, EntityTable, ActionButton, StateBadge } from "../../shared/Workspace";
import { useDomainSnapshot } from "../../shared/useDomainSnapshot";
import DomainScene from "../../scene/DomainScene";
import ReplayTimeline from "../../shared/ReplayTimeline";

const DOMAIN = "building";
function Loader() { return <div className="page" data-testid="workspace-loading"><div className="skeleton-row"><span className="skeleton-line"/></div></div>; }
function ErrorRow({ error }) { return <div className="page" data-testid="workspace-error"><div className="empty-row"><AlertTriangle size={14}/> {error}</div></div>; }

export function BuildingOverview() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const { kpis } = snap;
  const tiles = [
    { to: "/domains/building/floors", label: "Floors & occupancy", icon: Building2, stat: `${kpis.average_occupancy}% avg` },
    { to: "/domains/building/hvac", label: "HVAC control", icon: AirVent, stat: `${kpis.hvac_zones_active} zones active` },
    { to: "/domains/building/elevators", label: "Elevators", icon: Archive, stat: `${kpis.elevators_active} moving` },
    { to: "/domains/building/access", label: "Access control", icon: KeyRound, stat: `${kpis.doors_locked} doors locked` },
    { to: "/domains/building/energy", label: "Energy & solar", icon: Zap, stat: `${kpis.energy_kwh} kWh` },
    { to: "/domains/building/safety", label: "Fire & safety", icon: ShieldCheck, stat: kpis.fire_alarm },
  ];
  return (
    <div className="page domain-workspace" data-testid="workspace-building-overview">
      <KpiGrid items={[
        { label: "Avg occupancy", value: kpis.average_occupancy, suffix: "%", tone: "cyan", icon: Building2 },
        { label: "Avg temperature", value: kpis.average_temperature, suffix: "°C", tone: "cyan" },
        { label: "HVAC load", value: kpis.hvac_load, suffix: "%", tone: kpis.hvac_load>80?"amber":"cyan", icon: AirVent },
        { label: "Energy today", value: kpis.energy_kwh, suffix: "kWh", tone: "amber", icon: Zap },
        { label: "Elevators moving", value: kpis.elevators_active, tone: "cyan", icon: Archive },
        { label: "Fire alarm", value: kpis.fire_alarm, tone: kpis.fire_alarm==="clear"?"cyan":"red" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="MODULES" title="Facility ops"><div className="module-grid" data-testid="building-modules">
          {tiles.map(t => (<Link key={t.to} to={t.to} className="module-tile" data-testid={`module-tile-${t.label.toLowerCase().replaceAll(' ','-')}`}>
            <t.icon size={20}/><strong>{t.label}</strong><span>{t.stat}</span></Link>))}
        </div></Panel>
        <Panel kicker="3D BUILDING" title="Digital twin"><div style={{height: 360}}><DomainScene domain="building" state={snap.state}/></div></Panel>
      </div>
    </div>
  );
}

export function BuildingFloors() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const floors = snap.state.floors || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-building-floors">
      <KpiGrid items={[
        { label: "Total floors", value: floors.length, tone: "cyan" },
        { label: "Peak floor occupancy", value: Math.max(...floors.map(f=>f.occupancy)), suffix: "%", tone: "amber" },
        { label: "Hottest floor", value: `${Math.max(...floors.map(f=>f.temperature))}°C`, tone: "amber" },
      ]}/>
      <Panel kicker="ALL FLOORS" title="Room-level occupancy & climate">
        <EntityTable testId="floors-table" rows={floors} columns={[
          { key: "name", label: "Floor", flex: 0.8 },
          { key: "occupancy", label: "Occupancy", flex: 1.2, render: r => (
            <div className="mini-bar"><div style={{width:`${r.occupancy}%`, background: r.occupancy>85?"#ff2050":"#00e0ff"}}/></div>
          )},
          { key: "temperature", label: "Temp", flex: 0.6, render: r => `${r.temperature}°C` },
          { key: "humidity", label: "Humidity", flex: 0.6, render: r => `${r.humidity}%` },
          { key: "rooms", label: "Rooms", flex: 0.5 },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
        ]}/>
      </Panel>
    </div>
  );
}

export function BuildingHVAC() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const zones = snap.state.hvac_zones || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-building-hvac">
      <KpiGrid items={[
        { label: "Zones total", value: zones.length, tone: "cyan", icon: AirVent },
        { label: "Zones enabled", value: zones.filter(z=>z.enabled).length, tone: "cyan" },
        { label: "Peak load", value: Math.max(...zones.map(z=>z.load)), suffix: "%", tone: "amber" },
        { label: "Avg setpoint", value: (zones.reduce((s,z)=>s+z.setpoint,0)/Math.max(1,zones.length)).toFixed(1), suffix: "°C" },
      ]}/>
      <Panel kicker="HVAC ZONES" title="Zone control">
        <EntityTable testId="hvac-zones-table" rows={zones} columns={[
          { key: "name", label: "Zone", flex: 0.8 },
          { key: "floors", label: "Floors", flex: 0.8, render: r => r.floors.join(", ") },
          { key: "current", label: "Actual", flex: 0.6, render: r => `${r.current?.toFixed(1)}°C` },
          { key: "setpoint", label: "Setpoint", flex: 0.6, render: r => `${r.setpoint}°C` },
          { key: "load", label: "Load", flex: 0.8, render: r => `${r.load}%` },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 2.2, align: "right", render: r => (
            <div style={{display:"flex", gap:6, justifyContent:"flex-end", flexWrap:"wrap"}}>
              <ActionButton domain="building" action="hvac.setpoint" params={{zone_id: r.id, setpoint: Math.max(16, r.setpoint - 1)}} label="−1°" tone="cyan" size="xs" testId={`hvac-down-${r.id}`}/>
              <ActionButton domain="building" action="hvac.setpoint" params={{zone_id: r.id, setpoint: Math.min(28, r.setpoint + 1)}} label="+1°" tone="cyan" size="xs" testId={`hvac-up-${r.id}`}/>
              {r.enabled ? <ActionButton domain="building" action="hvac.disable" params={{zone_id: r.id}} label="Disable" tone="amber" size="xs" testId={`hvac-disable-${r.id}`}/>
                          : <ActionButton domain="building" action="hvac.enable" params={{zone_id: r.id}} label="Enable" tone="cyan" size="xs" testId={`hvac-enable-${r.id}`}/>}
            </div>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function BuildingElevators() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const lifts = snap.state.elevators || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-building-elevators">
      <KpiGrid items={[
        { label: "Total lifts", value: lifts.length, tone: "cyan", icon: Archive },
        { label: "Moving", value: lifts.filter(l=>l.state==="moving").length, tone: "cyan" },
        { label: "In maintenance", value: lifts.filter(l=>l.maintenance).length, tone: "amber" },
        { label: "Trips today", value: lifts.reduce((s,l)=>s+l.trips_today,0), tone: "cyan" },
      ]}/>
      <Panel kicker="ELEVATOR BANK" title="Live positions">
        <EntityTable testId="elevators-table" rows={lifts} columns={[
          { key: "id", label: "Lift", flex: 0.6 },
          { key: "current_floor", label: "Floor", flex: 0.5, render: r => `F${r.current_floor}` },
          { key: "load", label: "Load", flex: 0.7, render: r => `${r.load}/${r.capacity}` },
          { key: "trips_today", label: "Trips", flex: 0.6 },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.4, align: "right", render: r => r.maintenance ? (
            <ActionButton domain="building" action="elevator.restore" params={{elevator_id: r.id}} label="Restore" tone="cyan" size="xs" testId={`lift-restore-${r.id}`}/>
          ) : (
            <ActionButton domain="building" action="elevator.maintenance" params={{elevator_id: r.id}} label="Maintenance" tone="amber" size="xs" testId={`lift-maint-${r.id}`}/>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function BuildingAccess() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const doors = snap.state.access_doors || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-building-access">
      <KpiGrid items={[
        { label: "Total doors", value: doors.length, tone: "cyan", icon: KeyRound },
        { label: "Locked", value: doors.filter(d=>d.locked).length, tone: "amber" },
        { label: "Unlocked", value: doors.filter(d=>!d.locked).length, tone: "cyan" },
      ]}/>
      <Panel kicker="ACCESS POINTS" title="Door control">
        <EntityTable testId="doors-table" rows={doors} columns={[
          { key: "name", label: "Door", flex: 0.8 },
          { key: "zone", label: "Zone", flex: 1 },
          { key: "locked", label: "Locked", flex: 0.5, render: r => r.locked ? "🔒" : "🔓" },
          { key: "last_swipe", label: "Last swipe", flex: 1, render: r => new Date(r.last_swipe).toLocaleTimeString() },
          { key: "actions", label: "", flex: 1.4, align: "right", render: r => r.locked ? (
            <ActionButton domain="building" action="door.lock" params={{door_id: r.id, locked: false}} label="Unlock" tone="cyan" size="xs" testId={`door-unlock-${r.id}`}/>
          ) : (
            <ActionButton domain="building" action="door.lock" params={{door_id: r.id, locked: true}} label="Lock" tone="amber" size="xs" testId={`door-lock-${r.id}`}/>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

export function BuildingEnergy() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const s = snap.state;
  const data = Array.from({length: 24}, (_, i) => ({ hour: i, solar: Math.max(0, 30 * Math.sin(i/24*Math.PI)*2 + Math.random()*4), grid: 60 + Math.random()*20 }));
  return (
    <div className="page domain-workspace" data-testid="workspace-building-energy">
      <KpiGrid items={[
        { label: "Total energy", value: s.energy_kwh, suffix: "kWh", tone: "amber", icon: Zap },
        { label: "Solar", value: s.solar_kwh, suffix: "kWh", tone: "cyan" },
        { label: "Grid draw", value: s.grid_kwh, suffix: "kWh", tone: "amber" },
        { label: "Solar share", value: `${((s.solar_kwh/Math.max(1,s.energy_kwh))*100).toFixed(0)}`, suffix: "%", tone: "cyan" },
      ]}/>
      <Panel kicker="24H ENERGY MIX" title="Solar vs grid">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <XAxis dataKey="hour" stroke="#8ba3c7"/><YAxis stroke="#8ba3c7"/>
            <Tooltip contentStyle={{background:"#0d1a2b", border:"1px solid #1e3a5f"}}/>
            <Area type="monotone" dataKey="solar" stackId="1" stroke="#ffb703" fill="#ffb70344"/>
            <Area type="monotone" dataKey="grid" stackId="1" stroke="#00e0ff" fill="#00e0ff44"/>
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

export function BuildingSafety() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const s = snap.state;
  return (
    <div className="page domain-workspace" data-testid="workspace-building-safety">
      <KpiGrid items={[
        { label: "Fire alarm", value: s.fire_alarm, tone: s.fire_alarm==="clear"?"cyan":"red", icon: ShieldCheck },
        { label: "Sprinkler zones", value: s.sprinkler_zones.length, tone: "cyan" },
        { label: "Armed zones", value: s.sprinkler_zones.filter(z=>z.armed).length, tone: "cyan" },
      ]}/>
      <Panel kicker="SPRINKLER SYSTEM" title="Zone status">
        <EntityTable testId="sprinkler-table" rows={s.sprinkler_zones} columns={[
          { key: "id", label: "Zone", flex: 0.8 },
          { key: "armed", label: "Armed", flex: 0.5, render: r => r.armed ? "✓" : "✗" },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
        ]}/>
      </Panel>
    </div>
  );
}

export function BuildingAlerts() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-building-alerts">
      <Panel kicker="EVENTS" title="Recent building events">
        <EntityTable testId="building-events-table" rows={snap.state.events || []} empty="No events yet"
          columns={[
            { key: "type", label: "Type", flex: 1.2 },
            { key: "description", label: "Description", flex: 2 },
            { key: "at", label: "Time", flex: 0.9, render: r => new Date(r.at).toLocaleTimeString() },
          ]}/>
      </Panel>
    </div>
  );
}

export function BuildingReplay() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-building-replay">
      <ReplayTimeline domain={DOMAIN} testIdPrefix="building-replay" onFrame={f => snap.applyReplayFrame?.(f)}/>
      <Panel kicker="3D VIEW" title={`Building state ${snap.isReplay ? "@ replay" : "· live"}`}
        right={<button className="op-btn op-btn-slate op-btn-sm" onClick={() => snap.clearReplay()} data-testid="replay-back-to-live">Back to live</button>}>
        <div style={{height: 380}}><DomainScene domain="building" state={snap.state}/></div>
      </Panel>
    </div>
  );
}

export function BuildingTwin() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-building-twin">
      <Panel kicker="FULL 3D MODEL" title="Interactive building twin">
        <div style={{height: 520}}><DomainScene domain="building" state={snap.state}/></div>
      </Panel>
    </div>
  );
}
