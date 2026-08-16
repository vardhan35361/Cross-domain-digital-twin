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
import DomainsHome from "./pages/DomainsHome";
import DomainTwin from "./pages/DomainTwin";
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

const HEADERS = {
  "/": { title: <>City <em>pulse</em></>, kicker: "COMMAND CENTER / OVERVIEW" },
  "/twin": { title: <>3D <em>metropolitan twin</em></>, kicker: "SPATIAL MODEL / HYDERABAD" },
  "/analytics": { title: <>Traffic <em>analytics</em></>, kicker: "ANALYTICS WORKSPACE" },
  "/predictive": { title: <>Predictive <em>AI</em></>, kicker: "FORECAST CENTER" },
  "/incidents": { title: <>Incident <em>management</em></>, kicker: "RESPONSE DESK" },
  "/emergency": { title: <>Emergency <em>operations</em></>, kicker: "GREEN CORRIDOR CONSOLE" },
  "/convoy": { title: <>VIP <em>convoy</em></>, kicker: "PROTECTED MOVEMENT" },
  "/signals": { title: <>Signal <em>control</em></>, kicker: "ADAPTIVE SIGNAL CENTER" },
  "/drones": { title: <>Drone <em>surveillance</em></>, kicker: "AERIAL MONITORING" },
  "/cctv": { title: <>CCTV <em>network</em></>, kicker: "CAMERA SURVEILLANCE" },
  "/replay": { title: <>Replay & <em>timeline</em></>, kicker: "OPERATIONAL PLAYBACK" },
  "/live": { title: <>Live <em>integrations</em></>, kicker: "ADAPTER MATRIX" },
  "/system": { title: <>System <em>monitoring</em></>, kicker: "DEVOPS DASHBOARD" },
  "/users": { title: <>User <em>administration</em></>, kicker: "ACCESS CONTROL" },
  "/audit": { title: <>Audit <em>& security</em></>, kicker: "ACTIVITY LOG" },
  "/settings": { title: <>Simulation <em>settings</em></>, kicker: "PLATFORM CONFIG" },
  "/domains": { title: <>Digital twin <em>registry</em></>, kicker: "MULTI-DOMAIN PLATFORM" },
  "/data-sources": { title: <>Data <em>sources</em></>, kicker: "INGESTION CONTROL" },
};

function headerFor(pathname) {
  if (HEADERS[pathname]) return HEADERS[pathname];
  if (pathname.startsWith("/domains/")) {
    const [, , domain, mod] = pathname.split("/");
    const nice = mod ? mod.replace(/-/g, " ") : "overview";
    return { title: <>{domain} <em>· {nice}</em></>,
             kicker: `${domain.toUpperCase()} · ${nice.toUpperCase()}` };
  }
  return HEADERS["/"];
}

