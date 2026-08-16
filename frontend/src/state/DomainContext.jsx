import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";

const DomainContext = createContext(null);

export function DomainProvider({ children }) {
  const [domains, setDomains] = useState([]);
  const [activeDomain, setActiveDomain] = useState(() => localStorage.getItem("hyd.active_domain") || "traffic");
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => { api.domains().then(setDomains).catch(() => void 0); }, []);

  const switchDomain = useCallback((id) => {
    setActiveDomain(id);
    try { localStorage.setItem("hyd.active_domain", id); } catch (_) { void 0; }
    if (id === "traffic") {
      // return to the Traffic command shell root
      nav("/");
    } else {
      nav(`/domains/${id}`);
    }
  }, [nav]);

  return (
    <DomainContext.Provider value={{ domains, activeDomain, switchDomain, setActiveDomain }}>
      {children}
    </DomainContext.Provider>
  );
}
export const useDomains = () => useContext(DomainContext);
