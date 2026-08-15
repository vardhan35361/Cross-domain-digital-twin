import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

function formatDetail(detail) {
  if (!detail) return "Unable to sign in";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" ");
  if (detail.msg) return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // null = checking, false = anon, obj = signed in
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.me()
      .then(u => setUser(u))
      .catch(() => setUser(false))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    setError("");
    try {
      const { user: u } = await api.login(email, password);
      setUser(u);
      return u;
    } catch (e) {
      setError(formatDetail(e.response?.data?.detail) || e.message);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch (_) { void 0; }
    setUser(false);
  }, []);

  const has = useCallback((perm) => {
    if (!user || user === false) return false;
    if (user.permissions?.includes("*")) return true;
    return user.permissions?.includes(perm) || false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, checking, error, login, logout, has }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
