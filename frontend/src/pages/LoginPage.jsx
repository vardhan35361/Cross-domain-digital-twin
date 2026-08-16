import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Building2, Car, Droplets, Factory, Hospital, Layers3, User, Zap } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { api } from "../services/api";

const DOMAIN_ICONS = { traffic: Car, hospital: Hospital, building: Building2, industrial: Factory, energy: Zap, water: Droplets };

export default function LoginPage() {
  const { user, checking, error, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [demoPassword, setDemoPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.seededAccounts().then(d => { setAccounts(d.accounts); setDemoPassword(d.password); }).catch(() => void 0); }, []);
  useEffect(() => { if (user && user !== false) nav("/", {replace: true}); }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try { await login(email, password); nav("/", {replace: true}); }
    catch (_) { /* handled by context */ }
    finally { setBusy(false); }
  };

  const pick = (acc) => { setEmail(acc.email); setPassword(demoPassword); };

  if (checking) return <div className="login-checking" data-testid="login-checking">Checking session…</div>;

  return (
    <div className="login-shell" data-testid="page-login">
      <div className="login-bg" />
      <div className="login-wrap">
        <motion.div className="login-card" initial={{opacity:0, y:24}} animate={{opacity:1, y:0}} data-testid="login-page">
          <div className="login-crest">
            <div className="crest-ring"><Layers3 size={26}/></div>
            <div>
              <span>DIGITAL TWIN OPERATING SYSTEM</span>
              <strong data-testid="platform-title">Multi-Domain Digital Twin Platform</strong>
              <small>Real-time digital twins for physical-world operations</small>
            </div>
          </div>
          <p className="login-pitch" data-testid="platform-pitch">
            Monitor, simulate and operate connected digital twins across
            <b> transportation, healthcare, buildings, industry, energy</b> and <b>water</b> infrastructure — from one unified command surface.
          </p>
          <div className="login-domain-strip" data-testid="login-domain-strip">
            {Object.entries(DOMAIN_ICONS).map(([id, Icon]) => (
              <span key={id} className={`domain-pill domain-pill-${id}`}><Icon size={13}/> {id.toUpperCase()}</span>
            ))}
          </div>
          <form onSubmit={submit} className="login-form">
            <label>Operator email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="operator@twin.platform" data-testid="login-email-input" autoFocus/>
            </label>
            <label>Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" data-testid="login-password-input"/>
            </label>
            {error && <div className="login-error" data-testid="login-error">{error}</div>}
            <button type="submit" disabled={busy} className="login-cta" data-testid="login-submit-button">
              {busy ? <Activity size={14} className="spin"/> : <ArrowRight size={14}/>}
              {busy ? "SIGNING IN…" : "ENTER PLATFORM"}
            </button>
            <div className="login-notes">
              <span>JWT session · bcrypt · 8-hour shift token</span>
              <span>Every operator action is audit-logged</span>
            </div>
          </form>
        </motion.div>
        <div className="login-accounts" data-testid="login-seeded-accounts">
          <div className="accounts-head">
            <span className="section-kicker">DEMO ROLES</span>
            <h2>Sign in as any role</h2>
            <small>Password: <code>{demoPassword || "Twin@2026"}</code></small>
          </div>
          <div className="account-grid">
            {accounts.map(a => {
              const domainList = Array.isArray(a.domains) && a.domains.length ? a.domains : [];
              return (
                <button key={a.email} onClick={() => pick(a)} className="account-card"
                  data-testid={`account-${a.role}`}>
                  <div className="account-avatar"><User size={14}/></div>
                  <div>
                    <strong>{a.role_label}</strong>
                    <span>{a.email}</span>
                    <small>{a.description}</small>
                    <em data-testid={`account-${a.role}-scope`}>ACCESS · {domainList.includes("*") ? "ALL DOMAINS" : (domainList[0] || a.zone || "").toUpperCase()}</em>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="login-footer">
        <span><i className="pulse-dot"/> DIGITAL TWIN OS · SECURE CHANNEL</span>
        <span>© Multi-Domain Digital Twin Platform</span>
      </div>
    </div>
  );
}
