/* eslint-disable react/no-unknown-property */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Line, Text, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { MovingVehicle } from "./Vehicle";
import { useTwin } from "../state/TwinContext";

const BAND_COLOR = { green: "#00ff88", yellow: "#ffe14d", orange: "#ff9a3c", red: "#ff2050" };

function RoadSegment({ road, band, pulse }) {
  const [x1, z1] = road.from; const [x2, z2] = road.to;
  const dx = x2 - x1; const dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const cx = (x1 + x2) / 2; const cz = (z1 + z2) / 2;
  const height = road.elevated ? 1.4 : 0.05;
  const width = Math.max(0.35, road.lanes * 0.18);
  const isMetro = road.type === "metro";
  const color = isMetro ? "#00ff88" : (BAND_COLOR[band] || "#00d9ff");
  return (
    <group position={[cx, height, cz]} rotation={[0, -angle, 0]}>
      {/* road bed */}
      <mesh receiveShadow>
        <boxGeometry args={[length, isMetro ? 0.16 : 0.08, width]} />
        <meshStandardMaterial color={isMetro ? "#0a1c2e" : "#0d1a26"} metalness={0.2} roughness={0.85} />
      </mesh>
      {/* glowing centerline */}
      <mesh position={[0, isMetro ? 0.10 : 0.055, 0]}>
        <boxGeometry args={[length * 0.98, 0.02, width * 0.15]} />
        <meshBasicMaterial color={color} transparent opacity={pulse ? 0.95 : 0.72} toneMapped={false} />
      </mesh>
      {/* lane markings */}
      {!isMetro && road.lanes >= 4 && (
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[length * 0.96, 0.005, 0.03]} />
          <meshBasicMaterial color="#f0fbff" transparent opacity={0.4} />
        </mesh>
      )}
      {/* metro viaduct pillars */}
      {isMetro && Array.from({length: Math.max(2, Math.floor(length / 2))}).map((_, i) => (
        <mesh key={i} position={[-length/2 + (i + 1) * (length / Math.floor(length / 2 + 1)), -0.75, 0]}>
          <cylinderGeometry args={[0.09, 0.11, 1.5, 8]} />
          <meshStandardMaterial color="#243a4c" />
        </mesh>
      ))}
      {/* elevated flyover pillars */}
      {road.elevated && !isMetro && Array.from({length: Math.max(2, Math.floor(length / 2.5))}).map((_, i) => (
        <mesh key={i} position={[-length/2 + (i + 1) * (length / Math.floor(length / 2.5 + 1)), -0.7, 0]}>
          <boxGeometry args={[0.14, 1.3, 0.14]} />
          <meshStandardMaterial color="#1a2a3d" />
        </mesh>
      ))}
    </group>
  );
}

function BuildingCluster({ zone, seed }) {
  const [x, , z] = zone.pos;
  const buildings = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 18; i++) {
      const bx = x + (Math.sin(seed + i * 1.7) * 3.2);
      const bz = z + (Math.cos(seed + i * 2.3) * 3.2);
      const h = 0.7 + ((Math.sin(seed + i * 3.1) + 1) / 2) * (zone.category === "IT" ? 3.2 : zone.category === "landmark" ? 2.0 : 1.6);
      const w = 0.35 + Math.abs(Math.sin(seed + i)) * 0.4;
      arr.push([bx, h, bz, w]);
    }
    return arr;
  }, [x, z, seed, zone.category]);
  return (
    <Instances limit={buildings.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#0d2136" emissive="#0a2540" emissiveIntensity={0.6} roughness={0.9} />
      {buildings.map(([bx, h, bz, w], i) => (
        <Instance key={i} position={[bx, h/2, bz]} scale={[w, h, w]} />
      ))}
    </Instances>
  );
}

function ZoneLabels({ zones }) {
  return zones.map(z => (
    <Text key={z.id} position={[z.pos[0], 0.9, z.pos[2] + 1.8]} fontSize={0.35} color="#7ce6ff"
      anchorX="center" anchorY="middle" outlineWidth={0.008} outlineColor="#001824">
      {z.name.toUpperCase()}
    </Text>
  ));
}

function GroundGrid() {
  return (
    <>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#040a14" roughness={1} />
      </mesh>
      <gridHelper args={[120, 60, "#0a6272", "#0a2b3b"]} position={[0, -0.24, 0]} />
    </>
  );
}

