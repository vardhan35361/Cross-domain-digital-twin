/* eslint-disable react/no-unknown-property */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text, Line } from "@react-three/drei";

const STATE_COLOR = { NORMAL: "#00ff88", WARNING: "#ffb703", CRITICAL: "#ff2050",
                      OFFLINE: "#6f8b9f", MAINTENANCE: "#58a6ff" };

// -------- Hospital scene: floor plates stacked, department blocks per floor -------
function HospitalScene({ state }) {
  const depts = state?.depts || [];
  const equip = state?.equipment || [];
  return (
    <group>
      {/* Building outline */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[10, 5, 6]} />
        <meshStandardMaterial color="#0e2540" transparent opacity={0.18} />
      </mesh>
      {/* 5 floor plates */}
      {[1,2,3,4,5].map(f => (
        <mesh key={f} position={[0, f * 1.0 - 0.05, 0]}>
          <boxGeometry args={[9.6, 0.08, 5.6]} />
          <meshStandardMaterial color="#123a5e" emissive="#0a2540" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* Departments as coloured blocks */}
      {depts.map((d, i) => {
        const pct = d.occupied / Math.max(1, d.beds);
        const height = 0.6 + pct * 1.4;
        const color = STATE_COLOR[d.state] || "#00d9ff";
        const col = i % 3, row = Math.floor(i / 3);
        return (
          <group key={d.id} position={[-3 + col * 3, d.floor * 1 - 0.1 + height/2, -1.6 + row * 3]}>
            <mesh castShadow>
              <boxGeometry args={[2.2, height, 1.6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} transparent opacity={0.85} />
            </mesh>
            <Text position={[0, height/2 + 0.24, 0]} fontSize={0.22} color="#e6faff" anchorX="center">
              {d.name.toUpperCase()}
            </Text>
            <Text position={[0, -height/2 - 0.22, 0]} fontSize={0.18} color="#a8dfff" anchorX="center">
              {d.occupied}/{d.beds} · {Math.round(pct*100)}%
            </Text>
          </group>
        );
      })}
      {/* Equipment blips */}
      {equip.map((e, i) => {
        const color = e.status === "operational" ? "#00ff88" : "#ff2050";
        return (
          <mesh key={e.id} position={[4.6, 0.6 + i * 0.6, -1.2 + i * 0.3]}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        );
      })}
      {/* Ambulance bay */}
      <mesh position={[0, 0.05, 3.6]}>
        <boxGeometry args={[9.4, 0.05, 1.4]} />
        <meshStandardMaterial color="#204a72" />
      </mesh>
      <Text position={[0, 0.2, 3.6]} fontSize={0.2} color="#7ee0ff" anchorX="center">AMBULANCE BAY</Text>
    </group>
  );
}

// -------- Building scene: 10 floor plates + HVAC zones + elevator shafts -------
function BuildingScene({ state }) {
  const floors = state?.floors || [];
  const elev = state?.elevators || [];
  return (
    <group>
      {floors.map((f, i) => {
        const occ = f.occupancy / 100;
        const heatColor = occ > 0.7 ? "#ff2050" : occ > 0.4 ? "#ffb703" : "#00ff88";
        return (
          <group key={f.id} position={[0, i * 0.8 + 0.5, 0]}>
            <mesh>
              <boxGeometry args={[8, 0.6, 6]} />
              <meshStandardMaterial color="#0e2842" emissive={heatColor} emissiveIntensity={0.18 + occ * 0.35} transparent opacity={0.88} />
            </mesh>
            {/* occupancy heat overlay strip */}
            <mesh position={[0, 0.32, 0]}>
              <boxGeometry args={[7.6, 0.02, 5.6]} />
              <meshBasicMaterial color={heatColor} transparent opacity={0.35 + occ * 0.35} toneMapped={false} />
            </mesh>
            <Text position={[-4.4, 0, 0]} fontSize={0.24} color="#7ee0ff" anchorX="right">
              {f.name.toUpperCase()} · {f.occupancy}% · {f.temperature}°C
            </Text>
          </group>
        );
      })}
      {/* Elevator shafts */}
      {elev.map((l, i) => (
        <group key={l.id} position={[3.4, 0.2, -2 + i * 1.3]}>
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[0.6, 8, 0.6]} />
            <meshStandardMaterial color="#0a1e33" transparent opacity={0.55} />
          </mesh>
          <mesh position={[0, l.current_floor * 0.8, 0]}>
            <boxGeometry args={[0.5, 0.55, 0.5]} />
            <meshBasicMaterial color={l.state === "moving" ? "#00d9ff" : "#ffb703"} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* HVAC roof unit */}
      <group position={[0, floors.length * 0.8 + 1, 0]}>
        <mesh>
          <boxGeometry args={[6, 0.8, 3]} />
          <meshStandardMaterial color="#1a3854" emissive={state?.hvac?.state === "WARNING" ? "#ffb703" : "#00d9ff"} emissiveIntensity={0.5} />
        </mesh>
        <Text position={[0, 0.7, 0]} fontSize={0.28} color="#c8faff" anchorX="center">
          HVAC · {state?.hvac?.load_percent || 0}% LOAD
        </Text>
      </group>
    </group>
  );
}

// -------- Industrial: production line stripes + tanks -------
function IndustrialScene({ state }) {
  const lines = state?.lines || [];
  return (
    <group>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[14, 0.1, 10]} />
        <meshStandardMaterial color="#0a1a28" />
      </mesh>
      {lines.map((l, i) => {
        const color = STATE_COLOR[l.state] || "#00d9ff";
        const w = 12 * (l.throughput / 100);
        return (
          <group key={l.id} position={[-5 + w/2, 0.4, -3 + i * 2]}>
            <mesh>
              <boxGeometry args={[w, 0.4, 1.4]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
            </mesh>
            <Text position={[-w/2 - 1.2, 0, 0]} fontSize={0.22} color="#c8faff" anchorX="right">
              {l.name.toUpperCase()} · {l.throughput}%
            </Text>
          </group>
        );
      })}
      {/* Storage tanks */}
      {[0,1,2].map(i => (
        <mesh key={i} position={[5.5, 1.2, -3 + i * 2.4]}>
          <cylinderGeometry args={[0.8, 0.8, 2.4, 20]} />
          <meshStandardMaterial color="#1a3a56" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// -------- Energy: substations + transmission lines + solar/wind ------
function EnergyScene({ state }) {
  const subs = state?.substations || [];
  return (
    <group>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[16, 0.1, 12]} />
        <meshStandardMaterial color="#050f1c" />
      </mesh>
      {subs.map((s, i) => {
        const color = STATE_COLOR[s.state] || "#00d9ff";
        const angle = (i / subs.length) * Math.PI * 2;
        const x = Math.cos(angle) * 5;
        const z = Math.sin(angle) * 4;
        return (
          <group key={s.id} position={[x, 0, z]}>
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[1.6, 1.2, 1.6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
            </mesh>
            {/* Transformer tower */}
            <mesh position={[0, 1.9, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 2, 8]} />
              <meshStandardMaterial color="#4a6577" />
            </mesh>
            <Text position={[0, 3.2, 0]} fontSize={0.24} color="#c8faff" anchorX="center">
              {s.name}
            </Text>
            <Text position={[0, 2.8, 0]} fontSize={0.2} color={color} anchorX="center">
              {s.load_mw} MW
            </Text>
            {/* Transmission line to centre */}
            <Line points={[[0, 1.8, 0], [-x * 0.85, 3, -z * 0.85]]} color="#00d9ff" transparent opacity={0.4}/>
          </group>
        );
      })}
      {/* Central control */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.8, 16]} />
        <meshStandardMaterial color="#0a2540" emissive="#00d9ff" emissiveIntensity={0.4} />
      </mesh>
      {/* Solar array */}
      {[0,1,2,3].map(i => (
        <mesh key={`s${i}`} position={[-7 + i * 1.6, 0.3, -5.5]} rotation={[-Math.PI/4, 0, 0]}>
          <planeGeometry args={[1.3, 0.9]} />
          <meshStandardMaterial color="#0d3560" emissive="#3b7de0" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* Wind turbine */}
      <group position={[6.5, 0, -4.5]}>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.05, 0.08, 3.2, 8]}/><meshStandardMaterial color="#e0f4ff"/></mesh>
        <mesh position={[0, 3.2, 0]}><boxGeometry args={[1.6, 0.06, 0.06]}/><meshStandardMaterial color="#f0faff"/></mesh>
      </group>
    </group>
  );
}

// -------- Water: reservoirs + pipes + pumps ------
function WaterScene({ state }) {
  const res = state?.reservoirs || [];
  const pumps = state?.pumps || [];
  return (
    <group>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[16, 0.1, 12]} />
        <meshStandardMaterial color="#031828" />
      </mesh>
      {/* Reservoirs */}
      {res.map((r, i) => {
        const fill = r.level_percent / 100;
        const color = r.state === "WARNING" ? "#ffb703" : "#3fb8ff";
        return (
          <group key={r.id} position={[-6 + i * 4, 0, -3]}>
            {/* tank */}
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[1.1, 1.1, 2, 24, 1, true]} />
              <meshStandardMaterial color="#1a3a56" transparent opacity={0.5} side={2} />
            </mesh>
            {/* water level */}
            <mesh position={[0, fill * 1, 0]}>
              <cylinderGeometry args={[1.05, 1.05, fill * 2 || 0.05, 20]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.75} />
            </mesh>
            <Text position={[0, 2.6, 0]} fontSize={0.24} color="#c8faff" anchorX="center">{r.name}</Text>
            <Text position={[0, 2.2, 0]} fontSize={0.22} color={color} anchorX="center">{r.level_percent}%</Text>
          </group>
        );
      })}
      {/* Pumps */}
      {pumps.map((p, i) => (
        <group key={p.id} position={[-6 + i * 2.2, 0.3, 3]}>
          <mesh>
            <boxGeometry args={[1.2, 0.6, 1.2]} />
            <meshStandardMaterial color={p.state === "CRITICAL" ? "#ff2050" : "#00ff88"} emissive={p.state === "CRITICAL" ? "#ff2050" : "#00ff88"} emissiveIntensity={0.5} />
          </mesh>
          <Text position={[0, 0.8, 0]} fontSize={0.18} color="#c8faff" anchorX="center">{p.id.toUpperCase()}</Text>
          <Text position={[0, 0.55, 0]} fontSize={0.16} color="#7ee0ff" anchorX="center">{p.flow_lps} L/s</Text>
        </group>
      ))}
      {/* Pipes */}
      {res.map((r, i) => (
        <Line key={r.id} points={[[-6 + i * 4, 0.2, -3], [-6 + i * 4, 0.2, 3]]} color="#3fb8ff" lineWidth={4} transparent opacity={0.55}/>
      ))}
    </group>
  );
}

const CAMERAS = {
  hospital: [10, 8, 12], building: [12, 8, 10], industrial: [0, 10, 14],
  energy: [0, 12, 14], water: [0, 10, 14],
};

export default function DomainScene({ domain, state }) {
  const cam = CAMERAS[domain] || [8, 8, 10];
  const bg = domain === "energy" ? "#020610" : domain === "water" ? "#031828" : "#050e18";
  return (
    <Canvas dpr={[1, 1.4]} data-testid={`domain-scene-${domain}`}>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 18, 50]} />
      <ambientLight intensity={0.9} color="#8fdaff" />
      <directionalLight position={[10, 12, 6]} intensity={0.8} color="#f6faff" />
      <pointLight position={[0, 8, 0]} intensity={40} color="#00f3ff" distance={30} />
      <PerspectiveCamera makeDefault position={cam} fov={44} />
      <OrbitControls enablePan minDistance={8} maxDistance={40} maxPolarAngle={1.42} autoRotate autoRotateSpeed={0.3} />
      <gridHelper args={[40, 20, "#0a6272", "#0a2b3b"]} position={[0, -0.06, 0]} />
      {domain === "hospital" && <HospitalScene state={state}/>}
      {domain === "building" && <BuildingScene state={state}/>}
      {domain === "industrial" && <IndustrialScene state={state}/>}
      {domain === "energy" && <EnergyScene state={state}/>}
      {domain === "water" && <WaterScene state={state}/>}
    </Canvas>
  );
}
