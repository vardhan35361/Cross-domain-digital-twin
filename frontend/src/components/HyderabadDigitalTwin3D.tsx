import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function HyderabadDigitalTwin3D({ activeMode, weather, simulationSpeed }: { activeMode: string; weather: string; simulationSpeed: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>("Hitech City");

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.015);

    const camera = new THREE.PerspectiveCamera(60, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 40, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x00f3ff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 80, 50);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x7000ff, 2, 100);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    // Holographic Grid floor
    const gridHelper = new THREE.GridHelper(120, 60, 0x00f3ff, 0x1e293b);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Road Network (Matrix of intersecting highways, ORR, flyovers)
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8
    });

    const roadsGroup = new THREE.Group();

    // Main ring road (ORR approximation)
    const orrGeometry = new THREE.RingGeometry(35, 37, 32);
    orrGeometry.rotateX(-Math.PI / 2);
    const orrMesh = new THREE.Mesh(orrGeometry, new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.4 }));
    roadsGroup.add(orrMesh);

    // Arterial Roads & Flyovers
    for (let i = -4; i <= 4; i++) {
      // X roads
      const roadXGeo = new THREE.BoxGeometry(100, 0.4, 2.5);
      const roadX = new THREE.Mesh(roadXGeo, roadMaterial);
      roadX.position.set(0, 0, i * 10);
      roadsGroup.add(roadX);

      // Z roads
      const roadZGeo = new THREE.BoxGeometry(2.5, 0.4, 100);
      const roadZ = new THREE.Mesh(roadZGeo, roadMaterial);
      roadZ.position.set(i * 10, 0, 0);
      roadsGroup.add(roadZ);
    }

    // Elevated Flyovers (multi-tier)
    const flyoverGeo = new THREE.BoxGeometry(60, 0.6, 2);
    const flyoverMat = new THREE.MeshStandardMaterial({ color: 0x7000ff, emissive: 0x3b0764, roughness: 0.3 });
    const flyover1 = new THREE.Mesh(flyoverGeo, flyoverMat);
    flyover1.position.set(0, 4, 5);
    flyover1.rotation.y = Math.PI / 6;
    roadsGroup.add(flyover1);

    const flyover2 = new THREE.Mesh(flyoverGeo, flyoverMat);
    flyover2.position.set(-5, 6, -10);
    flyover2.rotation.y = -Math.PI / 4;
    roadsGroup.add(flyover2);

    scene.add(roadsGroup);

    // Low-poly City Buildings
    const buildingsGroup = new THREE.Group();
    const buildingGeo = new THREE.BoxGeometry(2, 1, 2);
    const buildingMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, emissive: 0x00f3ff, emissiveIntensity: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 })
    ];

    const zonesData = [
      { name: "Gachibowli", x: -25, z: -25 },
      { name: "Hitech City", x: -15, z: -15 },
      { name: "Banjara Hills", x: 10, z: 10 },
      { name: "Jubilee Hills", x: 15, z: 5 },
      { name: "Madhapur", x: -10, z: -5 },
      { name: "Kukatpally", x: -20, z: 25 },
      { name: "Secunderabad", x: 25, z: -20 },
      { name: "LB Nagar", x: 35, z: 30 },
      { name: "Shamshabad", x: 0, z: 45 }
    ];

    zonesData.forEach((zone) => {
      for (let bx = -3; bx <= 3; bx += 2) {
        for (let bz = -3; bz <= 3; bz += 2) {
          if (Math.random() > 0.3) {
            const height = Math.random() * 8 + 3;
            const geom = new THREE.BoxGeometry(1.5, height, 1.5);
            const mat = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
            const b = new THREE.Mesh(geom, mat);
            b.position.set(zone.x + bx, height / 2, zone.z + bz);
            buildingsGroup.add(b);
          }
        }
      }
    });

    scene.add(buildingsGroup);

    // Animated Traffic Particles (Glowing Streams)
    const particleCount = 600;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorClear = new THREE.Color(0x00ff66);
    const colorHeavy = new THREE.Color(0xff0055);
    const colorWarn = new THREE.Color(0xffb703);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 90;
      particlePositions[i + 1] = 0.3;
      particlePositions[i + 2] = (Math.random() - 0.5) * 90;

      const c = Math.random() > 0.4 ? colorClear : (Math.random() > 0.5 ? colorHeavy : colorWarn);
      particleColors[i] = c.r;
      particleColors[i + 1] = c.g;
      particleColors[i + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const trafficParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(trafficParticles);

    // Weather particles (Rain / Storm)
    let rainParticles: THREE.Points | null = null;
    if (weather === "Rain" || weather === "Storm") {
      const rainGeo = new THREE.BufferGeometry();
      const rainCount = 1500;
      const rainPos = new Float32Array(rainCount * 3);
      for (let i = 0; i < rainCount * 3; i += 3) {
        rainPos[i] = (Math.random() - 0.5) * 100;
        rainPos[i + 1] = Math.random() * 50;
        rainPos[i + 2] = (Math.random() - 0.5) * 100;
      }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
      const rainMat = new THREE.PointsMaterial({ color: 0x00f3ff, size: 0.4, transparent: true, opacity: 0.6 });
      rainParticles = new THREE.Points(rainGeo, rainMat);
      scene.add(rainParticles);
    }

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Move traffic particles along roads
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] += 0.2 * simulationSpeed;
        if (positions[i] > 45) positions[i] = -45;
      }
      particleGeo.attributes.position.needsUpdate = true;

      if (rainParticles) {
        const rPos = rainParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < rPos.length; i += 3) {
          rPos[i] -= 1.2 * simulationSpeed;
          if (rPos[i] < 0) rPos[i] = 50;
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [weather, simulationSpeed]);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-[#00F3FF]/30 shadow-[0_0_40px_rgba(0,243,255,0.15)] bg-[#030712]" data-testid="digital-twin-3d-canvas">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Overlay Badge & Controls info */}
      <div className="absolute top-4 left-4 bg-[#0B132B]/80 backdrop-blur-xl border border-[#00F3FF]/30 px-4 py-2 rounded-xl text-xs text-[#00F3FF] flex items-center gap-3 shadow-lg z-10" data-testid="twin-status-badge">
        <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] animate-pulse"></span>
        <span>GHMC & ORR 3D LIVE MESH ACTIVE</span>
        <span className="bg-[#1e293b] px-2 py-0.5 rounded text-white font-mono">Mode: {activeMode.toUpperCase()}</span>
      </div>

      <div className="absolute bottom-4 right-4 bg-[#0B132B]/80 backdrop-blur-xl border border-[#00F3FF]/20 p-3 rounded-xl text-xs text-[#94A3B8] z-10 space-y-1">
        <div className="text-[#F8FAFC] font-semibold">Controls</div>
        <div>🖱️ Drag: Rotate Camera</div>
        <div>📜 Scroll: Zoom Twin</div>
        <div>⚡ Active Nodes: 15 Corridor Zones</div>
      </div>
    </div>
  );
}
