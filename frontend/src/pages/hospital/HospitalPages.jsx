import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Tooltip, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, Ambulance, BedDouble, HeartPulse, Hospital, Pill, Siren, Stethoscope } from "lucide-react";
import { Panel } from "../../shared/Panel";
import { KpiGrid, EntityTable, ActionButton, StateBadge } from "../../shared/Workspace";
import { useDomainSnapshot } from "../../shared/useDomainSnapshot";
import DomainScene from "../../scene/DomainScene";
import ReplayTimeline from "../../shared/ReplayTimeline";

const DOMAIN = "hospital";

function Loader() { return <div className="page" data-testid="workspace-loading"><div className="skeleton-row"><span className="skeleton-line"/></div></div>; }
function ErrorRow({ error }) { return <div className="page" data-testid="workspace-error"><div className="empty-row"><AlertTriangle size={14}/> {error}</div></div>; }

/* --------------------------- COMMAND OVERVIEW --------------------------- */
export function HospitalOverview() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const { state, kpis } = snap;
  const modules = [
    { to: "/hospital/icu", label: "ICU Operations", icon: HeartPulse, tone: "red", stat: `${kpis.icu_beds_occupied}/${kpis.icu_beds_total} beds` },
    { to: "/hospital/er", label: "Emergency Dept", icon: Siren, tone: "amber", stat: `${kpis.er_waiting} waiting · ${kpis.er_critical} red` },
    { to: "/hospital/wards", label: "Wards & Beds", icon: BedDouble, tone: "cyan", stat: `${kpis.occupancy_percent}% occupancy` },
    { to: "/hospital/equipment", label: "Equipment Health", icon: Stethoscope, tone: "cyan", stat: `${kpis.operational_equipment}/${kpis.total_equipment} online` },
    { to: "/hospital/ambulances", label: "Ambulance Fleet", icon: Ambulance, tone: "cyan", stat: `${kpis.available_ambulances} available` },
    { to: "/hospital/pharmacy", label: "Pharmacy & Supply", icon: Pill, tone: "cyan", stat: `${state.pharmacy?.stock_percent || 0}% stock` },
  ];
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-overview">
      <KpiGrid items={[
        { label: "Hospital occupancy", value: `${kpis.occupancy_percent}`, suffix: "%", tone: kpis.occupancy_percent > 88 ? "red" : "cyan", icon: Hospital },
        { label: "ICU occupancy", value: `${kpis.icu_occupancy}`, suffix: "%", tone: "red", icon: HeartPulse },
        { label: "ER waiting", value: kpis.er_waiting, suffix: "pt", tone: "amber", icon: Siren },
        { label: "Equipment online", value: `${kpis.operational_equipment}/${kpis.total_equipment}`, tone: "cyan", icon: Stethoscope },
        { label: "Ambulances free", value: kpis.available_ambulances, tone: "cyan", icon: Ambulance },
        { label: "Active alerts", value: kpis.active_alerts, tone: "amber", icon: AlertTriangle },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="MODULES" title="Hospital operational suites">
          <div className="module-grid" data-testid="hospital-modules">
            {modules.map(m => (
              <Link key={m.to} to={m.to} className="module-tile" data-testid={`module-tile-${m.label.toLowerCase().replaceAll(' ','-')}`}>
                <m.icon size={20}/><strong>{m.label}</strong><span>{m.stat}</span>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel kicker="3D FLOOR MODEL" title="Hospital digital twin">
          <div style={{height: 360}}><DomainScene domain="hospital" state={state}/></div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- ICU WORKSPACE --------------------------- */
export function HospitalICU() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const beds = snap.state.icu_beds || [];
  const occupied = beds.filter(b => b.occupied);
  const critical = beds.filter(b => b.state === "CRITICAL").length;
  const trend = (snap.state.history || []).slice(-30).map((_, i) => ({ x: i, hr: 80 + Math.sin(i/3)*8, spo2: 96 + Math.cos(i/4)*2 }));
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-icu">
      <KpiGrid items={[
        { label: "ICU beds occupied", value: `${occupied.length}/${beds.length}`, tone: occupied.length/beds.length>0.9?"red":"cyan" },
        { label: "Critical patients", value: critical, tone: "red", icon: HeartPulse },
        { label: "Ventilators in use", value: beds.filter(b => b.ventilator).length, tone: "amber" },
        { label: "Avg heart rate", value: occupied.length ? Math.round(occupied.reduce((s,b)=>s+b.heart_rate,0)/occupied.length) : 0, suffix: "bpm", tone: "cyan" },
        { label: "Avg SpO₂", value: occupied.length ? Math.round(occupied.reduce((s,b)=>s+b.spo2,0)/occupied.length) : 0, suffix: "%", tone: "cyan" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="BED-LEVEL VIEW" title="ICU patient monitoring">
          <EntityTable testId="icu-bed-table" rows={beds} columns={[
            { key: "name", label: "Bed", flex: 0.6 },
            { key: "condition", label: "Condition", flex: 1 },
            { key: "patient_id", label: "Patient", flex: 0.8, render: r => r.patient_id || "—" },
            { key: "heart_rate", label: "HR", flex: 0.5, render: r => r.occupied ? `${r.heart_rate}` : "—" },
            { key: "spo2", label: "SpO₂", flex: 0.5, render: r => r.occupied ? `${r.spo2}%` : "—" },
            { key: "ventilator", label: "Vent", flex: 0.5, render: r => r.ventilator ? "✓" : "—" },
            { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
            { key: "actions", label: "", flex: 1, align: "right", render: r => r.occupied ? (
              <ActionButton domain="hospital" action="icu_bed.discharge" params={{bed_id: r.id}}
                label="Discharge" tone="amber" size="xs"
                confirm={`Discharge patient from ${r.name}?`}
                testId={`discharge-${r.id}`} />
            ) : <span className="dim">empty</span>},
          ]}/>
        </Panel>
        <div className="workspace-side-stack">
          <Panel kicker="3D FOCUS · ICU FLOOR" title="ICU ward zoomed">
            <div style={{height: 260}}><DomainScene domain="hospital" state={snap.state} focus="icu"/></div>
          </Panel>
          <Panel kicker="TRENDS" title="Vitals last 30 ticks">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trend}>
                <XAxis dataKey="x" hide/><YAxis hide/>
                <Tooltip contentStyle={{background:"#0d1a2b", border:"1px solid #1e3a5f"}}/>
                <Line type="monotone" dataKey="hr" stroke="#ff2050" dot={false}/>
                <Line type="monotone" dataKey="spo2" stroke="#00e0ff" dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- ER WORKSPACE --------------------------- */
export function HospitalER() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const queue = snap.state.er_queue || [];
  const byTag = ["red", "orange", "yellow", "green"].map(t => ({ tag: t, count: queue.filter(q => q.triage === t).length }));
  const colors = { red: "#ff2050", orange: "#ff8a3d", yellow: "#ffd447", green: "#00d97a" };
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-er">
      <KpiGrid items={[
        { label: "Total waiting", value: queue.length, tone: "amber", icon: Siren },
        { label: "Red (immediate)", value: byTag[0].count, tone: "red" },
        { label: "Orange (urgent)", value: byTag[1].count, tone: "amber" },
        { label: "Yellow (delayed)", value: byTag[2].count, tone: "cyan" },
        { label: "Avg wait", value: queue.length ? Math.round(queue.reduce((s,p)=>s+p.wait_minutes,0)/queue.length) : 0, suffix: "min", tone: "cyan" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="TRIAGE QUEUE" title="ER waiting room">
          <EntityTable testId="er-queue-table" rows={queue} columns={[
            { key: "triage", label: "Tag", flex: 0.4, render: r => <span className="triage-dot" style={{background: colors[r.triage]}}/> },
            { key: "name", label: "Patient", flex: 1 },
            { key: "chief_complaint", label: "Complaint", flex: 1.4 },
            { key: "wait_minutes", label: "Wait", flex: 0.5, render: r => `${r.wait_minutes} min` },
            { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          ]}/>
        </Panel>
        <div className="workspace-side-stack">
          <Panel kicker="3D · EMERGENCY BAY" title="ER department focus">
            <div style={{height: 260}}><DomainScene domain="hospital" state={snap.state} focus="er"/></div>
          </Panel>
          <Panel kicker="TRIAGE MIX" title="Distribution">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byTag} dataKey="count" nameKey="tag" innerRadius={35} outerRadius={70}>
                  {byTag.map(entry => <Cell key={entry.tag} fill={colors[entry.tag]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:"#0d1a2b", border:"1px solid #1e3a5f"}}/>
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- WARDS WORKSPACE --------------------------- */
export function HospitalWards() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const depts = snap.state.depts || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-wards">
      <KpiGrid items={[
        { label: "Total beds", value: depts.reduce((s,d)=>s+d.beds,0), tone: "cyan", icon: BedDouble },
        { label: "Occupied", value: depts.reduce((s,d)=>s+d.occupied,0), tone: "amber" },
        { label: "Wards offline", value: depts.filter(d=>d.offline).length, tone: "red" },
        { label: "Total queue", value: depts.reduce((s,d)=>s+d.queue,0), tone: "amber" },
      ]}/>
      <Panel kicker="WARD OPERATIONS" title="All departments">
        <EntityTable testId="wards-table" rows={depts} columns={[
          { key: "name", label: "Department", flex: 1.2 },
          { key: "floor", label: "Floor", flex: 0.5 },
          { key: "occupied", label: "Occupied", flex: 0.8, render: r => `${r.occupied} / ${r.beds}` },
          { key: "pct", label: "Utilisation", flex: 1, render: r => (
            <div className="mini-bar"><div style={{width: `${Math.min(100,(r.occupied/r.beds)*100)}%`,
              background: r.occupied/r.beds > 0.9 ? "#ff2050" : r.occupied/r.beds > 0.8 ? "#ffb703" : "#00e0ff"}}/></div>
          )},
          { key: "queue", label: "Queue", flex: 0.5 },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.4, align: "right", render: r => r.offline ? (
            <ActionButton domain="hospital" action="ward.restore" params={{dept_id: r.id}} label="Restore" tone="cyan" size="xs" testId={`restore-${r.id}`}/>
          ) : (
            <ActionButton domain="hospital" action="ward.offline" params={{dept_id: r.id}} label="Take offline" tone="amber" size="xs"
              confirm={`Take ${r.name} offline?`} testId={`offline-${r.id}`}/>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

/* --------------------------- EQUIPMENT WORKSPACE --------------------------- */
export function HospitalEquipment() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const eq = snap.state.equipment || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-equipment">
      <KpiGrid items={[
        { label: "Total equipment", value: eq.length, tone: "cyan", icon: Stethoscope },
        { label: "Operational", value: eq.filter(e=>e.status==="operational").length, tone: "cyan" },
        { label: "Offline", value: eq.filter(e=>e.status==="offline").length, tone: "red" },
        { label: "Overdue service", value: eq.filter(e=>e.hours_since_service>200).length, tone: "amber" },
      ]}/>
      <Panel kicker="MEDICAL DEVICES" title="Equipment health monitor">
        <EntityTable testId="equipment-table" rows={eq} columns={[
          { key: "name", label: "Device", flex: 1.4 },
          { key: "type", label: "Type", flex: 0.8 },
          { key: "dept", label: "Assigned to", flex: 1 },
          { key: "hours_since_service", label: "Since service", flex: 0.9, render: r => `${r.hours_since_service} h` },
          { key: "state", label: "State", flex: 0.7, render: r => <StateBadge state={r.state}/> },
          { key: "actions", label: "", flex: 1.6, align: "right", render: r => (
            <div style={{display:"flex", gap:6, justifyContent:"flex-end"}}>
              {r.status === "operational" ? (
                <ActionButton domain="hospital" action="equipment.offline" params={{equipment_id: r.id}}
                  label="Take offline" tone="amber" size="xs" testId={`equip-off-${r.id}`}/>
              ) : (
                <ActionButton domain="hospital" action="equipment.restore" params={{equipment_id: r.id}}
                  label="Restore" tone="cyan" size="xs" testId={`equip-restore-${r.id}`}/>
              )}
            </div>
          )},
        ]}/>
      </Panel>
    </div>
  );
}

/* --------------------------- AMBULANCE WORKSPACE --------------------------- */
export function HospitalAmbulances() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const amb = snap.state.ambulances || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-ambulances">
      <KpiGrid items={[
        { label: "Fleet size", value: amb.length, tone: "cyan", icon: Ambulance },
        { label: "Available", value: amb.filter(a=>a.status==="available").length, tone: "cyan" },
        { label: "En route", value: amb.filter(a=>a.status==="en_route").length, tone: "amber" },
        { label: "On scene", value: amb.filter(a=>a.status==="on_scene").length, tone: "red" },
      ]}/>
      <Panel kicker="EMS FLEET" title="Ambulance dispatch">
        <EntityTable testId="ambulance-table" rows={amb} columns={[
          { key: "callsign", label: "Callsign", flex: 0.8 },
          { key: "zone", label: "Zone", flex: 1 },
          { key: "status", label: "Status", flex: 0.8, render: r => <StateBadge state={r.status.toUpperCase()}/> },
          { key: "eta_minutes", label: "ETA", flex: 0.6, render: r => r.eta_minutes ? `${r.eta_minutes} min` : "—" },
          { key: "actions", label: "", flex: 1.2, align: "right", render: r => r.status === "available" ? (
            <ActionButton domain="hospital" action="ambulance.dispatch" params={{ambulance_id: r.id, zone: r.zone, eta: 8}}
              label="Dispatch" tone="amber" size="xs" testId={`dispatch-${r.id}`}/>
          ) : <span className="dim">busy</span>},
        ]}/>
      </Panel>
    </div>
  );
}

/* --------------------------- PHARMACY WORKSPACE --------------------------- */
export function HospitalPharmacy() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const ph = snap.state.pharmacy || {};
  const items = [
    { name: "Paracetamol", stock: 92, min: 30 }, { name: "Insulin", stock: 22, min: 40 },
    { name: "Adrenaline", stock: 68, min: 25 }, { name: "Atropine", stock: 44, min: 20 },
    { name: "Morphine", stock: 18, min: 15 }, { name: "N-95 masks", stock: 88, min: 200 },
    { name: "IV saline", stock: 76, min: 50 }, { name: "Oxygen (L)", stock: 62, min: 100 },
  ];
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-pharmacy">
      <KpiGrid items={[
        { label: "Overall stock", value: ph.stock_percent || 0, suffix: "%", tone: "cyan", icon: Pill },
        { label: "Critical low SKUs", value: items.filter(i=>i.stock<i.min).length, tone: "red" },
        { label: "Open orders", value: ph.orders_open || 0, tone: "amber" },
        { label: "SKUs tracked", value: items.length, tone: "cyan" },
      ]}/>
      <Panel kicker="STOCK LEVELS" title="Formulary status">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={items}>
            <XAxis dataKey="name" stroke="#8ba3c7"/><YAxis stroke="#8ba3c7"/>
            <Tooltip contentStyle={{background:"#0d1a2b", border:"1px solid #1e3a5f"}}/>
            <Bar dataKey="stock" fill="#00e0ff"/><Bar dataKey="min" fill="#ff2050"/>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

/* --------------------------- ALERTS WORKSPACE --------------------------- */
export function HospitalAlerts() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  const alerts = snap.state.alerts || [];
  const events = snap.state.events || [];
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-alerts">
      <KpiGrid items={[
        { label: "Active alerts", value: alerts.length, tone: "red", icon: AlertTriangle },
        { label: "Events (rolling)", value: events.length, tone: "amber" },
        { label: "Critical", value: alerts.filter(a=>a.severity==="CRITICAL"||a.severity==="HIGH").length, tone: "red" },
      ]}/>
      <div className="workspace-2col">
        <Panel kicker="ALERTS" title="Currently firing">
          <EntityTable testId="hospital-alerts-table" rows={alerts} empty="No active alerts"
            columns={[
              { key: "severity", label: "Severity", flex: 0.7, render: r => <StateBadge state={r.severity}/> },
              { key: "message", label: "Message", flex: 2 },
              { key: "at", label: "Time", flex: 0.9, render: r => new Date(r.at).toLocaleTimeString() },
            ]}/>
        </Panel>
        <Panel kicker="EVENTS" title="Recent activity">
          <EntityTable testId="hospital-events-table" rows={events} empty="No events yet"
            columns={[
              { key: "type", label: "Type", flex: 1.2 },
              { key: "description", label: "Description", flex: 2 },
              { key: "at", label: "Time", flex: 0.9, render: r => new Date(r.at).toLocaleTimeString() },
            ]}/>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- REPLAY WORKSPACE --------------------------- */
export function HospitalReplay() {
  const snap = useDomainSnapshot(DOMAIN);
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-replay">
      <ReplayTimeline domain={DOMAIN} testIdPrefix="hospital-replay"
        onFrame={frame => snap.applyReplayFrame?.(frame)}/>
      <Panel kicker="3D REPLAY VIEW" title={`Hospital state ${snap.isReplay ? "@ replay time" : "· live"}`}
        right={<button className="op-btn op-btn-slate op-btn-sm" onClick={() => snap.clearReplay()} data-testid="replay-back-to-live">Back to live</button>}>
        <div style={{height: 380}}><DomainScene domain="hospital" state={snap.state}/></div>
      </Panel>
    </div>
  );
}

/* --------------------------- 3D TWIN WORKSPACE --------------------------- */
export function HospitalTwin() {
  const snap = useDomainSnapshot(DOMAIN);
  if (snap.error) return <ErrorRow error={snap.error}/>;
  if (!snap.ready) return <Loader/>;
  return (
    <div className="page domain-workspace" data-testid="workspace-hospital-twin">
      <KpiGrid items={[
        { label: "Scenario", value: snap.scenario, tone: "amber" },
        { label: "Simulation tick", value: snap.tick, tone: "cyan" },
        { label: "Occupancy", value: `${snap.kpis.occupancy_percent}%`, tone: "cyan" },
        { label: "Active alerts", value: snap.kpis.active_alerts, tone: "red" },
      ]}/>
      <Panel kicker="FULL 3D MODEL" title="Interactive hospital twin">
        <div style={{height: 520}}><DomainScene domain="hospital" state={snap.state}/></div>
      </Panel>
    </div>
  );
}