function EmergencyTrail({ corridor }) {
  if (!corridor?.waypoints || corridor.waypoints.length < 2) return null;
  const pts = corridor.waypoints.map(p => [p[0], 0.6, p[2]]);
  return (
    <>
      <Line points={pts} color="#ff2050" lineWidth={3} transparent opacity={0.9} />
      {pts.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshBasicMaterial color="#ff2050" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function ConvoyPath({ convoy }) {
  if (!convoy?.waypoint_positions || convoy.waypoint_positions.length < 2) return null;
  const pts = convoy.waypoint_positions.map(p => [p[0], 0.9, p[2]]);
  const progress = convoy.progress || 0;
  const idx = Math.min(pts.length - 1, Math.floor(progress * (pts.length - 1)));
  const t = progress * (pts.length - 1) - idx;
  const cur = [
    pts[idx][0] + (pts[Math.min(idx+1, pts.length-1)][0] - pts[idx][0]) * t,
    0.9,
    pts[idx][2] + (pts[Math.min(idx+1, pts.length-1)][2] - pts[idx][2]) * t,
  ];
  return (
    <>
      <Line points={pts} color="#ffb703" lineWidth={4} transparent opacity={0.85} />
      <mesh position={cur}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial color="#ffb703" toneMapped={false} />
      </mesh>
      <pointLight color="#ffb703" intensity={8} distance={4} position={cur} />
    </>
  );
}

function Rain({ active }) {
  const ref = useRef();
  const drops = useMemo(() => Array.from({length: 300}, (_, i) => [
    (Math.random() - 0.5) * 90, Math.random() * 20, (Math.random() - 0.5) * 90,
  ]), []);
  useFrame(() => {
    if (!ref.current || !active) return;
    ref.current.children.forEach(c => {
      c.position.y -= 0.35;
      if (c.position.y < 0) c.position.y = 18;
    });
  });
  if (!active) return null;
  return (
    <group ref={ref}>
      {drops.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.015, 0.5, 0.015]} />
          <meshBasicMaterial color="#78d9ff" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function LatestCorridor() {
  const { corridors } = useTwin();
  return <EmergencyTrail corridor={corridors[0]} />;
}

export default function TwinScene({ cinematic = false, focus = null }) {
  const { roads, vehicles, heatmap, zones, weather, timeOfDay, layers, convoy } = useTwin();
  const bandByRoad = useMemo(() => Object.fromEntries((heatmap || []).map(h => [h.road_id, h])), [heatmap]);
  const night = timeOfDay === "night";
  const rain = weather?.condition === "Rainstorm" || weather === "Rainstorm";
  const camPos = cinematic ? [0, 24, 32] : (focus ? [focus[0], 10, focus[2] + 8] : [0, 26, 40]);
  const shownVehicles = layers.traffic ? vehicles : [];
  return (
    <Canvas dpr={[1, 1.5]} shadows={false}>
      <color attach="background" args={[night ? "#02060c" : "#050e18"]} />
      <fog attach="fog" args={[night ? "#020610" : "#04101a", 22, 90]} />
      <ambientLight intensity={night ? 0.35 : 0.9} color={night ? "#5c8ac7" : "#8fdaff"} />
      <directionalLight position={[20, 30, 10]} intensity={night ? 0.25 : 0.9} color={night ? "#3a5f92" : "#f6faff"} />
      <pointLight position={[0, 12, 0]} intensity={80} color="#00f3ff" distance={40} />
      <pointLight position={[-16, 6, 8]} intensity={50} color="#5f8dff" distance={26} />
      <pointLight position={[14, 6, -8]} intensity={45} color="#ff5f4d" distance={22} />
      <PerspectiveCamera makeDefault position={camPos} fov={44} />
      <OrbitControls enablePan minDistance={10} maxDistance={80} maxPolarAngle={1.42}
        autoRotate={cinematic} autoRotateSpeed={0.3} />
      <GroundGrid />
      {layers.buildings && zones.map((z, i) => <BuildingCluster key={z.id} zone={z} seed={i * 3.4} />)}
      {roads
        .filter(r => (layers.metro || r.type !== "metro"))
        .map(r => <RoadSegment key={r.id} road={r} band={bandByRoad[r.id]?.band} pulse={bandByRoad[r.id]?.pulse} />)}
      <ZoneLabels zones={zones} />
      {shownVehicles.slice(0, 240).map(v => {
        const road = roads.find(r => r.id === v.road_id);
        if (!road) return null;
        return <MovingVehicle key={v.id} vehicle={v} road={road} night={night} congestion={road.congestion} />;
      })}
      {layers.corridors && <LatestCorridor />}
      {layers.corridors && convoy && convoy.status !== "idle" && <ConvoyPath convoy={convoy} />}
      <Rain active={rain && layers.weather} />
    </Canvas>
  );
}
