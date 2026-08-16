import { NavLink } from "react-router-dom";
import { Building2, Car, Droplet, Factory, Hospital, Layers3, Zap } from "lucide-react";
import { useDomains } from "../state/DomainContext";

const ICONS = { traffic: Car, hospital: Hospital, building: Building2,
                industrial: Factory, energy: Zap, water: Droplet };

export default function DomainSwitcher() {
  const { domains, activeDomain, switchDomain } = useDomains();
  const list = domains.length ? domains : [
    {id:"traffic"},{id:"hospital"},{id:"building"},{id:"industrial"},{id:"energy"},{id:"water"}
  ];
  return (
    <div className="domain-switcher" data-testid="domain-switcher">
      <NavLink to="/" className="domain-registry-link" data-testid="domain-registry-link">
        <Layers3 size={12}/> PLATFORM HOME
      </NavLink>
      <div className="domain-select" data-testid="domain-select">
        <span className="section-kicker">ACTIVE DOMAIN</span>
        <div className="domain-select-row">
          {list.map(d => {
            const Icon = ICONS[d.id] || Car;
            return (
              <button key={d.id} onClick={() => switchDomain(d.id)}
                className={d.id === activeDomain ? "domain-chip on" : "domain-chip"}
                title={d.name || d.id} data-testid={`domain-chip-${d.id}`}>
                <Icon size={12}/> {d.id.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
