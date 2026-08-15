import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "../services/api";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

export default function LiveData() {
  const { liveFeeds, reload, lastUpdate } = useTwin();
  const feeds = liveFeeds?.feeds || {};
  const rows = ["traffic", "weather", "cctv", "signals", "dispatch"].map(k => ({key: k, ...(feeds[k] || {})}));
  return (
    <div className="page" data-testid="page-live">
      <div className="section-heading">
        <div><span className="section-kicker">INTEGRATIONS / 10</span><h2>Live data & adapters</h2></div>
        <button className="outline-btn" onClick={reload} data-testid="reload-live-button"><RefreshCw size={12}/> RECONNECT</button>
      </div>
      <Panel kicker="ADAPTER MATRIX" title="Feed health" testId="live-matrix-panel"
        right={<span className="live-tag">last sync · {lastUpdate ? lastUpdate.toLocaleTimeString([], {hour12:false}) : "—"}</span>}>
        <div className="table-head six">
          <span>FEED</span><span>PROVIDER</span><span>MODE</span><span>HEALTH</span><span>CONFIGURED</span><span>LAST UPDATE</span>
        </div>
        {rows.map(r => (
          <div key={r.key} className="table-row six" data-testid={`live-row-${r.key}`}>
            <div><span className={`status-dot ${r.live ? "green" : "amber"}`}/><small>{r.key}</small></div>
            <span>{r.provider || "—"}</span>
            <span className={r.live ? "chip chip-green" : "chip chip-amber"}>{r.live ? "LIVE" : "SEEDED"}</span>
            <span>{r.health || "—"}</span>
            <span>{r.configured ? "yes" : "no"}</span>
            <span>{r.last_update ? new Date(r.last_update).toLocaleTimeString([], {hour12:false}) : "—"}</span>
          </div>
        ))}
      </Panel>
      <Panel kicker="ENVIRONMENT" title="Configuration guide" testId="live-env-panel">
        <div className="env-guide">
          <div className="env-row" data-testid="env-tomtom">
            <strong>TOMTOM_API_KEY</strong>
            <span>Add to <code>/app/backend/.env</code>. When present, adapter automatically switches to LIVE mode.</span>
          </div>
          <div className="env-row" data-testid="env-openweather">
            <strong>OPENWEATHER_API_KEY</strong>
            <span>Add to <code>/app/backend/.env</code>. Fallback continues to serve seeded weather when key is missing.</span>
          </div>
          <div className="env-row" data-testid="env-emergent-llm">
            <strong>EMERGENT_LLM_KEY</strong>
            <span>Powers AIRA streaming assistant via Emergent integrations proxy.</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
