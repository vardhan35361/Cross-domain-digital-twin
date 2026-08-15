import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { TwinProvider } from "./state/TwinContext";
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
};

function AppShell() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const location = useLocation();
  const header = HEADERS[location.pathname] || HEADERS["/"];
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="footer-bar">
          <span>HYD-ITMS / OPERATIONS BUILD 2.5.0</span>
          <span><i className="pulse-dot"/> All systems nominal</span>
          <span>DATA REFRESH 2S · NODE HYD-01</span>
        </footer>
      </main>
      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
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
      <Route path="/*" element={<Guarded><TwinProvider><AppShell/></TwinProvider></Guarded>} />
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
