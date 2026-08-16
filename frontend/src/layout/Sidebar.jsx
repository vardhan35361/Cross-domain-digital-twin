import { NavLink } from "react-router-dom";
import {
  Activity, AirVent, AlertTriangle, Ambulance, Archive, BarChart3, BedDouble, Building2, Camera, Car, Cog, Cpu, Crown, Database,
  Droplets, Factory, Fingerprint, FlaskConical, Fuel, Gauge, HeartPulse, Home, Hospital, KeyRound, Layers3, LayoutDashboard, LineChart, Lock, Map, Microscope,
  Pill, Plane, Radio, Rewind, Route, Settings2, ShieldAlert, ShieldCheck, Siren, Signal, Sparkles, Stethoscope, Sun, Timer,
  TowerControl, Truck, UsersRound, Waves, Wind, Wrench, Zap, Cog as SettingsIcon,
} from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useDomains } from "../state/DomainContext";

// Platform-level menu shown on / (no domain selected)
const PLATFORM_NAV = [
  { to: "/", icon: Home, label: "Platform home", key: "platform-home", perm: "overview" },
  { to: "/traffic", icon: Car, label: "Traffic domain", key: "d-traffic", perm: "overview" },
  { to: "/hospital", icon: Hospital, label: "Hospital domain", key: "d-hospital", perm: "overview" },
  { to: "/building", icon: Building2, label: "Building domain", key: "d-building", perm: "overview" },
  { to: "/industrial", icon: Factory, label: "Industrial domain", key: "d-industrial", perm: "overview" },
  { to: "/energy", icon: Zap, label: "Energy domain", key: "d-energy", perm: "overview" },
  { to: "/water", icon: Droplets, label: "Water domain", key: "d-water", perm: "overview" },
  { to: "/data-sources", icon: Database, label: "Data sources", key: "data-sources", perm: "overview" },
  { to: "/system", icon: Cpu, label: "System monitor", key: "system", perm: "*" },
  { to: "/users", icon: UsersRound, label: "User admin", key: "users", perm: "*" },
  { to: "/audit", icon: Fingerprint, label: "Audit logs", key: "audit", perm: "audit" },
  { to: "/settings", icon: SettingsIcon, label: "Platform settings", key: "settings", perm: "*" },
];

const TRAFFIC_NAV = [
  { to: "/", icon: Home, label: "Digital twins", key: "back-platform", perm: "overview" },
  { to: "/traffic", icon: TowerControl, label: "Traffic overview", key: "t-overview", perm: "traffic" },
  { to: "/traffic/twin", icon: Map, label: "3D digital twin", key: "t-twin", perm: "twin" },
  { to: "/traffic/analytics", icon: BarChart3, label: "Traffic analytics", key: "t-analytics", perm: "analytics" },
  { to: "/traffic/predictive", icon: Sparkles, label: "Predictive AI", key: "t-predictive", perm: "predictive" },
  { to: "/traffic/signals", icon: Signal, label: "Signal control", key: "t-signals", perm: "signals" },
  { to: "/traffic/incidents", icon: ShieldAlert, label: "Incidents", key: "t-incidents", perm: "incidents", badge: 3 },
  { to: "/traffic/emergency", icon: Route, label: "Emergency ops", key: "t-emergency", perm: "emergency" },
  { to: "/traffic/convoy", icon: Crown, label: "VIP convoy", key: "t-convoy", perm: "convoy" },
  { to: "/traffic/drones", icon: Plane, label: "Drone surveillance", key: "t-drones", perm: "drones" },
  { to: "/traffic/cctv", icon: Camera, label: "CCTV network", key: "t-cctv", perm: "cctv" },
  { to: "/traffic/replay", icon: Rewind, label: "Replay & timeline", key: "t-replay", perm: "replay" },
  { to: "/traffic/live", icon: Activity, label: "Live data", key: "t-live", perm: "live" },
];

const DOMAIN_LABELS = {
  hospital: { title: "Hospital Digital Twin", subtitle: "REAL-TIME HEALTHCARE OPERATIONS", accent: "blue" },
  building: { title: "Smart Building Digital Twin", subtitle: "REAL-TIME FACILITY OPERATIONS", accent: "amber" },
  industrial: { title: "Industrial Digital Twin", subtitle: "REAL-TIME PLANT OPERATIONS", accent: "steel" },
  energy: { title: "Energy Infrastructure Digital Twin", subtitle: "REAL-TIME GRID OPERATIONS", accent: "green" },
  water: { title: "Water Infrastructure Digital Twin", subtitle: "REAL-TIME WATER NETWORK OPERATIONS", accent: "aqua" },
  traffic: { title: "Traffic Digital Twin", subtitle: "REAL-TIME TRANSPORTATION OPERATIONS", accent: "cyan" },
};

