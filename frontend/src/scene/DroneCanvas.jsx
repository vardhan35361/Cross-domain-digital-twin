/* eslint-disable react/no-unknown-property */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

// Synthetic drone-camera view: rotating grid of "vehicles" + HUD reticle overlay.
function DroneVehicles({ seed = "", playing = true }) {
  const ref = useRef();
  const carriers = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 24; i++) {
      const hash = (seed.charCodeAt((i * 3) % seed.length) || 0) + i * 7;
      const lane = (hash % 4) - 1.5;
      const speed = 0.05 + (hash % 5) * 0.03;
      const kind = hash % 5;
      arr.push({
        z: (hash % 20) - 10, lane, speed,
        color: kind === 0 ? "#ff2050" : kind === 1 ? "#ffb703" : kind === 2 ? "#00ff88" : "#00d9ff",
        len: kind === 3 ? 1.6 : 0.9, wid: 0.28, dir: hash % 2 ? 1 : -1,
      });
    }
    return arr;
  }, [seed]);
  useFrame((_, delta) => {
    if (!ref.current || !playing) return;
    ref.current.children.forEach((child, i) => {
      const spec = carriers[i];
      if (!spec) return;
      child.position.z += spec.speed * spec.dir;
      if (child.position.z > 12) child.position.z = -12;
      if (child.position.z < -12) child.position.z = 12;
    });
  });
  return (
    <group ref={ref}>
      {carriers.map((c, i) => (
        <mesh key={i} position={[c.lane * 1.6, 0.2, c.z]}>
          <boxGeometry args={[c.len, 0.3, c.wid]} />
          <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Road() {
  return (
    <>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[10, 30]} />
        <meshStandardMaterial color="#0a1520" />
      </mesh>
      {[-2.4, 0, 2.4].map(x => (
        <mesh key={x} rotation={[-Math.PI/2, 0, 0]} position={[x, -0.04, 0]}>
          <planeGeometry args={[0.06, 26]} />
          <meshBasicMaterial color="#d9edff" />
        </mesh>
      ))}
    </>
  );
}

export function DroneCanvas({ seed = "drone", playing = true, ptz = {yaw:0, pitch:0, zoom:1}, label = "SKY-01", hero = false }) {
  const camY = Math.max(3, 8 - ptz.zoom * 2 + ptz.pitch * 0.15);
  const camX = ptz.yaw * 0.06;
  return (
    <div className={`drone-frame ${hero ? "hero" : ""}`} data-testid="drone-canvas">
      <Canvas dpr={[1, 1.4]} camera={{position: [camX, camY, 6], fov: 55}}>
        <color attach="background" args={["#020914"]} />
        <fog attach="fog" args={["#020914", 12, 28]} />
        <ambientLight intensity={0.7} color="#8fdaff" />
        <directionalLight position={[6, 12, 4]} intensity={0.6} color="#a8d8ff" />
        <Road />
        <DroneVehicles seed={seed} playing={playing} />
      </Canvas>
      <div className="drone-overlay">
        <div className="drone-hud-top">
          <span>{label}</span>
          <span className="rec"><i/> REC</span>
          <span>{new Date().toLocaleTimeString([], {hour12:false})}</span>
        </div>
        <div className="drone-reticle">
          <div className="reticle-corner tl"/><div className="reticle-corner tr"/>
          <div className="reticle-corner bl"/><div className="reticle-corner br"/>
          <div className="reticle-cross"><span/><span/></div>
        </div>
        <div className="drone-hud-bottom">
          <span>YAW {ptz.yaw.toFixed(0)}°</span>
          <span>PITCH {ptz.pitch.toFixed(0)}°</span>
          <span>ZOOM {ptz.zoom.toFixed(1)}×</span>
        </div>
      </div>
    </div>
  );
}
