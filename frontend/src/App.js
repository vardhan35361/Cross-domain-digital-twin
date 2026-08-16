import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { DomainProvider } from "./state/DomainContext";
import { TwinProvider } from "./state/TwinContext";
import { WsProvider } from "./state/WsProvider";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";
import AssistantDrawer from "./layout/AssistantDrawer";
import LoginPage from "./pages/LoginPage";
import PlatformHome from "./pages/PlatformHome";
import CityOverview from "./pages/CityOverview";
import DigitalTwin from "./pages/DigitalTwin";
import Analytics from "./pages/Analytics";
import PredictiveAI from "./pages/PredictiveAI";
import Incidents from "./pages/Incidents";
import Emergency from "./pages/Emergency";
import VipConvoy from "./pages/VipConvoy";
import Signals from "./pages/Signals";
import Replay from "./pages/Replay";
import LiveData from "./pages/LiveData";
import SystemMonitoring from "./pages/SystemMonitoring";
import DroneSurveillance from "./pages/DroneSurveillance";
import CctvNetwork from "./pages/CctvNetwork";
import UserAdmin from "./pages/UserAdmin";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import DataSources from "./pages/DataSources";
import {
  HospitalOverview, HospitalICU, HospitalER, HospitalWards, HospitalEquipment,
  HospitalAmbulances, HospitalPharmacy, HospitalAlerts, HospitalReplay, HospitalTwin,
} from "./pages/hospital/HospitalPages";
import {
  BuildingOverview, BuildingFloors, BuildingHVAC, BuildingElevators, BuildingAccess,
  BuildingEnergy, BuildingSafety, BuildingAlerts, BuildingReplay, BuildingTwin,
} from "./pages/building/BuildingPages";
import {
  IndustrialOverview, IndustrialLines, IndustrialMachines, IndustrialSensors,
  IndustrialQuality, IndustrialSafety, IndustrialAlerts, IndustrialReplay, IndustrialTwin,
} from "./pages/industrial/IndustrialPages";
import {
  EnergyOverview, EnergySubstations, EnergyTransformers, EnergyFeeders,
  EnergyRenewables, EnergyBattery, EnergyAlerts, EnergyReplay, EnergyTwin,
} from "./pages/energy/EnergyPages";
import {
  WaterOverview, WaterReservoirs, WaterPumps, WaterValves,
  WaterQuality, WaterLeaks, WaterAlerts, WaterReplay, WaterTwin,
} from "./pages/water/WaterPages";
import "@/App.css";

const DOMAIN_HEADERS = {
  hospital: { title: <>Hospital <em>Digital Twin</em></>, kicker: "REAL-TIME HEALTHCARE OPERATIONS" },
  building: { title: <>Smart Building <em>Digital Twin</em></>, kicker: "REAL-TIME FACILITY OPERATIONS" },
  industrial: { title: <>Industrial <em>Digital Twin</em></>, kicker: "REAL-TIME PLANT OPERATIONS" },
  energy: { title: <>Energy Infrastructure <em>Digital Twin</em></>, kicker: "REAL-TIME GRID OPERATIONS" },
  water: { title: <>Water Infrastructure <em>Digital Twin</em></>, kicker: "REAL-TIME WATER NETWORK OPERATIONS" },
  traffic: { title: <>Hyderabad Traffic <em>Digital Twin</em></>, kicker: "REAL-TIME TRANSPORTATION OPERATIONS" },
};

const STATIC_HEADERS = {
  "/": { title: <>Multi-Domain <em>Digital Twin Platform</em></>, kicker: "DIGITAL TWIN OPERATING SYSTEM" },
  "/data-sources": { title: <>Data <em>sources</em></>, kicker: "INGESTION CONTROL" },
  "/system": { title: <>System <em>monitoring</em></>, kicker: "DEVOPS DASHBOARD" },
  "/users": { title: <>User <em>administration</em></>, kicker: "PLATFORM ACCESS CONTROL" },
  "/audit": { title: <>Audit <em>& security</em></>, kicker: "ACTIVITY LOG" },
  "/settings": { title: <>Platform <em>settings</em></>, kicker: "PLATFORM CONFIG" },
};

function headerFor(pathname) {
  if (STATIC_HEADERS[pathname]) return STATIC_HEADERS[pathname];
  const seg = pathname.split("/").filter(Boolean)[0];
  if (DOMAIN_HEADERS[seg]) {
    const base = DOMAIN_HEADERS[seg];
    const sub = pathname.split("/")[2];
    if (!sub) return base;
    const label = sub.replace(/-/g, " ");
    return { title: base.title, kicker: `${seg.toUpperCase()} · ${label.toUpperCase()}` };
  }
  return STATIC_HEADERS["/"];
}

