import { AlertTriangle, CarFront, CloudRain, Gauge, ShieldAlert, Train, TrafficCone, Wind } from "lucide-react";
import { useTwin } from "../state/TwinContext";
import { Metric, Panel } from "../shared/Panel";
import TwinScene from "../scene/TwinScene";

export default function CityOverview() {
  const { overview, incidents, weather, predictions } = useTwin();
  const criticalAlerts = incidents.filter(i => i.status === "active").slice(0, 3);
  return (
    <div className="page" data-testid="page-overview">
      <section className="overview-section">
        <div className="section-heading">
          <div><span className="section-kicker">CITY PULSE / 01</span><h2>Command overview</h2></div>
          <div className="system-live"><span className="pulse-dot"/> ALL CORRIDORS STREAMING</div>
        </div>
        <div className="metrics-grid">
          <Metric label="Active vehicles" value={overview.active_vehicles} suffix=" live" icon={CarFront} trend="↑ 4.8% vs 17:00"/>
          <Metric label="Average speed" value={overview.average_speed} suffix=" km/h" icon={Gauge} tone="green" trend="↑ 2.1 km/h"/>
          <Metric label="Congestion index" value={overview.congestion_index} suffix=" / 100" icon={TrafficCone} tone="amber" trend="↑ 3.6 this hour"/>
          <Metric label="Air quality" value={overview.air_quality} suffix=" AQI" icon={Wind} tone="blue" trend="Moderate · stable"/>
          <Metric label="Active incidents" value={overview.active_incidents} suffix=" priority" icon={AlertTriangle} tone="red" trend="2 require action"/>
        </div>
      </section>
      <section className="twin-layout">
        <Panel kicker="SPATIAL MODEL / 02" title="Hyderabad metropolitan twin" testId="overview-twin-panel"
          right={<span className="view-tag"><span className="pulse-dot"/> 3D LIVE</span>} className="twin-panel">
          <div className="twin-canvas">
            <TwinScene cinematic />
            <div className="map-hud top-left"><span className="hud-label">NETWORK COVERAGE</span>
              <strong>GHMC · ORR · NH44 · NH65</strong><small>24 zones · 37 corridors</small></div>
            <div className="map-hud top-right"><span className="hud-label">CAMERA FEED</span>
              <strong>CAM-07 / RAIDURG</strong><small><span className="record-dot"/> streaming 1080p</small></div>
            <div className="map-legend">
              <span><i className="legend-line green"/> Free flow</span>
              <span><i className="legend-line amber"/> Moderate</span>
              <span><i className="legend-line red"/> Saturated</span>
              <span><i className="legend-dot"/> Emergency</span>
            </div>
          </div>
        </Panel>
        <div className="side-stack">
          <Panel title={<><span className="red-bar"/>Priority response</>} testId="overview-priority-panel">
            {criticalAlerts.length === 0 && <div className="empty-row">No critical incidents.</div>}
            {criticalAlerts.map(inc => (
              <div className="alert-row" key={inc.id} data-testid={`alert-${inc.id}`}>
                <span className="alert-icon" style={{color: inc.color}}>{inc.type === "Accident" ? <ShieldAlert size={16}/> : <CloudRain size={16}/>}</span>
                <div><strong>{inc.type} <i>{inc.id}</i></strong><span>{inc.location}</span></div>
                <em className={`severity ${inc.severity}`}>{inc.severity}</em>
              </div>
            ))}
          </Panel>
          <Panel title={<><Train size={14} color="#00ff88"/> Metro</>} right={<span className="live-tag">LIVE</span>} testId="overview-metro-panel">
            <div className="metro-summary">
              <strong>{overview.metro_status || "ALL LINES OPERATIONAL"}</strong>
              <span>Red · Blue · Green — average headway 4 min</span>
            </div>
          </Panel>
          <Panel title={<><CloudRain size={14} color="#00f3ff"/> Atmospherics</>} right={<span className="live-tag">LIVE</span>} testId="overview-weather-panel">
            <div className="weather-main">
              <div><strong>{weather?.temperature || 29}°</strong><span>{weather?.condition || "Clear skies"}</span></div>
              <CloudRain size={34} strokeWidth={1} color="#00f3ff"/>
            </div>
            <div className="weather-stats">
              <span>HUMIDITY <strong>{weather?.humidity || 52}%</strong></span>
              <span>VISIBILITY <strong>{weather?.visibility || 96}%</strong></span>
            </div>
          </Panel>
        </div>
      </section>
      {predictions?.recommendation && (
        <div className="recommendation" data-testid="overview-recommendation">
          <span>{predictions.recommendation}</span>
        </div>
      )}
    </div>
  );
}