const DOMAIN_NAVS = {
  hospital: [
    { to: "/hospital", icon: LayoutDashboard, label: "Hospital overview", key: "h-overview" },
    { to: "/hospital/twin", icon: Map, label: "3D hospital twin", key: "h-twin" },
    { to: "/hospital/icu", icon: HeartPulse, label: "ICU operations", key: "h-icu" },
    { to: "/hospital/er", icon: Siren, label: "Emergency dept", key: "h-er" },
    { to: "/hospital/wards", icon: BedDouble, label: "Wards & beds", key: "h-wards" },
    { to: "/hospital/equipment", icon: Stethoscope, label: "Medical equipment", key: "h-equip" },
    { to: "/hospital/ambulances", icon: Ambulance, label: "Ambulance fleet", key: "h-amb" },
    { to: "/hospital/pharmacy", icon: Pill, label: "Pharmacy & supply", key: "h-pharm" },
    { to: "/hospital/alerts", icon: AlertTriangle, label: "Alerts & events", key: "h-alerts" },
    { to: "/hospital/replay", icon: Rewind, label: "60-min replay", key: "h-replay" },
  ],
  building: [
    { to: "/building", icon: LayoutDashboard, label: "Building overview", key: "b-overview" },
    { to: "/building/twin", icon: Map, label: "3D building twin", key: "b-twin" },
    { to: "/building/floors", icon: Building2, label: "Floors & occupancy", key: "b-floors" },
    { to: "/building/hvac", icon: AirVent, label: "HVAC control", key: "b-hvac" },
    { to: "/building/elevators", icon: Archive, label: "Elevators", key: "b-lifts" },
    { to: "/building/access", icon: KeyRound, label: "Access control", key: "b-access" },
    { to: "/building/energy", icon: Zap, label: "Energy & solar", key: "b-energy" },
    { to: "/building/safety", icon: ShieldCheck, label: "Fire & safety", key: "b-safety" },
    { to: "/building/alerts", icon: AlertTriangle, label: "Alerts & events", key: "b-alerts" },
    { to: "/building/replay", icon: Rewind, label: "60-min replay", key: "b-replay" },
  ],
  industrial: [
    { to: "/industrial", icon: LayoutDashboard, label: "Plant overview", key: "i-overview" },
    { to: "/industrial/twin", icon: Map, label: "3D plant twin", key: "i-twin" },
    { to: "/industrial/lines", icon: Factory, label: "Production lines", key: "i-lines" },
    { to: "/industrial/machines", icon: Cog, label: "Machines", key: "i-mach" },
    { to: "/industrial/sensors", icon: Gauge, label: "Sensors telemetry", key: "i-sensors" },
    { to: "/industrial/quality", icon: FlaskConical, label: "Quality control", key: "i-qual" },
    { to: "/industrial/safety", icon: ShieldCheck, label: "Safety & OSHA", key: "i-safety" },
    { to: "/industrial/alerts", icon: AlertTriangle, label: "Alerts & events", key: "i-alerts" },
    { to: "/industrial/replay", icon: Rewind, label: "60-min replay", key: "i-replay" },
  ],
  energy: [
    { to: "/energy", icon: LayoutDashboard, label: "Grid overview", key: "e-overview" },
    { to: "/energy/twin", icon: Map, label: "3D grid twin", key: "e-twin" },
    { to: "/energy/substations", icon: TowerControl, label: "Substations", key: "e-subs" },
    { to: "/energy/transformers", icon: Wrench, label: "Transformers", key: "e-trf" },
    { to: "/energy/feeders", icon: LineChart, label: "Feeders & load", key: "e-feed" },
    { to: "/energy/renewables", icon: Sun, label: "Solar & wind", key: "e-ren" },
    { to: "/energy/battery", icon: Fuel, label: "Battery reserves", key: "e-batt" },
    { to: "/energy/alerts", icon: AlertTriangle, label: "Alerts & events", key: "e-alerts" },
    { to: "/energy/replay", icon: Rewind, label: "60-min replay", key: "e-replay" },
  ],
  water: [
    { to: "/water", icon: LayoutDashboard, label: "Network overview", key: "w-overview" },
    { to: "/water/twin", icon: Map, label: "3D network twin", key: "w-twin" },
    { to: "/water/reservoirs", icon: Droplets, label: "Reservoirs", key: "w-res" },
    { to: "/water/pumps", icon: Waves, label: "Pumps", key: "w-pumps" },
    { to: "/water/valves", icon: Lock, label: "Valves & pipelines", key: "w-valves" },
    { to: "/water/quality", icon: Microscope, label: "Water quality", key: "w-qual" },
    { to: "/water/leaks", icon: AlertTriangle, label: "Leak detection", key: "w-leaks" },
    { to: "/water/alerts", icon: AlertTriangle, label: "Alerts & events", key: "w-alerts" },
    { to: "/water/replay", icon: Rewind, label: "60-min replay", key: "w-replay" },
  ],
};

