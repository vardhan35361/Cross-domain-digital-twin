import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, Building2, Car, CircleAlert, Cpu, Database, Droplets, Factory,
  Hospital, Layers3, Radio, Sparkles, Zap,
} from "lucide-react";
import { Panel } from "../shared/Panel";
import { KpiGrid } from "../shared/Workspace";
import { useWs } from "../state/WsProvider";
import { useAuth } from "../state/AuthContext";
import { api } from "../services/api";

const DOMAIN_META = {
  traffic:    { icon: Car,       tone: "cyan",   accent: "#00e0ff", title: "Traffic",    subtitle: "Transportation Digital Twin" },
  hospital:   { icon: Hospital,  tone: "blue",   accent: "#5aa2ff", title: "Hospital",   subtitle: "Healthcare Facility Digital Twin" },
  building:   { icon: Building2, tone: "amber",  accent: "#ffb703", title: "Building",   subtitle: "Smart Building Digital Twin" },
  industrial: { icon: Factory,   tone: "steel",  accent: "#a8b7c9", title: "Industrial", subtitle: "Industrial Facility Digital Twin" },
  energy:     { icon: Zap,       tone: "green",  accent: "#4be99b", title: "Energy",     subtitle: "Energy Infrastructure Digital Twin" },
  water:      { icon: Droplets,  tone: "aqua",   accent: "#3ec5e8", title: "Water",      subtitle: "Water Infrastructure Digital Twin" },
};

function statusFromSnapshot(id, snap) {
  if (!snap) return { label: "OFFLINE", tone: "slate" };
  const kpis = snap.kpis || {};
  const alerts = kpis.active_alerts || 0;
  const state = snap.state || {};
  // Domain-specific critical rules
  if (id === "traffic") {
    if ((kpis.congestion_index || 0) > 75 || (state.active_incidents?.length || 0) > 5) return { label: "WARNING", tone: "amber" };
    return { label: "NORMAL", tone: "cyan" };
  }
  if (id === "hospital") {
    if ((kpis.icu_occupancy || 0) > 92 || (kpis.er_critical || 0) > 5) return { label: "CRITICAL", tone: "red" };
    if (alerts > 0 || (kpis.occupancy_percent || 0) > 85) return { label: "WARNING", tone: "amber" };
    return { label: "NORMAL", tone: "cyan" };
  }
  if (id === "energy") {
    if ((kpis.substations_online ?? 4) < 4) return { label: "WARNING", tone: "amber" };
    if ((kpis.battery_percent ?? 60) < 25) return { label: "WARNING", tone: "amber" };
    return { label: "NORMAL", tone: "cyan" };
  }
  if (id === "water") {
    if ((kpis.leaks_detected || 0) > 0) return { label: "WARNING", tone: "amber" };
    return { label: "NORMAL", tone: "cyan" };
  }
  if (id === "building") {
    if (state.fire_alarm && state.fire_alarm !== "clear") return { label: "CRITICAL", tone: "red" };
    if ((kpis.hvac_load || 0) > 85) return { label: "WARNING", tone: "amber" };
    return { label: "NORMAL", tone: "cyan" };
  }
  if (id === "industrial") {
    if ((kpis.sensor_warnings || 0) > 3) return { label: "WARNING", tone: "amber" };
    return { label: "NORMAL", tone: "cyan" };
  }
  return { label: "NORMAL", tone: "cyan" };
}

