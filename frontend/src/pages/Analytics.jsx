import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTwin } from "../state/TwinContext";
import { Panel } from "../shared/Panel";

const AXIS = { fill: "#6f8b9f", fontSize: 10 };

export default function Analytics() {
  const { trend, zonesAnalytics, peakHours } = useTwin();
  return (
    <div className="page" data-testid="page-analytics">
      <div className="section-heading">
        <div><span className="section-kicker">ANALYTICS / 03</span><h2>Traffic analytics</h2></div>
        <div className="system-live"><span className="pulse-dot"/> AUTO-REFRESH · 6s</div>
      </div>
      <div className="analytics-grid">
        <Panel kicker="LIVE TREND" title="Congestion & average speed" testId="analytics-trend-panel">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trend}>
                <defs><linearGradient id="tCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f3ff" stopOpacity={0.32}/><stop offset="100%" stopColor="#00f3ff" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid stroke="#0f2a3d" strokeDasharray="3 3"/>
                <XAxis dataKey="time" tick={AXIS} axisLine={false} tickLine={false}/>
                <YAxis tick={AXIS} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#0b1a2a", border:"1px solid #126074", fontSize:12}}/>
                <Area type="monotone" dataKey="congestion" stroke="#00f3ff" fill="url(#tCyan)" strokeWidth={2}/>
                <Line type="monotone" dataKey="speed" stroke="#00ff88" strokeWidth={1.6} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel kicker="ZONE COMPARISON" title="Congestion by zone" testId="analytics-zones-panel">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={zonesAnalytics.slice(0, 12)} margin={{left:0, right:6, top:6}}>
                <CartesianGrid stroke="#0f2a3d" strokeDasharray="3 3"/>
                <XAxis dataKey="zone" tick={{...AXIS, fontSize:9}} axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={44}/>
                <YAxis tick={AXIS} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#0b1a2a", border:"1px solid #126074", fontSize:12}}/>
                <Bar dataKey="congestion">
                  {zonesAnalytics.slice(0, 12).map((z, i) => (
                    <Cell key={i} fill={z.congestion > 75 ? "#ff2050" : z.congestion > 55 ? "#ff9a3c" : "#00d9ff"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel kicker="PEAK-HOUR ANALYSIS" title="Daily congestion curve" testId="analytics-peak-panel">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={peakHours}>
                <defs><linearGradient id="tAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff9a3c" stopOpacity={0.5}/><stop offset="100%" stopColor="#ff9a3c" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid stroke="#0f2a3d" strokeDasharray="3 3"/>
                <XAxis dataKey="hour" tick={AXIS} axisLine={false} tickLine={false}/>
                <YAxis tick={AXIS} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#0b1a2a", border:"1px solid #126074", fontSize:12}}/>
                <Area type="monotone" dataKey="index" stroke="#ff9a3c" fill="url(#tAmber)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel kicker="CORRIDOR UTILISATION" title="Top corridors" testId="analytics-corridor-panel">
          <div className="corridor-list">
            {zonesAnalytics.slice(0, 6).map(z => (
              <div key={z.zone} className="corridor-row">
                <div><strong>{z.zone}</strong><span>{z.vehicles} vehicles · {z.category}</span></div>
                <div className="corridor-bar"><span style={{width: `${z.congestion}%`, background: z.congestion > 75 ? "#ff2050" : "#00d9ff"}}/></div>
                <em>{z.congestion}%</em>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
