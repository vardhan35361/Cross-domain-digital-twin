import { NavLink } from "react-router-dom";
import {
  Activity, AirVent, AlertTriangle, Ambulance, Archive, BarChart3, BedDouble, Building2, Camera, Cog, Cpu, Crown, Database,
  Droplets, Factory, Fingerprint, FlaskConical, Fuel, Gauge, HeartPulse, Hospital, KeyRound, Layers3, LayoutDashboard, LineChart, Lock, Map, Microscope,
  Pill, Plane, Radio, Rewind, Route, Settings2, ShieldAlert, ShieldCheck, Siren, Signal, Sparkles, Stethoscope, Sun, Timer,
  TowerControl, Truck, UsersRound, Waves, Wind, Wrench, Zap,
} from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useDomains } from "../state/DomainContext";

const TRAFFIC_NAV = [
  { to: "/domains", icon: Layers3, label: "Digital twins", key: "domains", perm: "overview" },
  { to: "/", icon: TowerControl, label: "City overview", key: "overview", perm: "overview" },
  { to: "/twin", icon: Map, label: "3D digital twin", key: "twin", perm: "twin" },
  { to: "/analytics", icon: BarChart3, label: "Traffic analytics", key: "analytics", perm: "analytics" },
  { to: "/predictive", icon: Sparkles, label: "Predictive AI", key: "predictive", perm: "predictive" },
  { to: "/signals", icon: Signal, label: "Signal control", key: "signals", perm: "signals" },
  { to: "/incidents", icon: ShieldAlert, label: "Incidents", key: "incidents", perm: "incidents", badge: 3 },
  { to: "/emergency", icon: Route, label: "Emergency ops", key: "emergency", perm: "emergency" },
  { to: "/convoy", icon: Crown, label: "VIP convoy", key: "convoy", perm: "convoy" },
  { to: "/drones", icon: Plane, label: "Drone surveillance", key: "drones", perm: "drones" },
  { to: "/cctv", icon: Camera, label: "CCTV network", key: "cctv", perm: "cctv" },
  { to: "/replay", icon: Rewind, label: "Replay & timeline", key: "replay", perm: "replay" },
  { to: "/live", icon: Activity, label: "Live data", key: "live", perm: "live" },
  { to: "/data-sources", icon: Database, label: "Data sources", key: "data-sources", perm: "overview" },
  { to: "/system", icon: Cpu, label: "System monitor", key: "system", perm: "*" },
  { to: "/users", icon: UsersRound, label: "User admin", key: "users", perm: "*" },
  { to: "/audit", icon: Fingerprint, label: "Audit logs", key: "audit", perm: "audit" },
  { to: "/settings", icon: Cog, label: "Settings", key: "settings", perm: "*" },
];

const DOMAIN_LABELS = {
  hospital: "Hospital command", building: "Facility ops", industrial: "Industrial ops",
  energy: "Grid ops", water: "Water ops",
};

