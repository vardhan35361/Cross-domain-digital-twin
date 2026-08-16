import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "../services/api";
import { Panel } from "../shared/Panel";

const BADGE = { LIVE: "chip chip-green", SIMULATED: "chip chip-amber",
  SEEDED: "chip chip-amber", OFFLINE: "chip" };

export default function DataSources() {
  const [rows, setRows] = useState([]);
  const load = async () => { try { setRows(await api.dataSources()); } catch (_) { void 0; } };
  useEffect(() => { load(); const id = setInterval(load, 6000); return () => clearInterval(id); }, []);
  return (
    <div className="page" data-testid="page-datasources">
      <div className="section-heading">
        <div><span className="section-kicker">INGESTION</span><h2>Data source control center</h2></div>
        <button className="outline-btn" onClick={load} data-testid="reload-datasources-button"><RefreshCw size={12}/> REFRESH</button>
      </div>
      <Panel kicker="ADAPTER MATRIX" title="All ingestion inputs" testId="datasources-panel">
        <div className="table-head" style={{gridTemplateColumns: "160px 1.4fr 120px 120px 1fr"}}>
          <span>DOMAIN</span><span>NAME</span><span>TYPE</span><span>STATUS</span><span>LAST UPDATE</span>
        </div>
        {rows.map(r => (
          <div key={r.id} className="table-row" style={{gridTemplateColumns: "160px 1.4fr 120px 120px 1fr"}} data-testid={`datasource-row-${r.id}`}>
            <span>{r.domain}</span>
            <div><strong>{r.name}</strong><span>{r.id}</span></div>
            <span className={BADGE[r.type] || "chip"}>{r.type}</span>
            <span>{r.status}</span>
            <span>{r.last_update ? new Date(r.last_update).toLocaleTimeString([], {hour12:false}) : "—"} · {r.latency_ms ? `${r.latency_ms}ms` : r.records ? `${r.records} records` : ""}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}
