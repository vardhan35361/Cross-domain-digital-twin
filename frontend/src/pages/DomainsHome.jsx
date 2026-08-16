import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight, Building2, Cpu, Droplet, Factory, Hospital, Layers3, Zap } from "lucide-react";
import { api } from "../services/api";
import { Panel } from "../shared/Panel";

const ICONS = { traffic: Cpu, hospital: Hospital, building: Building2,
                industrial: Factory, energy: Zap, water: Droplet };

export default function DomainsHome() {
  const [domains, setDomains] = useState([]);
  useEffect(() => { api.domains().then(setDomains).catch(() => void 0); }, []);
  return (
    <div className="page" data-testid="page-domains">
      <div className="section-heading">
        <div><span className="section-kicker">MULTI-DOMAIN PLATFORM</span><h2><Layers3 size={22} style={{marginRight:8, verticalAlign:"middle"}}/> Digital twin registry</h2></div>
        <div className="system-live"><span className="pulse-dot"/> {domains.length} DOMAINS REGISTERED</div>
      </div>
      <Panel kicker="DEFINITIONS" title="Available digital twins" testId="domains-registry-panel">
        <div className="domain-grid">
          {domains.map(d => {
            const Icon = ICONS[d.id] || Cpu;
            const to = d.id === "traffic" ? "/" : `/domains/${d.id}`;
            return (
              <NavLink key={d.id} to={to} className="domain-card" data-testid={`domain-card-${d.id}`}>
                <div className="domain-card-head">
                  <div className="domain-glyph"><Icon size={22}/></div>
                  <div>
                    <span className="section-kicker">{d.id.toUpperCase()}</span>
                    <strong>{d.name}</strong>
                  </div>
                  {d.flagship && <em className="chip chip-green">FLAGSHIP</em>}
                </div>
                <p>{d.description}</p>
                <div className="domain-card-meta">
                  <span>ENTITIES <b>{(d.entities || []).length}</b></span>
                  <span>SCENARIOS <b>{(d.scenarios || []).length}</b></span>
                  <ArrowRight size={14}/>
                </div>
              </NavLink>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