const DOMAIN_NAVS = {
  hospital: [
    { to: "/domains/hospital", icon: LayoutDashboard, label: "Command overview", key: "h-overview" },
    { to: "/domains/hospital/twin", icon: Map, label: "3D hospital twin", key: "h-twin" },
    { to: "/domains/hospital/icu", icon: HeartPulse, label: "ICU operations", key: "h-icu" },
    { to: "/domains/hospital/er", icon: Siren, label: "Emergency dept", key: "h-er" },
    { to: "/domains/hospital/wards", icon: BedDouble, label: "Wards & beds", key: "h-wards" },
    { to: "/domains/hospital/equipment", icon: Stethoscope, label: "Equipment health", key: "h-equip" },
    { to: "/domains/hospital/ambulances", icon: Ambulance, label: "Ambulance fleet", key: "h-amb" },
    { to: "/domains/hospital/pharmacy", icon: Pill, label: "Pharmacy & supply", key: "h-pharm" },
    { to: "/domains/hospital/alerts", icon: AlertTriangle, label: "Alerts & events", key: "h-alerts" },
    { to: "/domains/hospital/replay", icon: Rewind, label: "60-min replay", key: "h-replay" },
  ],
  building: [
    { to: "/domains/building", icon: LayoutDashboard, label: "Facility overview", key: "b-overview" },
    { to: "/domains/building/twin", icon: Map, label: "3D building twin", key: "b-twin" },
    { to: "/domains/building/floors", icon: Building2, label: "Floors & occupancy", key: "b-floors" },
    { to: "/domains/building/hvac", icon: AirVent, label: "HVAC control", key: "b-hvac" },
    { to: "/domains/building/elevators", icon: Archive, label: "Elevators", key: "b-lifts" },
    { to: "/domains/building/access", icon: KeyRound, label: "Access control", key: "b-access" },
    { to: "/domains/building/energy", icon: Zap, label: "Energy & solar", key: "b-energy" },
    { to: "/domains/building/safety", icon: ShieldCheck, label: "Fire & safety", key: "b-safety" },
    { to: "/domains/building/alerts", icon: AlertTriangle, label: "Alerts & events", key: "b-alerts" },
    { to: "/domains/building/replay", icon: Rewind, label: "60-min replay", key: "b-replay" },
  ],
  industrial: [
    { to: "/domains/industrial", icon: LayoutDashboard, label: "Plant overview", key: "i-overview" },
    { to: "/domains/industrial/twin", icon: Map, label: "3D plant twin", key: "i-twin" },
    { to: "/domains/industrial/lines", icon: Factory, label: "Production lines", key: "i-lines" },
    { to: "/domains/industrial/machines", icon: Cog, label: "Machines", key: "i-mach" },
    { to: "/domains/industrial/sensors", icon: Gauge, label: "Sensors telemetry", key: "i-sensors" },
    { to: "/domains/industrial/quality", icon: FlaskConical, label: "Quality control", key: "i-qual" },
    { to: "/domains/industrial/safety", icon: ShieldCheck, label: "Safety & OSHA", key: "i-safety" },
    { to: "/domains/industrial/alerts", icon: AlertTriangle, label: "Alerts & events", key: "i-alerts" },
    { to: "/domains/industrial/replay", icon: Rewind, label: "60-min replay", key: "i-replay" },
  ],
  energy: [
    { to: "/domains/energy", icon: LayoutDashboard, label: "Grid overview", key: "e-overview" },
    { to: "/domains/energy/twin", icon: Map, label: "3D grid twin", key: "e-twin" },
    { to: "/domains/energy/substations", icon: TowerControl, label: "Substations", key: "e-subs" },
    { to: "/domains/energy/transformers", icon: Wrench, label: "Transformers", key: "e-trf" },
    { to: "/domains/energy/feeders", icon: LineChart, label: "Feeders & load", key: "e-feed" },
    { to: "/domains/energy/renewables", icon: Sun, label: "Solar & wind", key: "e-ren" },
    { to: "/domains/energy/battery", icon: Fuel, label: "Battery reserves", key: "e-batt" },
    { to: "/domains/energy/alerts", icon: AlertTriangle, label: "Alerts & events", key: "e-alerts" },
    { to: "/domains/energy/replay", icon: Rewind, label: "60-min replay", key: "e-replay" },
  ],
  water: [
    { to: "/domains/water", icon: LayoutDashboard, label: "Network overview", key: "w-overview" },
    { to: "/domains/water/twin", icon: Map, label: "3D network twin", key: "w-twin" },
    { to: "/domains/water/reservoirs", icon: Droplets, label: "Reservoirs", key: "w-res" },
    { to: "/domains/water/pumps", icon: Waves, label: "Pumps", key: "w-pumps" },
    { to: "/domains/water/valves", icon: Lock, label: "Valves & pipelines", key: "w-valves" },
    { to: "/domains/water/quality", icon: Microscope, label: "Water quality", key: "w-qual" },
    { to: "/domains/water/leaks", icon: AlertTriangle, label: "Leak detection", key: "w-leaks" },
    { to: "/domains/water/alerts", icon: AlertTriangle, label: "Alerts & events", key: "w-alerts" },
    { to: "/domains/water/replay", icon: Rewind, label: "60-min replay", key: "w-replay" },
  ],
};

function domainNav(domainId) {
  const base = DOMAIN_NAVS[domainId] || [];
  return [
    { to: "/domains", icon: Layers3, label: "Digital twins", key: "domains", perm: "overview" },
    ...base.map(n => ({ ...n, perm: "overview" })),
    { to: "/data-sources", icon: Database, label: "Data sources", key: "d-data", perm: "overview" },
    { to: "/audit", icon: Fingerprint, label: "Audit log", key: "d-audit", perm: "audit" },
  ];
}

export default function Sidebar() {
  const { user, has } = useAuth();
  const { activeDomain } = useDomains();
  const rawNav = activeDomain && activeDomain !== "traffic" ? domainNav(activeDomain) : TRAFFIC_NAV;
  const items = rawNav.filter(n => has(n.perm) || n.perm === "overview");
  return (
    <aside className="side-rail" data-testid="sidebar-nav">
      <div className="brand-mark" data-testid="brand-mark">
        <div className="brand-glyph">{activeDomain === "traffic" ? "HYD" : (activeDomain?.slice(0,3).toUpperCase() || "TWIN")}</div>
        <div><strong>{activeDomain === "traffic" ? "ITMS" : (DOMAIN_LABELS[activeDomain] || "TWIN OS").toUpperCase()}</strong>
          <span>{activeDomain === "traffic" ? "HYDERABAD · TELANGANA" : "DIGITAL TWIN OS"}</span></div>
      </div>
      <div className="rail-status" data-testid={`sidebar-mode-${activeDomain || "traffic"}`}><span className="pulse-dot" /> {activeDomain === "traffic" ? "LIVE CORE" : `${activeDomain?.toUpperCase()} CORE`}</div>
      <nav className="rail-nav">
        {items.map(({to, icon:Icon, label, key, badge}) => (
          <NavLink key={key} to={to} end={to === "/" || to === `/domains/${activeDomain}`}
            className={({isActive}) => isActive ? "rail-item active" : "rail-item"}
            data-testid={`nav-${key}`}>
            <Icon size={15} />
            <span>{label}</span>
            {badge && <b>{String(badge).padStart(2,"0")}</b>}
          </NavLink>
        ))}
      </nav>
      <div className="rail-bottom">
        {user && user !== false && (
          <div className="operator" data-testid="operator-card">
            <div className="operator-avatar">{(user.name || "").split(" ").map(s => s[0]).join("").slice(0,2) || "OP"}</div>
            <div><strong>{user.name}</strong><span>{user.role_label}</span></div>
          </div>
        )}
      </div>
    </aside>
  );
}
