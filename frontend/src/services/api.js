import axios from "axios";

axios.defaults.withCredentials = true;

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const WS_URL = `${(process.env.REACT_APP_BACKEND_URL || "").replace(/^http/, "ws")}/api/ws/traffic`;

export const api = {
  overview: () => axios.get(`${API}/overview`).then(r => r.data),
  roads: () => axios.get(`${API}/roads`).then(r => r.data),
  vehicles: () => axios.get(`${API}/vehicles`).then(r => r.data),
  zones: () => axios.get(`${API}/zones`).then(r => r.data),
  incidents: () => axios.get(`${API}/incidents`).then(r => r.data),
  createIncident: (payload) => axios.post(`${API}/incidents`, payload).then(r => r.data),
  resolveIncident: (id) => axios.post(`${API}/incidents/${id}/resolve`).then(r => r.data),
  predictions: () => axios.get(`${API}/predictions`).then(r => r.data),
  trend: () => axios.get(`${API}/analytics/trend`).then(r => r.data),
  zonesAnalytics: () => axios.get(`${API}/analytics/zones`).then(r => r.data),
  peakHours: () => axios.get(`${API}/analytics/peak-hours`).then(r => r.data),
  weather: () => axios.get(`${API}/weather`).then(r => r.data),
  liveStatus: () => axios.get(`${API}/live/status`).then(r => r.data),
  heatmap: () => axios.get(`${API}/heatmap`).then(r => r.data),
  layers: () => axios.get(`${API}/layers`).then(r => r.data),
  setLayer: (layer, enabled) => axios.post(`${API}/layers`, {layer, enabled}).then(r => r.data),
  simControl: (payload) => axios.post(`${API}/simulation/control`, payload).then(r => r.data),
  simStatus: () => axios.get(`${API}/simulation/status`).then(r => r.data),
  emergencyRoute: (payload) => axios.post(`${API}/emergency/routes`, payload).then(r => r.data),
  corridorList: () => axios.get(`${API}/replay/corridors`).then(r => r.data),
  corridorDetail: (id) => axios.get(`${API}/replay/corridors/${id}`).then(r => r.data),
  convoyStart: (payload) => axios.post(`${API}/convoy/start`, payload).then(r => r.data),
  convoyPause: () => axios.post(`${API}/convoy/pause`).then(r => r.data),
  convoyResume: () => axios.post(`${API}/convoy/resume`).then(r => r.data),
  convoyCancel: () => axios.post(`${API}/convoy/cancel`).then(r => r.data),
  convoyStatus: () => axios.get(`${API}/convoy/status`).then(r => r.data),
  signalAdjust: (payload) => axios.post(`${API}/signals/adjust`, payload).then(r => r.data),
  systemHealth: () => axios.get(`${API}/system/health`).then(r => r.data),
  junctions: () => axios.get(`${API}/junctions`).then(r => r.data),
  drones: () => axios.get(`${API}/drones`).then(r => r.data),
  cameras: () => axios.get(`${API}/cameras`).then(r => r.data),
  // multi-domain twin platform
  domains: () => axios.get(`${API}/domains`).then(r => r.data),
  domain: (id) => axios.get(`${API}/domains/${id}`).then(r => r.data),
  twin: (domain) => axios.get(`${API}/twins/${domain}`).then(r => r.data),
  twinEvents: (domain) => axios.get(`${API}/twins/${domain}/events`).then(r => r.data),
  twinAlerts: (domain) => axios.get(`${API}/twins/${domain}/alerts`).then(r => r.data),
  domainSimControl: (domain, payload) => axios.post(`${API}/twins/${domain}/simulation`, payload).then(r => r.data),
  domainSimReset: (domain) => axios.post(`${API}/twins/${domain}/simulation/reset`).then(r => r.data),
  dataSources: () => axios.get(`${API}/data-sources`).then(r => r.data),
  auditList: (limit = 100) => axios.get(`${API}/audit?limit=${limit}`).then(r => r.data),
  users: () => axios.get(`${API}/users`).then(r => r.data),
  userDeactivate: (id) => axios.post(`${API}/users/${id}/deactivate`).then(r => r.data),
  userReactivate: (id) => axios.post(`${API}/users/${id}/reactivate`).then(r => r.data),
  // auth
  login: (email, password) => axios.post(`${API}/auth/login`, {email, password}).then(r => r.data),
  logout: () => axios.post(`${API}/auth/logout`).then(r => r.data),
  me: () => axios.get(`${API}/auth/me`).then(r => r.data),
  seededAccounts: () => axios.get(`${API}/auth/accounts`).then(r => r.data),
};
