import { Link, useNavigate } from "react-router-dom";
import { Lock, ShieldAlert } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { Panel } from "../shared/Panel";

export default function AccessDenied({ requestedDomain }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const domains = user?.domains || [];
  const primaryDomain = domains.includes("*") ? "traffic" : (domains[0] || null);
  return (
    <div className="page platform-home" data-testid="page-access-denied">
      <div className="platform-hero" data-testid="access-denied-hero">
        <div>
          <span className="section-kicker">ACCESS RESTRICTED</span>
          <h1><ShieldAlert size={40} style={{verticalAlign:"middle", marginRight:12}}/>
            403 · <em>{requestedDomain?.toUpperCase()} DOMAIN</em>
          </h1>
          <p>You do not have permission to access the <b>{requestedDomain}</b> digital twin.
             Your role and assigned domains are shown below.</p>
        </div>
        <div className="hero-badges">
          <span className="badge-chip"><Lock size={13}/> {(user?.role_label || "").toUpperCase()}</span>
        </div>
      </div>
      <Panel kicker="ROLE" title="Your assigned scope" testId="access-denied-scope">
        <div className="platform-status-grid">
          <div><strong>Role:</strong> {user?.role_label}</div>
          <div><strong>Email:</strong> {user?.email}</div>
          <div><strong>Assigned domains:</strong>&nbsp;
            {domains.includes("*") ? "ALL" : (domains.join(", ").toUpperCase() || "NONE")}
          </div>
          <div><strong>Requested domain:</strong> {requestedDomain?.toUpperCase()} · DENIED</div>
        </div>
        <div style={{marginTop:16, display:"flex", gap:8}}>
          <button className="op-btn op-btn-cyan op-btn-sm" onClick={() => nav("/")} data-testid="access-denied-back">Return to platform home</button>
          {primaryDomain && (
            <Link to={`/${primaryDomain}`} className="op-btn op-btn-slate op-btn-sm" data-testid="access-denied-primary">
              Go to my domain ({primaryDomain.toUpperCase()})
            </Link>
          )}
        </div>
      </Panel>
    </div>
  );
}

/** Wraps a domain route: renders children only if user has access. */
export function DomainRouteGuard({ domain, children }) {
  const { hasDomain, user } = useAuth();
  if (!user || user === false) return null;
  if (!hasDomain(domain)) return <AccessDenied requestedDomain={domain}/>;
  return children;
}
