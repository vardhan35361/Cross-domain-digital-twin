import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TwinProvider } from "./state/TwinContext";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";
import AssistantDrawer from "./layout/AssistantDrawer";
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
  "/replay": { title: <>Replay & <em>timeline</em></>, kicker: "OPERATIONAL PLAYBACK" },
  "/live": { title: <>Live <em>integrations</em></>, kicker: "ADAPTER MATRIX" },
  "/system": { title: <>System <em>monitoring</em></>, kicker: "DEVOPS DASHBOARD" },
};

function AppShell() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const header = HEADERS[path] || HEADERS["/"];
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
          <Route path="/replay" element={<Replay />} />
          <Route path="/live" element={<LiveData />} />
          <Route path="/system" element={<SystemMonitoring />} />
        </Routes>
        <footer className="footer-bar">
          <span>HYD-TWIN / OPERATIONS BUILD 2.0.0</span>
          <span><i className="pulse-dot"/> All systems nominal</span>
          <span>DATA REFRESH 2S · NODE HYD-01</span>
        </footer>
      </main>
      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TwinProvider>
        <AppShell />
      </TwinProvider>
    </BrowserRouter>
  );
}
