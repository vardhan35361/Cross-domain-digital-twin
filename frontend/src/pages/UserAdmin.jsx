import { useEffect, useState } from "react";
import { RefreshCw, UserCheck, UserX } from "lucide-react";
import { api } from "../services/api";
import { Panel } from "../shared/Panel";

export default function UserAdmin() {
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(null);
  const load = async () => { try { setUsers(await api.users()); } catch (_) { void 0; } };
  useEffect(() => { load(); }, []);
  const toggle = async (u) => {
    setBusy(u.id);
    try { if (u.active) await api.userDeactivate(u.id); else await api.userReactivate(u.id); await load(); }
    catch (_) { void 0; } finally { setBusy(null); }
  };
  return (
    <div className="page" data-testid="page-users">
      <div className="section-heading">
        <div><span className="section-kicker">USER ADMIN / 15</span><h2>Officer directory</h2></div>
        <button className="outline-btn" onClick={load} data-testid="reload-users-button"><RefreshCw size={12}/> RELOAD</button>
      </div>
      <Panel kicker="ACCOUNTS" title="Command floor roster" testId="users-panel">
        <div className="table-head" style={{gridTemplateColumns: "100px 1fr 1.4fr 140px 140px 100px"}}>
          <span>STATUS</span><span>OFFICER</span><span>EMAIL</span><span>ROLE</span><span>ZONE</span><span>ACTION</span>
        </div>
        {users.map(u => (
          <div key={u.id} className="table-row" style={{gridTemplateColumns: "100px 1fr 1.4fr 140px 140px 100px"}} data-testid={`user-row-${u.role}`}>
            <div><span className={`status-dot ${u.active !== false ? "green" : "red"}`}/><small>{u.active !== false ? "active" : "inactive"}</small></div>
            <div><strong>{u.name}</strong><span>{u.zone || "—"}</span></div>
            <span>{u.email}</span>
            <span>{u.role}</span>
            <span>{u.zone || "—"}</span>
            <button className="row-action" disabled={busy === u.id} onClick={() => toggle(u)} data-testid={`user-toggle-${u.role}`}>
              {u.active !== false ? <UserX size={13}/> : <UserCheck size={13} color="#00ff88"/>}
            </button>
          </div>
        ))}
        {users.length === 0 && <div className="empty-row">No officers loaded yet.</div>}
      </Panel>
    </div>
  );
}
