import { NavLink } from "react-router-dom";
import { Activity, AlertTriangle, BarChart3, Bot, Building2, Circle, Cpu, Crown, Map, Radio, Route, ShieldAlert, Signal, Sparkles, TowerControl } from "lucide-react";

const NAV = [
  { to: "/", icon: TowerControl, label: "City overview", key: "overview" },
  { to: "/twin", icon: Map, label: "3D digital twin", key: "twin" },
  { to: "/analytics", icon: BarChart3, label: "Traffic analytics", key: "analytics" },
  { to: "/predictive", icon: Sparkles, label: "Predictive AI", key: "predictive" },
  { to: "/incidents", icon: ShieldAlert, label: "Incidents", key: "incidents", badge: 3 },
  { to: "/emergency", icon: Route, label: "Emergency ops", key: "emergency" },
  { to: "/convoy", icon: Crown, label: "VIP convoy", key: "convoy" },
  { to: "/signals", icon: Signal, label: "Signal control", key: "signals" },
  { to: "/replay", icon: Radio, label: "Replay & timeline", key: "replay" },
  { to: "/live", icon: Activity, label: "Live data", key: "live" },
  { to: "/system", icon: Cpu, label: "System monitor", key: "system" },
];

export default function Sidebar() {
  return (
    <aside className="side-rail" data-testid="sidebar-nav">
      <div className="brand-mark" data-testid="brand-mark">
        <div className="brand-glyph">HYD</div>
        <div><strong>TRAFFIC</strong><span>DIGITAL TWIN · ITMS</span></div>
      </div>
      <div className="rail-status"><span className="pulse-dot" /> LIVE CORE</div>
      <nav className="rail-nav">
        {NAV.map(({to, icon:Icon, label, key, badge}) => (
          <NavLink key={key} to={to} end={to === "/"}
            className={({isActive}) => isActive ? "rail-item active" : "rail-item"}
            data-testid={`nav-${key}`}>
            <Icon size={16} />
            <span>{label}</span>
            {badge && <b>{String(badge).padStart(2,"0")}</b>}
          </NavLink>
        ))}
      </nav>
      <div className="rail-bottom">
        <div className="operator" data-testid="operator-card">
          <div className="operator-avatar">AS</div>
          <div><strong>A. Sharma</strong><span>Shift commander</span></div>
          <Circle size={8} fill="#00ff66" color="#00ff66" />
        </div>
      </div>
    </aside>
  );
}
