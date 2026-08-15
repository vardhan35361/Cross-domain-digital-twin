import { Sparkles, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

export default function PredictiveAI() {
  const { predictions } = useTwin();
  if (!predictions) return <div className="page" data-testid="page-predictive"><p>Loading forecast…</p></div>;
  const horizons = predictions.horizons || [];
  return (
    <div className="page" data-testid="page-predictive">
      <div className="section-heading">
        <div><span className="section-kicker">PREDICTIVE AI / 04</span><h2>Forecast & recommendations</h2></div>
        <div className="system-live"><Sparkles size={12}/> MODEL v1.2 · 86% confidence</div>
      </div>
      <div className="predictive-grid">
        <Panel kicker="HORIZONS" title="Congestion forecast" testId="predictive-horizons-panel">
          <div className="forecast-list">
            {horizons.map(h => (
              <div key={h.label} className="forecast-row" data-testid={`horizon-${h.label.replace(" ","-")}`}>
                <div><strong>{h.label}</strong><span>congestion index</span></div>
                <strong className={h.trend === "up" ? "trend-up" : "trend-down"}>
                  {h.trend === "up" ? <TrendingUp size={13}/> : <TrendingDown size={13}/>} {h.value}<small>/100</small>
                </strong>
                <div className="forecast-confidence">
                  <span style={{width: `${h.confidence}%`}}/><em>{h.confidence}%</em>
                </div>
              </div>
            ))}
          </div>
          {predictions.recommendation && (
            <div className="recommendation"><Sparkles size={13}/><span>{predictions.recommendation}</span></div>
          )}
        </Panel>
        <Panel kicker="TRAVEL TIME" title="ETA by corridor" testId="predictive-eta-panel">
          <div className="eta-list">
            {Object.entries(predictions.travel_time || {}).map(([k, v]) => (
              <div key={k} className="eta-row" data-testid={`eta-${k.slice(0,6)}`}>
                <span>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel kicker="SIGNAL OPTIMISATION" title="Recommended overrides" testId="predictive-signals-panel">
          <div className="rec-list">
            {(predictions.signal_recommendations || []).map(rec => (
              <div key={rec.corridor} className="rec-row" data-testid={`rec-${rec.corridor.slice(0,6)}`}>
                <div><strong>{rec.corridor}</strong><span>{rec.action}</span></div>
                <em><Zap size={12} color="#00ff88"/> {rec.expected_gain}</em>
              </div>
            ))}
          </div>
        </Panel>
        <Panel kicker="INCIDENT SPREAD" title="Probability" testId="predictive-spread-panel">
          <div className="spread-card">
            <strong>{predictions.spread_probability}%</strong>
            <span>chance of congestion propagation from {predictions.bottleneck}</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