function AppShell() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const location = useLocation();
  const header = headerFor(location.pathname);
  return (
    <div className="command-shell" data-testid="command-shell">
      <Sidebar />
      <main className="main-stage">
        <TopBar title={header.title} kicker={header.kicker} onOpenAssistant={() => setAssistantOpen(true)} />
        <Routes>
          <Route path="/" element={<CityOverview />} />
          <Route path="/twin" element={<DigitalTwin />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/predictive" element={<PredictiveAI />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/convoy" element={<VipConvoy />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/drones" element={<DroneSurveillance />} />
          <Route path="/cctv" element={<CctvNetwork />} />
          <Route path="/replay" element={<Replay />} />
          <Route path="/live" element={<LiveData />} />
          <Route path="/system" element={<SystemMonitoring />} />
          <Route path="/users" element={<UserAdmin />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/domains" element={<DomainsHome />} />
          <Route path="/data-sources" element={<DataSources />} />

          {/* Hospital (hero) */}
          <Route path="/domains/hospital" element={<HospitalOverview />} />
          <Route path="/domains/hospital/twin" element={<HospitalTwin />} />
          <Route path="/domains/hospital/icu" element={<HospitalICU />} />
          <Route path="/domains/hospital/er" element={<HospitalER />} />
          <Route path="/domains/hospital/wards" element={<HospitalWards />} />
          <Route path="/domains/hospital/equipment" element={<HospitalEquipment />} />
          <Route path="/domains/hospital/ambulances" element={<HospitalAmbulances />} />
          <Route path="/domains/hospital/pharmacy" element={<HospitalPharmacy />} />
          <Route path="/domains/hospital/alerts" element={<HospitalAlerts />} />
          <Route path="/domains/hospital/replay" element={<HospitalReplay />} />

          {/* Building */}
          <Route path="/domains/building" element={<BuildingOverview />} />
          <Route path="/domains/building/twin" element={<BuildingTwin />} />
          <Route path="/domains/building/floors" element={<BuildingFloors />} />
          <Route path="/domains/building/hvac" element={<BuildingHVAC />} />
          <Route path="/domains/building/elevators" element={<BuildingElevators />} />
          <Route path="/domains/building/access" element={<BuildingAccess />} />
          <Route path="/domains/building/energy" element={<BuildingEnergy />} />
          <Route path="/domains/building/safety" element={<BuildingSafety />} />
          <Route path="/domains/building/alerts" element={<BuildingAlerts />} />
          <Route path="/domains/building/replay" element={<BuildingReplay />} />

          {/* Industrial */}
          <Route path="/domains/industrial" element={<IndustrialOverview />} />
          <Route path="/domains/industrial/twin" element={<IndustrialTwin />} />
          <Route path="/domains/industrial/lines" element={<IndustrialLines />} />
          <Route path="/domains/industrial/machines" element={<IndustrialMachines />} />
          <Route path="/domains/industrial/sensors" element={<IndustrialSensors />} />
          <Route path="/domains/industrial/quality" element={<IndustrialQuality />} />
          <Route path="/domains/industrial/safety" element={<IndustrialSafety />} />
          <Route path="/domains/industrial/alerts" element={<IndustrialAlerts />} />
          <Route path="/domains/industrial/replay" element={<IndustrialReplay />} />

          {/* Energy */}
          <Route path="/domains/energy" element={<EnergyOverview />} />
          <Route path="/domains/energy/twin" element={<EnergyTwin />} />
          <Route path="/domains/energy/substations" element={<EnergySubstations />} />
          <Route path="/domains/energy/transformers" element={<EnergyTransformers />} />
          <Route path="/domains/energy/feeders" element={<EnergyFeeders />} />
          <Route path="/domains/energy/renewables" element={<EnergyRenewables />} />
          <Route path="/domains/energy/battery" element={<EnergyBattery />} />
          <Route path="/domains/energy/alerts" element={<EnergyAlerts />} />
          <Route path="/domains/energy/replay" element={<EnergyReplay />} />

          {/* Water */}
          <Route path="/domains/water" element={<WaterOverview />} />
          <Route path="/domains/water/twin" element={<WaterTwin />} />
          <Route path="/domains/water/reservoirs" element={<WaterReservoirs />} />
          <Route path="/domains/water/pumps" element={<WaterPumps />} />
          <Route path="/domains/water/valves" element={<WaterValves />} />
          <Route path="/domains/water/quality" element={<WaterQuality />} />
          <Route path="/domains/water/leaks" element={<WaterLeaks />} />
          <Route path="/domains/water/alerts" element={<WaterAlerts />} />
          <Route path="/domains/water/replay" element={<WaterReplay />} />

          {/* Legacy fallback for traffic / catchall */}
          <Route path="/domains/:domain" element={<DomainTwin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="footer-bar">
          <span>HYD-ITMS / OPERATIONS BUILD 2.5.0</span>
          <span><i className="pulse-dot"/> All systems nominal</span>
          <span>DATA REFRESH 2S · NODE HYD-01</span>
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
