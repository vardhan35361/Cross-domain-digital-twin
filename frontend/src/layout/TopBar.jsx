import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, LogOut, Radio, Sparkles } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useDomains } from "../state/DomainContext";
import { useWs } from "../state/WsProvider";
import DomainSwitcher from "./DomainSwitcher";

function breadcrumb(pathname, activeDomain) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "Digital twins", to: "/" }];
  if (activeDomain) {
    crumbs.push({ label: activeDomain.charAt(0).toUpperCase() + activeDomain.slice(1), to: `/${activeDomain}` });
    if (parts[1]) {
      const rest = parts[1].replace(/-/g, " ");
      crumbs.push({ label: rest.charAt(0).toUpperCase() + rest.slice(1), to: pathname });
    }
  } else if (parts[0]) {
    crumbs.push({ label: parts[0].replace(/-/g, " "), to: pathname });
  }
  return crumbs;
}

export default function TopBar({ title, kicker, onOpenAssistant }) {
  const { user, logout } = useAuth();
  const { activeDomain } = useDomains();
  const ws = useWs();
  const location = useLocation();
  const nav = useNavigate();
  const [clock, setClock] = useState(new Date());
  const [showBell, setShowBell] = useState(false);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  // Cross-domain notifications aggregated from every snapshot
  const notifications = useMemo(() => {
    const items = [];
    Object.entries(ws?.snapshots || {}).forEach(([domain, snap]) => {
      if (!snap) return;
      const state = snap.state || {};
      (state.alerts || []).slice(0, 4).forEach(a => items.push({
        domain, severity: a.severity, message: a.message, at: a.at || snap.updated_at,
      }));
      (state.events || []).filter(e => e.type?.startsWith("action.")).slice(0, 2).forEach(e => items.push({
        domain, severity: "INFO", message: e.description, at: e.at,
      }));
      // Traffic incidents
      if (domain === "traffic") {
        (state.active_incidents || []).slice(0, 3).forEach(i => items.push({
          domain: "traffic", severity: i.severity || "HIGH",
          message: `${i.type} · ${i.location}`, at: i.at || snap.updated_at,
        }));
      }
    });
    return items.sort((a,b) => (b.at || "").localeCompare(a.at || "")).slice(0, 12);
  }, [ws?.snapshots]);

  const crumbs = breadcrumb(location.pathname, activeDomain);
  return (
    <>
      <header className="topbar" data-testid="topbar">
        <div>
          <div className="eyebrow" data-testid="topbar-eyebrow">
            <span className="live-dot"/> {kicker || (activeDomain ? `${activeDomain.toUpperCase()} DOMAIN` : "MULTI-DOMAIN DIGITAL TWIN PLATFORM")}
          </div>
          <h1 data-testid="topbar-title">{title}</h1>
          <nav className="breadcrumb" data-testid="topbar-breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="crumb">
                {i > 0 && <ChevronRight size={12}/>}
                <button onClick={() => nav(c.to)} className={i === crumbs.length - 1 ? "crumb-active" : ""}
                  data-testid={`crumb-${i}`}>{c.label}</button>
              </span>
            ))}
          </nav>
        </div>
        <div className="top-actions">
          <div className="clock" data-testid="topbar-clock">
            <span>LOCAL TIME</span>
            <strong>{clock.toLocaleTimeString([], {hour12:false})}</strong>
            <small>IST · {clock.toDateString().toUpperCase()}</small>
          </div>
          <button className="icon-btn" data-testid="notifications-button" onClick={() => setShowBell(v => !v)} aria-label="notifications">
            <Bell size={16}/>{notifications.length > 0 && <i>{notifications.length}</i>}
          </button>
          {showBell && (
            <div className="notif-popover" data-testid="notif-popover">
              <div className="notif-head">Cross-domain alerts</div>
              {notifications.length === 0
                ? <div className="notif-empty">All domains nominal</div>
                : notifications.map((n, i) => (
                  <div key={i} className={`notif-row notif-sev-${(n.severity||"info").toLowerCase()}`} data-testid={`notif-${i}`}>
                    <span className={`notif-domain notif-${n.domain}`}>[{n.domain.toUpperCase()}]</span>
                    <span className="notif-msg">{n.message}</span>
                    <em>{n.at ? new Date(n.at).toLocaleTimeString() : ""}</em>
                  </div>
                ))}
            </div>
          )}
          <button className="assistant-trigger" onClick={onOpenAssistant} data-testid="open-assistant-button"><Sparkles size={14}/> ASK AIRA</button>
          {user && <button className="icon-btn" onClick={logout} data-testid="logout-button" title={`Sign out ${user.name}`} aria-label="logout"><LogOut size={15}/></button>}
        </div>
      </header>
      <DomainSwitcher />
      <div className="ticker" data-testid="live-alert-ticker">
        <Radio size={14}/><strong>LIVE ALERT</strong>
        <span data-testid="ticker-message">
          {notifications[0]
            ? `[${notifications[0].domain.toUpperCase()}] ${notifications[0].message}`
            : "All domains nominal"}
        </span>
        <span className="ticker-sep">//</span>
        <span>WebSocket · {ws?.status || "PENDING"}</span>
        <ChevronRight size={14}/>
      </div>
    </>
  );
}