function AppShell() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const location = useLocation();
  const header = headerFor(location.pathname);
  return (
    <div className="command-shell" data-testid="command-shell" data-path={location.pathname}>
      <Sidebar />
      <main className="main-stage">
        <TopBar title={header.title} kicker={header.kicker} onOpenAssistant={() => setAssistantOpen(true)} />
        <Routes>
          {/* Platform home */}
          <Route path="/" element={<PlatformHome />} />

          {/* Platform-level utilities */}
          <Route path="/data-sources" element={<DataSources />} />
          <Route path="/system" element={<SystemMonitoring />} />
          <Route path="/users" element={<UserAdmin />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />

          {/* Traffic domain */}
          <Route path="/traffic" element={<CityOverview />} />
          <Route path="/traffic/twin" element={<DigitalTwin />} />
          <Route path="/traffic/analytics" element={<Analytics />} />
          <Route path="/traffic/predictive" element={<PredictiveAI />} />
          <Route path="/traffic/incidents" element={<Incidents />} />
          <Route path="/traffic/emergency" element={<Emergency />} />
          <Route path="/traffic/convoy" element={<VipConvoy />} />
          <Route path="/traffic/signals" element={<Signals />} />
          <Route path="/traffic/drones" element={<DroneSurveillance />} />
          <Route path="/traffic/cctv" element={<CctvNetwork />} />
          <Route path="/traffic/replay" element={<Replay />} />
          <Route path="/traffic/live" element={<LiveData />} />

          {/* Hospital (hero) */}
          <Route path="/hospital" element={<HospitalOverview />} />
          <Route path="/hospital/twin" element={<HospitalTwin />} />
          <Route path="/hospital/icu" element={<HospitalICU />} />
          <Route path="/hospital/er" element={<HospitalER />} />
          <Route path="/hospital/wards" element={<HospitalWards />} />
          <Route path="/hospital/equipment" element={<HospitalEquipment />} />
          <Route path="/hospital/ambulances" element={<HospitalAmbulances />} />
          <Route path="/hospital/pharmacy" element={<HospitalPharmacy />} />
          <Route path="/hospital/alerts" element={<HospitalAlerts />} />
          <Route path="/hospital/replay" element={<HospitalReplay />} />

          {/* Building */}
          <Route path="/building" element={<BuildingOverview />} />
          <Route path="/building/twin" element={<BuildingTwin />} />
          <Route path="/building/floors" element={<BuildingFloors />} />
          <Route path="/building/hvac" element={<BuildingHVAC />} />
          <Route path="/building/elevators" element={<BuildingElevators />} />
          <Route path="/building/access" element={<BuildingAccess />} />
          <Route path="/building/energy" element={<BuildingEnergy />} />
          <Route path="/building/safety" element={<BuildingSafety />} />
          <Route path="/building/alerts" element={<BuildingAlerts />} />
          <Route path="/building/replay" element={<BuildingReplay />} />

          {/* Industrial */}
          <Route path="/industrial" element={<IndustrialOverview />} />
          <Route path="/industrial/twin" element={<IndustrialTwin />} />
          <Route path="/industrial/lines" element={<IndustrialLines />} />
          <Route path="/industrial/machines" element={<IndustrialMachines />} />
          <Route path="/industrial/sensors" element={<IndustrialSensors />} />
          <Route path="/industrial/quality" element={<IndustrialQuality />} />
          <Route path="/industrial/safety" element={<IndustrialSafety />} />
          <Route path="/industrial/alerts" element={<IndustrialAlerts />} />
          <Route path="/industrial/replay" element={<IndustrialReplay />} />

          {/* Energy */}
          <Route path="/energy" element={<EnergyOverview />} />
          <Route path="/energy/twin" element={<EnergyTwin />} />
          <Route path="/energy/substations" element={<EnergySubstations />} />
          <Route path="/energy/transformers" element={<EnergyTransformers />} />
          <Route path="/energy/feeders" element={<EnergyFeeders />} />
          <Route path="/energy/renewables" element={<EnergyRenewables />} />
          <Route path="/energy/battery" element={<EnergyBattery />} />
          <Route path="/energy/alerts" element={<EnergyAlerts />} />
          <Route path="/energy/replay" element={<EnergyReplay />} />

          {/* Water */}
          <Route path="/water" element={<WaterOverview />} />
          <Route path="/water/twin" element={<WaterTwin />} />
          <Route path="/water/reservoirs" element={<WaterReservoirs />} />
          <Route path="/water/pumps" element={<WaterPumps />} />
          <Route path="/water/valves" element={<WaterValves />} />
          <Route path="/water/quality" element={<WaterQuality />} />
          <Route path="/water/leaks" element={<WaterLeaks />} />
          <Route path="/water/alerts" element={<WaterAlerts />} />
          <Route path="/water/replay" element={<WaterReplay />} />

          {/* Legacy aliases */}
          <Route path="/domains" element={<Navigate to="/" replace/>}/>
          <Route path="/domains/:domain/*" element={<Navigate to="/" replace/>}/>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="footer-bar">
          <span>MULTI-DOMAIN DIGITAL TWIN PLATFORM · 3.0.0</span>
          <span><i className="pulse-dot"/> All systems nominal</span>
          <span>DATA REFRESH 2S · WS MULTIPLEX</span>
        </footer>
      </main>
      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <Toaster theme="dark" position="top-right" richColors/>
    </div>
  );
}

function Guarded({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="login-checking" data-testid="auth-checking">Checking session…</div>;
  if (user === false || user == null) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <Guarded>
          <DomainProvider>
            <WsProvider>
              <TwinProvider>
                <AppShell/>
              </TwinProvider>
            </WsProvider>
          </DomainProvider>
        </Guarded>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
