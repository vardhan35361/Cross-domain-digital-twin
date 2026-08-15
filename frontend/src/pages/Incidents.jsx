import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Siren, X } from "lucide-react";
import { api } from "../services/api";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

const TYPES = ["Accident", "Road closure", "Signal failure", "Public event", "Rain cell", "Metro disruption", "VIP movement"];

export default function Incidents() {
  const { incidents, setIncidents } = useTwin();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ type: "Accident", location: "", severity: "high", impact: "Response requested" });
  const create = async e => {
    e.preventDefault();
    if (!draft.location.trim()) return;
    try {
      const created = await api.createIncident(draft);
      setIncidents([created, ...incidents]);
    } catch (_) {
      setIncidents([{id:`INC-${Date.now()}`, ...draft, status:"active", age:"now", color:"#ff0055", assigned:"—", eta:"—"}, ...incidents]);
    }
    setOpen(false); setDraft({ type: "Accident", location: "", severity: "high", impact: "Response requested" });
  };
  const resolve = async (id) => {
    try { const updated = await api.resolveIncident(id);
      setIncidents(incidents.map(i => i.id === id ? updated : i));
    } catch (_) { setIncidents(incidents.map(i => i.id === id ? {...i, status:"resolved"} : i)); }
  };
  return (
    <div className="page" data-testid="page-incidents">
      <div className="section-heading">
        <div><span className="section-kicker">INCIDENTS / 05</span><h2>Incident management</h2></div>
        <button className="outline-btn" onClick={() => setOpen(true)} data-testid="create-incident-button">
          <AlertTriangle size={13}/> LOG INCIDENT
        </button>
      </div>
      <Panel kicker="ACTIVE QUEUE" title="Response desk" testId="incidents-table-panel">
        <div className="table-head">
          <span>STATUS</span><span>EVENT / LOCATION</span><span>ASSIGNED</span><span>AGE</span><span>IMPACT</span><span>ACTION</span>
        </div>
        {incidents.map(inc => (
          <div className="table-row" key={inc.id} data-testid={`incident-row-${inc.id}`}>
            <div><span className={`status-dot ${inc.status === "active" ? "red" : inc.status === "resolved" ? "green" : "amber"}`}/>
              <small>{inc.status}</small></div>
            <div><strong>{inc.type}</strong><span>{inc.location} · {inc.id}</span></div>
            <span>{inc.assigned || "—"}</span>
            <span>{inc.age}</span>
            <span>{inc.impact}</span>
            <button className="row-action" onClick={() => inc.status !== "resolved" && resolve(inc.id)}
              aria-label={`Resolve ${inc.id}`} data-testid={`incident-action-${inc.id}`}>
              {inc.status === "resolved" ? <CheckCircle2 size={13} color="#00ff88"/> : <ChevronRight size={14}/>}
            </button>
          </div>
        ))}
      </Panel>
      {open && (
        <div className="modal-backdrop" data-testid="incident-modal" role="dialog" aria-modal="true">
          <form className="incident-modal" onSubmit={create}>
            <div className="panel-head">
              <div><span className="section-kicker">RESPONSE DESK</span><h2>Log an incident</h2></div>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} data-testid="close-incident-modal-button" aria-label="close"><X size={16}/></button>
            </div>
            <label>Event type
              <select value={draft.type} onChange={e => setDraft({...draft, type: e.target.value})} data-testid="incident-type-select">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>Location
              <input value={draft.location} onChange={e => setDraft({...draft, location: e.target.value})}
                placeholder="e.g. Jubilee Hills Checkpost" data-testid="incident-location-input"/>
            </label>
            <label>Impact
              <input value={draft.impact} onChange={e => setDraft({...draft, impact: e.target.value})}
                data-testid="incident-impact-input"/>
            </label>
            <div className="modal-actions">
              <button type="button" className="control-btn" onClick={() => setOpen(false)} data-testid="cancel-incident-button">CANCEL</button>
              <button type="submit" className="assistant-trigger" data-testid="submit-incident-button">
                <Siren size={13}/> DISPATCH RESPONSE
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
