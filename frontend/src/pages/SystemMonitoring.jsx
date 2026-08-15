import { useEffect, useState } from "react";
import { Activity, Cpu, Database, HardDrive, Radio, RefreshCw, Server } from "lucide-react";
import { api } from "../services/api";
import { Metric, Panel } from "../shared/Panel";

export default function SystemMonitoring() {
  const [health, setHealth] = useState(null);
  const [tick, setTick] = useState(0);
  const load = async () => { try { setHealth(await api.systemHealth()); } catch (_) { void 0; } };
  useEffect(() => { load(); const id = setInterval(load, 4000); return () => clearInterval(id); }, []);
  const h = health || {};
  return (
    <div className="page" data-testid="page-system">
      <div className="section-heading">
        <div><span className="section-kicker">DEVOPS / 11</span><h2>System monitoring</h2></div>
        <button className="outline-btn" onClick={load} data-testid="reload-system-button"><RefreshCw size={12}/> REFRESH</button>
      </div>
      <div className="metrics-grid">
        <Metric label="Backend" value={h.backend?.status?.toUpperCase() || "…"} icon={Server} tone="green" trend={`uptime ${Math.round(h.backend?.uptime_seconds || 0)}s`}/>
        <Metric label="WebSocket" value={h.websocket?.clients ?? 0} suffix=" clients" icon={Radio} tone="cyan" trend={h.websocket?.status || "—"}/>
        <Metric label="Database" value={h.database?.status?.toUpperCase() || "—"} icon={Database} tone="blue" trend={h.database?.type || ""}/>
        <Metric label="Simulation" value={h.simulation?.tick ?? 0} suffix=" ticks" icon={Activity} tone="amber" trend={`target ${h.simulation?.fps_target || 30} FPS`}/>
        <Metric label="CPU" value={h.cpu_percent ?? 0} suffix="%" icon={Cpu} tone="red" trend={`mem ${h.memory_mb || 0} MB`}/>
      </div>
      <div className="system-grid">
        <Panel kicker="LATENCY" title="API percentiles" testId="system-latency-panel">
          <div className="latency-row" data-testid="latency-p50"><span>p50</span><strong>{h.api_latency_ms?.p50 ?? "—"} ms</strong></div>
          <div className="latency-row" data-testid="latency-p95"><span>p95</span><strong>{h.api_latency_ms?.p95 ?? "—"} ms</strong></div>
          <div className="latency-row" data-testid="latency-p99"><span>p99</span><strong>{h.api_latency_ms?.p99 ?? "—"} ms</strong></div>
        </Panel>
        <Panel kicker="INFRASTRUCTURE" title="Container topology" testId="system-infra-panel">
          <div className="infra-row"><HardDrive size={13}/><strong>traffic-twin-backend</strong><span>FastAPI · :8001</span><em className="chip chip-green">running</em></div>
          <div className="infra-row"><HardDrive size={13}/><strong>traffic-twin-frontend</strong><span>React · :3000</span><em className="chip chip-green">running</em></div>
          <div className="infra-row"><Database size={13}/><strong>mongodb</strong><span>persistent</span><em className="chip chip-green">connected</em></div>
          <div className="infra-row"><Radio size={13}/><strong>nginx</strong><span>reverse proxy · TLS</span><em className="chip chip-green">healthy</em></div>
        </Panel>
        <Panel kicker="EVENTS" title="Processing throughput" testId="system-events-panel">
          <div className="event-row"><span>events / sec</span><strong>{h.event_rate_per_sec ?? "—"}</strong></div>
          <div className="event-row"><span>simulation state</span><strong>{h.simulation?.running ? "RUNNING" : "PAUSED"}</strong></div>
          <div className="event-row"><span>memory</span><strong>{h.memory_mb ?? "—"} MB</strong></div>
        </Panel>
      </div>
    </div>
  );
}
