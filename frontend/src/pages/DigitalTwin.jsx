import { useState } from "react";
import { Crosshair, Layers3, Moon, Pause, Play, Sun } from "lucide-react";
import TwinScene from "../scene/TwinScene";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

const LAYERS = [
  { key: "traffic", label: "Traffic density" }, { key: "heatmap", label: "Signal heatmap" },
  { key: "incidents", label: "Incidents" }, { key: "weather", label: "Weather" },
  { key: "corridors", label: "Emergency corridors" }, { key: "metro", label: "Metro layer" },
  { key: "drone", label: "Drone overlay" }, { key: "buildings", label: "Buildings" },
];

export default function DigitalTwin() {
  const { layers, toggleLayer, running, controlSimulation, timeOfDay, setTimeOfDay, overview, heatmap } = useTwin();
  const [cinematic, setCinematic] = useState(true);
  const bottleneck = heatmap.filter(h => h.saturation > 80).length;
  const toggleTime = async () => {
    const next = timeOfDay === "night" ? "evening" : "night";
    setTimeOfDay(next); controlSimulation({ time_of_day: next });
  };
  return (
    <div className="page twin-page" data-testid="page-twin">
      <div className="twin-fullscreen">
        <TwinScene cinematic={cinematic} />
        <div className="twin-overlay-top">
          <div className="hud-card"><span className="hud-label">NETWORK</span><strong>GHMC + ORR + NH44/NH65</strong><small>24 zones · 37 corridors · 6 metro segments</small></div>
          <div className="hud-card"><span className="hud-label">FLEET</span><strong>{overview.active_vehicles} vehicles</strong><small>{bottleneck} saturated corridors</small></div>
          <div className="hud-card"><span className="hud-label">MODE</span><strong>{cinematic ? "CINEMATIC ORBIT" : "OPERATOR"}</strong><small>Zoom · Pan · Fly-through</small></div>
        </div>
        <div className="twin-overlay-right">
          <Panel title={<><Layers3 size={14}/> Layer control</>} testId="layer-control">
            <div className="layer-toggle-list">
              {LAYERS.map(l => (
                <button key={l.key} className={layers[l.key] ? "layer-btn on" : "layer-btn"}
                  onClick={() => toggleLayer(l.key)} data-testid={`layer-toggle-${l.key}`}>
                  <i /> {l.label}
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <div className="twin-overlay-bottom">
          <button className="control-btn" onClick={() => controlSimulation({ running: !running })} data-testid="simulation-toggle-button">
            {running ? <Pause size={12}/> : <Play size={12}/>} {running ? "PAUSE" : "RESUME"}
          </button>
          <button className="control-btn" onClick={() => setCinematic(c => !c)} data-testid="cinematic-toggle-button">
            <Crosshair size={12}/> {cinematic ? "OPERATOR VIEW" : "CINEMATIC"}
          </button>
          <button className="control-btn" onClick={toggleTime} data-testid="time-of-day-toggle">
            {timeOfDay === "night" ? <Sun size={12}/> : <Moon size={12}/>} {timeOfDay === "night" ? "DAY" : "NIGHT"}
          </button>
          <div className="twin-legend">
            <span><i style={{background:"#00ff88"}}/> Free flow</span>
            <span><i style={{background:"#ffe14d"}}/> Moderate</span>
            <span><i style={{background:"#ff9a3c"}}/> Heavy</span>
            <span><i style={{background:"#ff2050"}}/> Saturated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
