import { useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { api } from "../services/api";
import { Panel } from "../shared/Panel";

const ICON = {
  "auth.login": "✓", "auth.logout": "↩", "auth.login_failed": "✕",
  "signal.override": "⇢", "user.deactivate": "‒", "user.reactivate": "＋",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");
  const load = async () => { try { setLogs(await api.auditList(200)); } catch (_) { void 0; } };
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);
  const shown = filter === "all" ? logs : logs.filter(l => l.action.startsWith(filter));
  const kinds = ["all", "auth", "signal", "user"];
  return (
    <div className="page" data-testid="page-audit">
      <div className="section-heading">
        <div><span className="section-kicker">AUDIT & SECURITY / 16</span><h2>Immutable activity log</h2></div>
        <button className="outline-btn" onClick={load} data-testid="reload-audit-button"><RefreshCw size={12}/> REFRESH</button>
      </div>
      <div className="audit-toolbar">
        {kinds.map(k => (
          <button key={k} className={filter === k ? "zone-chip on" : "zone-chip"}
            onClick={() => setFilter(k)} data-testid={`audit-filter-${k}`}>{k.toUpperCase()}</button>
        ))}
      </div>
      <Panel kicker="EVENTS" title={`${shown.length} recent events`} testId="audit-panel">
        <div className="table-head" style={{gridTemplateColumns: "180px 160px 140px 1fr 100px"}}>
          <span>TIMESTAMP</span><span>ACTOR</span><span>ACTION</span><span>TARGET / META</span><span>IP</span>
        </div>
        {shown.map(l => (
          <div key={l.id} className="table-row" style={{gridTemplateColumns: "180px 160px 140px 1fr 100px"}}
            data-testid={`audit-row-${l.action.replace(/\./g,"-")}`}>
            <span>{l.created_at ? new Date(l.created_at).toLocaleString() : "—"}</span>
            <div><strong>{l.actor_email}</strong><span>{l.actor_role}</span></div>
            <div><strong>{ICON[l.action] || "•"} {l.action}</strong></div>
            <span>{l.target} {l.meta && Object.keys(l.meta).length ? "· " + JSON.stringify(l.meta) : ""}</span>
            <span>{l.ip}</span>
          </div>
        ))}
        {shown.length === 0 && <div className="empty-row"><ShieldAlert size={14}/> No audit events for this filter.</div>}
      </Panel>
    </div>
  );
}
