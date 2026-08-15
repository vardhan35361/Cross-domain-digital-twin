/* eslint-disable react/no-unknown-property */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A composite vehicle body constructed from primitives (chassis + cabin + wheels + head/taillights)
export function VehicleMesh({ type = "sedan", color = "#00d9ff", flashPhase = 0, night = false }) {
  const spec = SPECS[type] || SPECS.sedan;
  const flash = flashPhase; // 0..1
  const emergency = spec.emergency;
  const headOn = night || emergency;
  return (
    <group scale={[spec.scale, spec.scale, spec.scale]}>
      {/* chassis */}
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[spec.len, 0.20, spec.wid]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.35} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      {/* cabin */}
      <mesh position={[spec.cabinX, 0.30, 0]}>
        <boxGeometry args={[spec.cabinLen, 0.16, spec.wid * 0.85]} />
        <meshStandardMaterial color="#0a1420" metalness={0.6} roughness={0.15} transparent opacity={0.85} />
      </mesh>
      {/* wheels */}
      {[[-spec.len/2+0.12, spec.wid/2], [-spec.len/2+0.12, -spec.wid/2], [spec.len/2-0.12, spec.wid/2], [spec.len/2-0.12, -spec.wid/2]].map((p, i) => (
        <mesh key={i} position={[p[0], 0.05, p[1]]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.06, 10]} />
          <meshStandardMaterial color="#0b0b0b" />
        </mesh>
      ))}
      {/* headlights */}
      {headOn && [1, -1].map(dy => (
        <mesh key={`h${dy}`} position={[spec.len/2 + 0.01, 0.14, dy * spec.wid * 0.28]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color="#f5faff" />
        </mesh>
      ))}
      {/* taillights */}
      {[1, -1].map(dy => (
        <mesh key={`t${dy}`} position={[-spec.len/2 - 0.01, 0.14, dy * spec.wid * 0.28]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#ff2f4a" />
        </mesh>
      ))}
      {/* emergency light bar */}
      {emergency && (
        <group position={[0, 0.42, 0]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.25, 0.04, 0.12]} />
            <meshStandardMaterial color="#080a12" />
          </mesh>
          <mesh position={[-0.06, 0.05, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={flash > 0.5 ? "#00baff" : "#04324a"} toneMapped={false} />
          </mesh>
          <mesh position={[0.06, 0.05, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={flash > 0.5 ? "#3d2233" : "#ff2050"} toneMapped={false} />
          </mesh>
          <pointLight color={flash > 0.5 ? "#00baff" : "#ff2050"} intensity={7} distance={2.6} position={[0, 0.1, 0]} />
        </group>
      )}
    </group>
  );
}

const SPECS = {
  sedan:     { len: 0.62, wid: 0.28, cabinLen: 0.36, cabinX: 0.02, scale: 1.0 },
  suv:       { len: 0.68, wid: 0.32, cabinLen: 0.42, cabinX: 0.02, scale: 1.05 },
  hatchback: { len: 0.54, wid: 0.28, cabinLen: 0.32, cabinX: 0.03, scale: 0.95 },
  bus:       { len: 1.15, wid: 0.34, cabinLen: 0.95, cabinX: -0.05, scale: 1.0 },
  truck:     { len: 1.20, wid: 0.36, cabinLen: 0.32, cabinX: 0.34, scale: 1.05 },
  two_wheeler:{ len: 0.34, wid: 0.14, cabinLen: 0.16, cabinX: 0.02, scale: 0.85 },
  ambulance: { len: 0.90, wid: 0.34, cabinLen: 0.60, cabinX: -0.08, scale: 1.0, emergency: true },
  police:    { len: 0.66, wid: 0.30, cabinLen: 0.38, cabinX: 0.02, scale: 1.0, emergency: true },
  fire:      { len: 1.25, wid: 0.36, cabinLen: 0.34, cabinX: 0.38, scale: 1.05, emergency: true },
};

// Metro train - multi-car
export function MetroTrain({ color = "#00ff88" }) {
  return (
    <group>
      {[0, 1, 2, 3].map(i => (
        <group key={i} position={[(i - 1.5) * 1.2, 0, 0]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[1.10, 0.42, 0.5]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} emissive={color} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[1.05, 0.06, 0.4]} />
            <meshStandardMaterial color="#0a1a2a" transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Animated vehicle following its road (progress ∈ [0,1])
export function MovingVehicle({ vehicle, road, night, congestion }) {
  const ref = useRef();
  const flashRef = useRef(0);
  const [x1, z1] = road.from; const [x2, z2] = road.to;
  const angle = Math.atan2(z2 - z1, x2 - x1);
  const laneOffset = (vehicle.lane || 0) * 0.35 - 0.35;
  const lateralX = -Math.sin(angle) * laneOffset;
  const lateralZ = Math.cos(angle) * laneOffset;
  const y = road.elevated ? 1.6 : 0.02;
  useFrame((_, delta) => {
    if (!ref.current) return;
    flashRef.current = (flashRef.current + delta * 5) % 1;
    // Slight sway for realism (except metro which stays rigid)
    if (vehicle.type !== "metro") ref.current.rotation.z = Math.sin(flashRef.current * 6.28) * 0.02;
  });
  const progress = vehicle.progress || 0;
  const px = x1 + (x2 - x1) * progress + lateralX;
  const pz = z1 + (z2 - z1) * progress + lateralZ;
  const isMetro = vehicle.type === "metro";
  const rotY = -angle + (vehicle.direction < 0 ? Math.PI : 0);
  return (
    <group ref={ref} position={[px, y, pz]} rotation={[0, rotY, 0]}>
      {isMetro ? <MetroTrain color={vehicle.color} /> : <VehicleMesh type={vehicle.type} color={vehicle.color} flashPhase={flashRef.current} night={night} />}
      {vehicle.priority && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[0.5, 0.62, 24]} />
          <meshBasicMaterial color="#ff2050" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
}
