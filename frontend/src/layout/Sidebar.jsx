import { NavLink } from "react-router-dom";
import { Activity, AlertTriangle, BarChart3, Camera, Cog, Cpu, Crown, Database, Fingerprint, Map, Plane, Radio, Route, ShieldAlert, Signal, Sparkles, TowerControl, UsersRound } from "lucide-react";
import { useAuth } from "../state/AuthContext";

const NAV = [
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
  { to: "/replay", icon: Radio, label: "Replay & timeline", key: "replay", perm: "replay" },
  { to: "/live", icon: Activity, label: "Live data", key: "live", perm: "live" },
  { to: "/system", icon: Cpu, label: "System monitor", key: "system", perm: "*" },
  { to: "/users", icon: UsersRound, label: "User admin", key: "users", perm: "*" },
  { to: "/audit", icon: Fingerprint, label: "Audit logs", key: "audit", perm: "audit" },
  { to: "/settings", icon: Cog, label: "Settings", key: "settings", perm: "*" },
];

export default function Sidebar() {
  const { user, has } = useAuth();
  const items = NAV.filter(n => has(n.perm) || n.perm === "overview");
  return (
    <aside className="side-rail" data-testid="sidebar-nav">
      <div className="brand-mark" data-testid="brand-mark">
        <div className="brand-glyph">HYD</div>
        <div><strong>ITMS</strong><span>HYDERABAD · TELANGANA</span></div>
      </div>
      <div className="rail-status"><span className="pulse-dot" /> LIVE CORE</div>
      <nav className="rail-nav">
        {items.map(({to, icon:Icon, label, key, badge}) => (
          <NavLink key={key} to={to} end={to === "/"}
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
