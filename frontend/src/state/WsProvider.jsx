import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const WsContext = createContext(null);

const WS_URL = `${(process.env.REACT_APP_BACKEND_URL || "").replace(/^http/, "ws")}/api/ws/twins`;

/**
 * Single multiplexed WebSocket for ALL domains.
 * Subscribers register a callback and receive every {kind, data} envelope.
 * The provider auto-reconnects with exponential back-off and sends heartbeats.
 */
export function WsProvider({ children }) {
  const [status, setStatus] = useState("CONNECTING");
  const [snapshots, setSnapshots] = useState({});   // per-domain latest snapshot
  const [lastEvent, setLastEvent] = useState(null); // most recent operator action / event envelope
  const wsRef = useRef(null);
  const subscribersRef = useRef(new Set());
  const backoffRef = useRef(1000);
  const heartbeatRef = useRef(null);

  useEffect(() => {
    let closed = false;
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        setStatus("CONNECTING");
        ws.onopen = () => {
          if (closed) return;
          setStatus("CONNECTED");
          backoffRef.current = 1000;
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = setInterval(() => {
            try { ws.readyState === 1 && ws.send("ping"); } catch (_) { /* noop */ void 0; }
          }, 20000);
        };
        ws.onmessage = ev => {
          try {
            const msg = JSON.parse(ev.data);
            const { kind, data } = msg;
            if (kind === "domain_snapshot" && data?.domain) {
              setSnapshots(prev => ({ ...prev, [data.domain]: {
                state: data.state, kpis: data.kpis, tick: data.tick,
                scenario: data.scenario, running: data.running,
                updated_at: new Date().toISOString(),
              }}));
            } else if (kind === "snapshot" && data) {
              // Traffic domain snapshot
              setSnapshots(prev => ({ ...prev, traffic: {
                state: data, kpis: data.metrics || {}, tick: data.tick,
                scenario: data.scenario, running: true,
                updated_at: new Date().toISOString(),
              }}));
            } else if (kind === "twin_action") {
              setLastEvent({ ...data, kind });
            }
            subscribersRef.current.forEach(fn => { try { fn(msg); } catch (_) { /* noop */ void 0; } });
          } catch (_) { /* noop */ void 0; }
        };
        ws.onerror = () => setStatus("DISCONNECTED");
        ws.onclose = () => {
          setStatus("DISCONNECTED");
          clearInterval(heartbeatRef.current);
          if (!closed) {
            const delay = Math.min(15000, backoffRef.current);
            backoffRef.current = Math.min(15000, backoffRef.current * 1.6);
            setTimeout(connect, delay);
          }
        };
      } catch (_) {
        setStatus("DISCONNECTED");
      }
    };
    connect();
    return () => {
      closed = true;
      clearInterval(heartbeatRef.current);
      try { wsRef.current?.close(); } catch (_) { /* noop */ void 0; }
    };
  }, []);

  const value = useMemo(() => ({
    status, snapshots, lastEvent,
    subscribe(fn) { subscribersRef.current.add(fn); return () => subscribersRef.current.delete(fn); },
    domain(id) { return snapshots[id] || null; },
  }), [status, snapshots, lastEvent]);

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export const useWs = () => useContext(WsContext);
export const useDomainWs = (domain) => {
  const ws = useWs();
  return { snapshot: ws?.domain(domain) || null, status: ws?.status || "DISCONNECTED",
           lastEvent: ws?.lastEvent, subscribe: ws?.subscribe };
};
