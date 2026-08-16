import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";

const DomainContext = createContext(null);

// Deduce the active domain from URL path so refresh works everywhere
function domainFromPath(pathname) {
  if (!pathname || pathname === "/" || pathname.startsWith("/platform") || pathname === "/domains") return null;
  const seg = pathname.split("/").filter(Boolean)[0];
  if (["traffic", "hospital", "building", "industrial", "energy", "water"].includes(seg)) return seg;
  if (seg === "domains") {
    const d = pathname.split("/")[2];
    return ["hospital", "building", "industrial", "energy", "water"].includes(d) ? d : null;
  }
  return null;
}

export function DomainProvider({ children }) {
  const [domains, setDomains] = useState([]);
  const location = useLocation();
  const activeDomain = domainFromPath(location.pathname); // null = platform home
  const nav = useNavigate();

  useEffect(() => { api.domains().then(setDomains).catch(() => void 0); }, []);

  const switchDomain = useCallback((id) => {
    if (id === null || id === "platform") { nav("/"); return; }
    nav(`/${id}`);
  }, [nav]);

  return (
    <DomainContext.Provider value={{ domains, activeDomain, switchDomain }}>
      {children}
    </DomainContext.Provider>
  );
}
export const useDomains = () => useContext(DomainContext);