function domainNav(domainId) {
  const base = DOMAIN_NAVS[domainId] || [];
  return [
    { to: "/", icon: Home, label: "Digital twins", key: "back-platform", perm: "overview" },
    ...base.map(n => ({ ...n, perm: "overview" })),
    { to: "/data-sources", icon: Database, label: "Data sources", key: "d-data", perm: "overview" },
    { to: "/audit", icon: Fingerprint, label: "Audit log", key: "d-audit", perm: "audit" },
  ];
}

const BRANDS = {
  platform: { glyph: "TWIN", strong: "DIGITAL TWIN OS", small: "MULTI-DOMAIN PLATFORM", mode: "PLATFORM" },
  traffic:  { glyph: "TRA", strong: "TRAFFIC TWIN", small: "TRANSPORTATION OPS", mode: "TRAFFIC CORE" },
  hospital: { glyph: "HOS", strong: "HOSPITAL TWIN", small: "HEALTHCARE OPS", mode: "HOSPITAL CORE" },
  building: { glyph: "BLD", strong: "BUILDING TWIN", small: "FACILITY OPS", mode: "BUILDING CORE" },
  industrial: { glyph: "IND", strong: "INDUSTRIAL TWIN", small: "PLANT OPS", mode: "INDUSTRIAL CORE" },
  energy:   { glyph: "ENR", strong: "ENERGY TWIN", small: "GRID OPS", mode: "ENERGY CORE" },
  water:    { glyph: "WTR", strong: "WATER TWIN", small: "NETWORK OPS", mode: "WATER CORE" },
};

export default function Sidebar() {
  const { user, has, hasDomain } = useAuth();
  const { activeDomain } = useDomains();
  const key = activeDomain || "platform";
  const brand = BRANDS[key];
  const rawNav = key === "platform" ? PLATFORM_NAV : (key === "traffic" ? TRAFFIC_NAV : domainNav(key));
  const items = rawNav.filter(n => {
    if (!has(n.perm) && n.perm !== "overview") return false;
    // Platform-level nav: hide domain entries user cannot access, but still show as locked
    return true;
  });
  return (
    <aside className={`side-rail side-rail-${key}`} data-testid="sidebar-nav" data-domain={key}>
      <div className="brand-mark" data-testid="brand-mark">
        <div className="brand-glyph">{brand.glyph}</div>
        <div><strong>{brand.strong}</strong><span>{brand.small}</span></div>
      </div>
      <div className="rail-status" data-testid={`sidebar-mode-${key}`}><span className="pulse-dot" /> {brand.mode}</div>
      <nav className="rail-nav">
        {items.map(({to, icon:Icon, label, key: itemKey, badge}) => {
          // Detect domain-scoped platform links (/traffic, /hospital ...) and lock them if no access
          const domainMatch = to.match(/^\/(traffic|hospital|building|industrial|energy|water)$/);
          const dom = domainMatch ? domainMatch[1] : null;
          const locked = dom && !hasDomain(dom);
          if (locked) {
            return (
              <div key={itemKey} className="rail-item rail-locked" data-testid={`nav-${itemKey}-locked`} title="Restricted for your role">
                <Icon size={15}/> <span>{label}</span> <b className="lock-badge">🔒</b>
              </div>
            );
          }
          return (
            <NavLink key={itemKey} to={to}
              end={to === "/" || to === "/traffic" || to === `/${activeDomain}`}
              className={({isActive}) => isActive ? "rail-item active" : "rail-item"}
              data-testid={`nav-${itemKey}`}>
              <Icon size={15} />
              <span>{label}</span>
              {badge && <b>{String(badge).padStart(2,"0")}</b>}
            </NavLink>
          );
        })}
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

export { DOMAIN_LABELS };
