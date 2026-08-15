import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, WS_URL } from "../services/api";

const TwinContext = createContext(null);

const FALLBACK_OVERVIEW = { active_vehicles: 240, average_speed: 34.2, congestion_index: 61.4,
  air_quality: 66, weather: "Clear", active_incidents: 3, emergency_response: "GREEN CORRIDOR READY",
  simulation_tick: 0, metro_status: "ALL LINES OPERATIONAL" };

export function TwinProvider({ children }) {
  const [overview, setOverview] = useState(FALLBACK_OVERVIEW);
  const [zones, setZones] = useState([]);
  const [roads, setRoads] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [trend, setTrend] = useState([]);
  const [zonesAnalytics, setZonesAnalytics] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [weather, setWeather] = useState({condition:"Clear", temperature:29, humidity:52, visibility:96});
  const [scenario, setScenario] = useState("Office hours");
  const [running, setRunning] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState("evening");
  const [liveFeeds, setLiveFeeds] = useState({ enabled: false, feeds: {} });
  const [layers, setLayers] = useState({traffic:true, heatmap:true, incidents:true, weather:true,
    corridors:true, metro:true, drone:false, buildings:true});
  const [convoy, setConvoy] = useState(null);
  const [corridors, setCorridors] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const [o, z, r, v, h, i, p, t, za, ph, w, l, cor, sh] = await Promise.all([
        api.overview(), api.zones(), api.roads(), api.vehicles(), api.heatmap(),
        api.incidents(), api.predictions(), api.trend(), api.zonesAnalytics(), api.peakHours(),
        api.weather(), api.liveStatus(), api.corridorList(), api.systemHealth(),
      ]);
      setOverview(o); setZones(z); setRoads(r); setVehicles(v); setHeatmap(h.segments);
      setIncidents(i); setPredictions(p); setTrend(t); setZonesAnalytics(za); setPeakHours(ph);
      setWeather(w); setLiveFeeds(l); setCorridors(cor); setSystemHealth(sh);
      setLastUpdate(new Date());
    } catch (e) { /* keep fallback state */ void 0; }
  }, []);

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 6000);
    try {
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;
      socket.onmessage = event => {
        try {
          const msg = JSON.parse(event.data);
          const data = msg.data || msg;
          if (data.metrics) setOverview(data.metrics);
          if (data.vehicles) setVehicles(data.vehicles);
          if (data.roads) setRoads(data.roads);
          if (data.heatmap) setHeatmap(data.heatmap);
          if (data.convoy !== undefined) setConvoy(data.convoy);
          if (data.layers) setLayers(data.layers);
          setLastUpdate(new Date());
        } catch (_) { /* noop */ void 0; }
      };
    } catch (_) { /* websocket optional */ void 0; }
    return () => { clearInterval(timer); if (wsRef.current) wsRef.current.close(); };
  }, [loadAll]);

  const controlSimulation = async (payload) => {
    try { const res = await api.simControl(payload);
      if (res.running !== undefined) setRunning(res.running);
      if (res.scenario) setScenario(res.scenario);
      if (res.time_of_day) setTimeOfDay(res.time_of_day);
    } catch (_) { void 0; }
  };
  const toggleLayer = async (layer) => {
    const next = !layers[layer]; setLayers(prev => ({...prev, [layer]: next}));
    try { await api.setLayer(layer, next); } catch (_) { void 0; }
  };
  const value = { overview, zones, roads, vehicles, heatmap, incidents, setIncidents, predictions,
    trend, zonesAnalytics, peakHours, weather, scenario, setScenario, running, setRunning, timeOfDay,
    setTimeOfDay, liveFeeds, layers, toggleLayer, convoy, setConvoy, corridors, setCorridors,
    systemHealth, lastUpdate, controlSimulation, reload: loadAll };
  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
}
export const useTwin = () => useContext(TwinContext);
