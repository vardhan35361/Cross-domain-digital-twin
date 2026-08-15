import { useEffect, useState } from "react";
import { Bell, ChevronRight, LogOut, Radio, Sparkles } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useTwin } from "../state/TwinContext";

export default function TopBar({ title, kicker, onOpenAssistant }) {
  const { overview, incidents, liveFeeds, lastUpdate } = useTwin();
  const { user, logout } = useAuth();
  const [clock, setClock] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  const criticalIncident = incidents.find(i => i.status === "active") || incidents[0];
  const feeds = liveFeeds?.feeds || {};
  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow"><span className="live-dot"/> {kicker || "COMMAND CENTER / HYDERABAD METRO"}</div>
          <h1>{title}</h1>
        </div>
        <div className="top-actions">
          <div className="clock" data-testid="topbar-clock">
            <span>LOCAL TIME</span>
            <strong>{clock.toLocaleTimeString([], {hour12:false})}</strong>
            <small>IST · {clock.toDateString().toUpperCase()}</small>
          </div>
          <button className="icon-btn" data-testid="notifications-button" aria-label="notifications"><Bell size={16}/><i>{overview.active_incidents || 3}</i></button>
          <button className="assistant-trigger" onClick={onOpenAssistant} data-testid="open-assistant-button"><Sparkles size={14}/> ASK AIRA</button>
          {user && <button className="icon-btn" onClick={logout} data-testid="logout-button" title={`Sign out ${user.name}`} aria-label="logout"><LogOut size={15}/></button>}
        </div>
      </header>
      <div className="ticker" data-testid="live-alert-ticker">
        <Radio size={14}/><strong>LIVE ALERT</strong>
        <span>{criticalIncident ? `${criticalIncident.type} · ${criticalIncident.location}` : "All corridors nominal"}</span>
        <span className="ticker-sep">//</span>
        <span>Twin sync {lastUpdate ? lastUpdate.toLocaleTimeString([], {hour12:false}) : "…"}</span>
        <ChevronRight size={14}/>
      </div>
      <div className="feed-strip" data-testid="live-feed-status">
        <span className="feed-title"><span className="pulse-dot"/> ADAPTER STATUS</span>
        {["traffic","weather","cctv","signals","dispatch"].map(feed => (
          <span className="feed-chip" key={feed} data-testid={`feed-chip-${feed}`}>
            <i className={feeds[feed]?.live ? "feed-live" : "feed-seeded"}/>
            {feed} <b>{feeds[feed]?.live ? "LIVE" : "SEEDED"}</b>
          </span>
        ))}
        <span className="feed-updated">last sync · {lastUpdate ? lastUpdate.toLocaleTimeString([], {hour12:false}) : "—"}</span>
      </div>
    </>
  );
}