export default function PlatformHome() {
  const { user } = useAuth();
  const { snapshots, status: wsStatus } = useWs() || {};
  const [dataSources, setDataSources] = useState([]);
  const [dbStatus, setDbStatus] = useState("checking");

  useEffect(() => {
    api.dataSources?.().then(setDataSources).catch(() => setDataSources([]));
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/health`).then(r => r.ok ? setDbStatus("connected") : setDbStatus("offline")).catch(() => setDbStatus("offline"));
  }, []);

  const allowed = (id) => {
    const domainsAllowed = user?.domains || [];
    return domainsAllowed.includes("*") || domainsAllowed.includes(id) || domainsAllowed.length === 0;
  };

  const domainIds = ["traffic", "hospital", "building", "industrial", "energy", "water"];
  const activeTwins = domainIds.filter(id => (snapshots || {})[id]).length;
  const criticalAlerts = Object.entries(snapshots || {}).reduce((acc, [, s]) => acc + (s?.kpis?.active_alerts || 0), 0);
  const activeIncidents = snapshots?.traffic?.state?.active_incidents?.length || 0;
  const runningSims = domainIds.filter(id => (snapshots || {})[id]?.running).length;

  return (
    <div className="page platform-home" data-testid="page-platform-home">
      <div className="platform-hero" data-testid="platform-hero">
        <div>
          <span className="section-kicker">DIGITAL TWIN OPERATING SYSTEM</span>
          <h1>Multi-Domain <em>Digital Twin Platform</em></h1>
          <p>Real-time digital twins for physical-world operations across transportation,
             healthcare, buildings, industry, energy, and water infrastructure.</p>
        </div>
        <div className="hero-badges" data-testid="platform-badges">
          <span className="badge-chip"><Layers3 size={13}/> 6 DOMAINS</span>
          <span className="badge-chip"><Sparkles size={13}/> AIRA AI</span>
          <span className="badge-chip"><Radio size={13}/> WS MULTIPLEX</span>
        </div>
      </div>

      <KpiGrid items={[
        { label: "Active digital twins", value: activeTwins, suffix: `/ 6`, tone: "cyan", icon: Layers3 },
        { label: "Connected data sources", value: dataSources.length, tone: "cyan", icon: Database },
        { label: "Running simulations", value: runningSims, tone: "cyan", icon: Activity },
        { label: "Critical alerts", value: criticalAlerts + activeIncidents, tone: (criticalAlerts+activeIncidents)>0?"amber":"cyan", icon: AlertTriangle },
        { label: "WebSocket", value: wsStatus === "CONNECTED" ? "LIVE" : wsStatus, tone: wsStatus === "CONNECTED" ? "cyan" : "amber", icon: Radio },
        { label: "MongoDB", value: dbStatus === "connected" ? "ONLINE" : dbStatus.toUpperCase(), tone: dbStatus === "connected" ? "cyan" : "red", icon: Cpu },
      ]}/>

      <Panel kicker="DIGITAL TWINS" title="Choose an operational domain" testId="platform-domain-panel">
        <div className="domain-tile-grid" data-testid="platform-domain-tiles">
          {domainIds.map(id => {
            const meta = DOMAIN_META[id];
            const st = statusFromSnapshot(id, (snapshots || {})[id]);
            const enabled = allowed(id);
            const Icon = meta.icon;
            return (
              <Link key={id} to={enabled ? `/${id}` : "#"}
                className={`domain-tile domain-tile-${meta.tone} ${!enabled ? "domain-tile-locked" : ""}`}
                data-testid={`platform-tile-${id}`}
                style={{"--accent": meta.accent}}
                onClick={e => { if (!enabled) e.preventDefault(); }}>
                <div className="dt-icon"><Icon size={28}/></div>
                <div className="dt-body">
                  <strong>{meta.title.toUpperCase()}</strong>
                  <span>{meta.subtitle}</span>
                  <div className="dt-status">
                    <i className={`dt-dot dt-dot-${st.tone}`}/>
                    <b>{st.label}</b>
                    {!enabled && <em>ACCESS RESTRICTED</em>}
                  </div>
                </div>
                <span className="dt-arrow">→</span>
              </Link>
            );
          })}
        </div>
      </Panel>

      <div className="platform-secondary" data-testid="platform-secondary">
        <Panel kicker="ROLE & ACCESS" title="Your platform access" testId="platform-role-panel">
          <div className="role-summary">
            <div><strong>{user?.role_label || "Operator"}</strong><span>{user?.email}</span></div>
            <div className="role-domains">
              {(user?.domains || []).includes("*")
                ? <span className="chip chip-cyan">ALL DOMAINS</span>
                : (user?.domains || []).map(d => <span key={d} className={`chip chip-${DOMAIN_META[d]?.tone || "cyan"}`}>{d.toUpperCase()}</span>)
              }
            </div>
          </div>
        </Panel>
        <Panel kicker="SYSTEM STATUS" title="Platform health" testId="platform-status-panel">
          <div className="platform-status-grid">
            <div><i className="pulse-dot"/> Backend API — HEALTHY</div>
            <div><i className={wsStatus==="CONNECTED"?"pulse-dot":"dot-warn"}/> Multiplexed WebSocket — {wsStatus || "PENDING"}</div>
            <div><i className={dbStatus==="connected"?"pulse-dot":"dot-warn"}/> MongoDB persistence — {dbStatus.toUpperCase()}</div>
            <div><i className="pulse-dot"/> Simulation engines — {runningSims}/6 running</div>
            <div><i className="pulse-dot"/> Prometheus metrics — /api/metrics</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
