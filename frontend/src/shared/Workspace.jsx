import { useState } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
import { Panel, Metric, Chip } from "./Panel";

/** Compact state badge used across every workspace. */
export function StateBadge({ state }) {
  const map = { NORMAL: "cyan", WARNING: "amber", CRITICAL: "red", OFFLINE: "slate", MAINTENANCE: "amber" };
  return <Chip tone={map[state] || "slate"}>{state || "—"}</Chip>;
}

/** Executes an operator action against POST /api/twins/{domain}/action. */
export function ActionButton({ domain, action, params, label, tone = "cyan", confirm, disabled, testId, onDone, size = "sm" }) {
  const [pending, setPending] = useState(false);
  const doAction = async () => {
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    try {
      const res = await api.twinAction(domain, action, params);
      toast.success(`${label} · ${action}`, { description: JSON.stringify(res.result).slice(0, 120) });
      onDone?.(res);
    } catch (e) {
      toast.error("Action failed", { description: e.response?.data?.detail || e.message });
    } finally {
      setPending(false);
    }
  };
  return (
    <button className={`op-btn op-btn-${tone} op-btn-${size}`} onClick={doAction} disabled={pending || disabled}
      data-testid={testId || `action-${domain}-${action}`}>
      {pending ? "…" : label}
    </button>
  );
}

/** Column-based entity table for workspaces (beds, machines, transformers, valves…). */
export function EntityTable({ rows, columns, testId, empty = "No entries" }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-cell" data-testid={`${testId}-empty`}>{empty}</div>;
  }
  return (
    <div className="entity-table" data-testid={testId}>
      <div className="et-head">
        {columns.map(c => <div key={c.key} style={{ flex: c.flex || 1, textAlign: c.align || "left" }}>{c.label}</div>)}
      </div>
      <div className="et-body">
        {rows.map((row, i) => (
          <div key={row.id || i} className={`et-row et-state-${(row.state || "").toLowerCase()}`}
            data-testid={`${testId}-row-${row.id || i}`}>
            {columns.map(c => (
              <div key={c.key} style={{ flex: c.flex || 1, textAlign: c.align || "left" }}>
                {c.render ? c.render(row) : row[c.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Uniform KPI grid used at the top of every workspace. */
export function KpiGrid({ items }) {
  return (
    <div className="metric-grid" data-testid="kpi-grid">
      {items.map(it => (
        <Metric key={it.label} label={it.label} value={it.value} suffix={it.suffix} icon={it.icon} tone={it.tone || "cyan"} />
      ))}
    </div>
  );
}

export { Panel };
