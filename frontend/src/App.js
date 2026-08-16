import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { DomainProvider } from "./state/DomainContext";
import { TwinProvider } from "./state/TwinContext";
import { WsProvider } from "./state/WsProvider";
import { DomainRouteGuard } from "./pages/AccessDenied";
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

function DomainOutlet({ domain, children }) {
  return <DomainRouteGuard domain={domain}>{children}</DomainRouteGuard>;
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
          <Route path="/traffic" element={<DomainOutlet domain="traffic"><CityOverview /></DomainOutlet>} />
          <Route path="/traffic/twin" element={<DomainOutlet domain="traffic"><DigitalTwin /></DomainOutlet>} />
          <Route path="/traffic/analytics" element={<DomainOutlet domain="traffic"><Analytics /></DomainOutlet>} />
          <Route path="/traffic/predictive" element={<DomainOutlet domain="traffic"><PredictiveAI /></DomainOutlet>} />
          <Route path="/traffic/incidents" element={<DomainOutlet domain="traffic"><Incidents /></DomainOutlet>} />
          <Route path="/traffic/emergency" element={<DomainOutlet domain="traffic"><Emergency /></DomainOutlet>} />
          <Route path="/traffic/convoy" element={<DomainOutlet domain="traffic"><VipConvoy /></DomainOutlet>} />
          <Route path="/traffic/signals" element={<DomainOutlet domain="traffic"><Signals /></DomainOutlet>} />
          <Route path="/traffic/drones" element={<DomainOutlet domain="traffic"><DroneSurveillance /></DomainOutlet>} />
          <Route path="/traffic/cctv" element={<DomainOutlet domain="traffic"><CctvNetwork /></DomainOutlet>} />
          <Route path="/traffic/replay" element={<DomainOutlet domain="traffic"><Replay /></DomainOutlet>} />
          <Route path="/traffic/live" element={<DomainOutlet domain="traffic"><LiveData /></DomainOutlet>} />

          {/* Hospital (hero) */}
          <Route path="/hospital" element={<DomainOutlet domain="hospital"><HospitalOverview /></DomainOutlet>} />
          <Route path="/hospital/twin" element={<DomainOutlet domain="hospital"><HospitalTwin /></DomainOutlet>} />
          <Route path="/hospital/icu" element={<DomainOutlet domain="hospital"><HospitalICU /></DomainOutlet>} />
          <Route path="/hospital/er" element={<DomainOutlet domain="hospital"><HospitalER /></DomainOutlet>} />
          <Route path="/hospital/wards" element={<DomainOutlet domain="hospital"><HospitalWards /></DomainOutlet>} />
          <Route path="/hospital/equipment" element={<DomainOutlet domain="hospital"><HospitalEquipment /></DomainOutlet>} />
          <Route path="/hospital/ambulances" element={<DomainOutlet domain="hospital"><HospitalAmbulances /></DomainOutlet>} />
          <Route path="/hospital/pharmacy" element={<DomainOutlet domain="hospital"><HospitalPharmacy /></DomainOutlet>} />
          <Route path="/hospital/alerts" element={<DomainOutlet domain="hospital"><HospitalAlerts /></DomainOutlet>} />
          <Route path="/hospital/replay" element={<DomainOutlet domain="hospital"><HospitalReplay /></DomainOutlet>} />

          {/* Building */}
          <Route path="/building" element={<DomainOutlet domain="building"><BuildingOverview /></DomainOutlet>} />
          <Route path="/building/twin" element={<DomainOutlet domain="building"><BuildingTwin /></DomainOutlet>} />
          <Route path="/building/floors" element={<DomainOutlet domain="building"><BuildingFloors /></DomainOutlet>} />
          <Route path="/building/hvac" element={<DomainOutlet domain="building"><BuildingHVAC /></DomainOutlet>} />
          <Route path="/building/elevators" element={<DomainOutlet domain="building"><BuildingElevators /></DomainOutlet>} />
          <Route path="/building/access" element={<DomainOutlet domain="building"><BuildingAccess /></DomainOutlet>} />
          <Route path="/building/energy" element={<DomainOutlet domain="building"><BuildingEnergy /></DomainOutlet>} />
          <Route path="/building/safety" element={<DomainOutlet domain="building"><BuildingSafety /></DomainOutlet>} />
          <Route path="/building/alerts" element={<DomainOutlet domain="building"><BuildingAlerts /></DomainOutlet>} />
          <Route path="/building/replay" element={<DomainOutlet domain="building"><BuildingReplay /></DomainOutlet>} />

          {/* Industrial */}
          <Route path="/industrial" element={<DomainOutlet domain="industrial"><IndustrialOverview /></DomainOutlet>} />
          <Route path="/industrial/twin" element={<DomainOutlet domain="industrial"><IndustrialTwin /></DomainOutlet>} />
          <Route path="/industrial/lines" element={<DomainOutlet domain="industrial"><IndustrialLines /></DomainOutlet>} />
          <Route path="/industrial/machines" element={<DomainOutlet domain="industrial"><IndustrialMachines /></DomainOutlet>} />
          <Route path="/industrial/sensors" element={<DomainOutlet domain="industrial"><IndustrialSensors /></DomainOutlet>} />
          <Route path="/industrial/quality" element={<DomainOutlet domain="industrial"><IndustrialQuality /></DomainOutlet>} />
          <Route path="/industrial/safety" element={<DomainOutlet domain="industrial"><IndustrialSafety /></DomainOutlet>} />
          <Route path="/industrial/alerts" element={<DomainOutlet domain="industrial"><IndustrialAlerts /></DomainOutlet>} />
          <Route path="/industrial/replay" element={<DomainOutlet domain="industrial"><IndustrialReplay /></DomainOutlet>} />

          {/* Energy */}
          <Route path="/energy" element={<DomainOutlet domain="energy"><EnergyOverview /></DomainOutlet>} />
          <Route path="/energy/twin" element={<DomainOutlet domain="energy"><EnergyTwin /></DomainOutlet>} />
          <Route path="/energy/substations" element={<DomainOutlet domain="energy"><EnergySubstations /></DomainOutlet>} />
          <Route path="/energy/transformers" element={<DomainOutlet domain="energy"><EnergyTransformers /></DomainOutlet>} />
          <Route path="/energy/feeders" element={<DomainOutlet domain="energy"><EnergyFeeders /></DomainOutlet>} />
          <Route path="/energy/renewables" element={<DomainOutlet domain="energy"><EnergyRenewables /></DomainOutlet>} />
          <Route path="/energy/battery" element={<DomainOutlet domain="energy"><EnergyBattery /></DomainOutlet>} />
          <Route path="/energy/alerts" element={<DomainOutlet domain="energy"><EnergyAlerts /></DomainOutlet>} />
          <Route path="/energy/replay" element={<DomainOutlet domain="energy"><EnergyReplay /></DomainOutlet>} />

          {/* Water */}
          <Route path="/water" element={<DomainOutlet domain="water"><WaterOverview /></DomainOutlet>} />
          <Route path="/water/twin" element={<DomainOutlet domain="water"><WaterTwin /></DomainOutlet>} />
          <Route path="/water/reservoirs" element={<DomainOutlet domain="water"><WaterReservoirs /></DomainOutlet>} />
          <Route path="/water/pumps" element={<DomainOutlet domain="water"><WaterPumps /></DomainOutlet>} />
          <Route path="/water/valves" element={<DomainOutlet domain="water"><WaterValves /></DomainOutlet>} />
          <Route path="/water/quality" element={<DomainOutlet domain="water"><WaterQuality /></DomainOutlet>} />
          <Route path="/water/leaks" element={<DomainOutlet domain="water"><WaterLeaks /></DomainOutlet>} />
          <Route path="/water/alerts" element={<DomainOutlet domain="water"><WaterAlerts /></DomainOutlet>} />
          <Route path="/water/replay" element={<DomainOutlet domain="water"><WaterReplay /></DomainOutlet>} />

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
