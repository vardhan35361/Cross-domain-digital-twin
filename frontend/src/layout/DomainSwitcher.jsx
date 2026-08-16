import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Building2, ChevronDown, Cpu, Droplet, Factory, Hospital, Layers3, Zap } from "lucide-react";
import { useDomains } from "../state/DomainContext";

const ICONS = { traffic: Cpu, hospital: Hospital, building: Building2,
                industrial: Factory, energy: Zap, water: Droplet };

export default function DomainSwitcher() {
  const { domains, activeDomain, switchDomain, setActiveDomain } = useDomains();
  const location = useLocation();
  // Derive active domain from URL when directly navigating to /domains/:domain
  useEffect(() => {
    const match = location.pathname.match(/^\/domains\/([^/]+)/);
    if (match && match[1] !== activeDomain) setActiveDomain(match[1]);
    if (!match && location.pathname === "/" && activeDomain !== "traffic") setActiveDomain("traffic");
  }, [location.pathname, activeDomain, setActiveDomain]);
  const active = domains.find(d => d.id === activeDomain) || {name: "Traffic & Transportation", id: "traffic"};
  return (
    <div className="domain-switcher" data-testid="domain-switcher">
      <NavLink to="/domains" className="domain-registry-link" data-testid="domain-registry-link">
        <Layers3 size={12}/> REGISTRY
      </NavLink>
      <div className="domain-select" data-testid="domain-select">
        <span className="section-kicker">ACTIVE DOMAIN</span>
        <div className="domain-select-row">
          {domains.map(d => {
            const Icon = ICONS[d.id] || Cpu;
            return (
              <button key={d.id} onClick={() => switchDomain(d.id)}
                className={d.id === activeDomain ? "domain-chip on" : "domain-chip"}
                title={d.name} data-testid={`domain-chip-${d.id}`}>
                <Icon size={12}/> {d.id.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
