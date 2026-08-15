import { useState } from "react";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

const SCENARIOS = ["Office hours", "Festival mode", "Rainstorm", "Cricket match", "VIP convoy", "School hours", "Weekend"];
const WEATHERS = ["Clear", "Rainstorm", "Fog"];
const TIMES = ["morning", "day", "evening", "night"];

export default function Settings() {
  const { scenario, controlSimulation, timeOfDay, running, layers, toggleLayer } = useTwin();
  const [busy, setBusy] = useState(false);
  const setScenario = async (s) => { setBusy(true); await controlSimulation({ scenario: s, weather: s === "Rainstorm" ? "Rainstorm" : "Clear" }); setBusy(false); };
  const setWeather = async (w) => { setBusy(true); await controlSimulation({ weather: w }); setBusy(false); };
  const setTime = async (t) => { setBusy(true); await controlSimulation({ time_of_day: t }); setBusy(false); };
  return (
    <div className="page" data-testid="page-settings">
      <div className="section-heading">
        <div><span className="section-kicker">SETTINGS / 17</span><h2>Simulation & platform configuration</h2></div>
        <div className="system-live"><span className="pulse-dot"/> SIMULATION {running ? "RUNNING" : "PAUSED"}</div>
      </div>
      <div className="settings-grid">
        <Panel kicker="SCENARIO" title="Operational profile" testId="settings-scenario-panel">
          <div className="scenario-buttons">
            {SCENARIOS.map(s => (
              <button key={s} disabled={busy} className={scenario === s ? "scenario active" : "scenario"}
                onClick={() => setScenario(s)} data-testid={`settings-scenario-${s.split(" ")[0].toLowerCase()}`}>{s}</button>
            ))}
          </div>
        </Panel>
        <Panel kicker="ENVIRONMENT" title="Weather + time of day" testId="settings-environment-panel">
          <div className="scenario-buttons">
            {WEATHERS.map(w => (
              <button key={w} disabled={busy} className="scenario" onClick={() => setWeather(w)}
                data-testid={`settings-weather-${w.toLowerCase()}`}>{w}</button>
            ))}
          </div>
          <div className="scenario-buttons">
            {TIMES.map(t => (
              <button key={t} disabled={busy} className={timeOfDay === t ? "scenario active" : "scenario"}
                onClick={() => setTime(t)} data-testid={`settings-time-${t}`}>{t}</button>
            ))}
          </div>
        </Panel>
        <Panel kicker="LAYERS" title="Default layer visibility" testId="settings-layers-panel">
          <div className="layer-toggle-list">
            {Object.entries(layers).map(([k, v]) => (
              <button key={k} className={v ? "layer-btn on" : "layer-btn"} onClick={() => toggleLayer(k)}
                data-testid={`settings-layer-${k}`}>
                <i/> {k}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
