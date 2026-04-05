import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { DELOS_THEME } from '@/theme';

type BackgroundMode = 'ring' | 'topo';

interface PointCloudOptions {
  count?: number;
  mode?: BackgroundMode;
}

interface FluidPointCloudProps {
  mode: BackgroundMode;
}

interface DelosBackgroundProps {
  mode?: BackgroundMode;
}

// Generate millions of points in a Vitruvian ring or topo map
function generatePointCloud({ count = 1000000, mode = 'ring' }: PointCloudOptions) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x, y, z;
    if (mode === 'ring') {
      // Vitruvian ring: polar coordinates
      const theta = Math.random() * 2 * Math.PI;
      const r = 8 + Math.sin(theta * 6) * 1.2 + (Math.random() - 0.5) * 0.2;
      x = Math.cos(theta) * r + (Math.random() - 0.5) * 0.1;
      y = (Math.random() - 0.5) * 1.2;
      z = Math.sin(theta) * r + (Math.random() - 0.5) * 0.1;
    } else {
      // Topo map: random 3D surface
      x = (Math.random() - 0.5) * 18;
      z = (Math.random() - 0.5) * 18;
      y = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 2 + (Math.random() - 0.5) * 0.2;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
}

function FluidPointCloud({ mode }: FluidPointCloudProps) {
  const meshRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null>(null);
  const [drag, setDrag] = useState(false);
  const inertia = useRef({ vx: 0, vy: 0 });
  const last = useRef<[number, number]>([0, 0]);
  const positions = useMemo(() => generatePointCloud({ count: 800000, mode }), [mode]);
  const color = useMemo(() => new THREE.Color(DELOS_THEME.bone), []);

  // Fluid inertia for drag-to-explore
  useFrame(({ mouse }) => {
    if (drag) {
      inertia.current.vx = (mouse.x - last.current[0]) * 2;
      inertia.current.vy = (mouse.y - last.current[1]) * 2;
      last.current = [mouse.x, mouse.y];
    } else {
      inertia.current.vx *= 0.96;
      inertia.current.vy *= 0.96;
    }

    const currentMesh = meshRef.current;
    if (!currentMesh) return;
    currentMesh.rotation.y += inertia.current.vx * 0.03;
    currentMesh.rotation.x += inertia.current.vy * 0.03;
  });

  return (
    <points
      ref={meshRef}
      onPointerDown={e => {
        setDrag(true);
        last.current = [e.pointer.x, e.pointer.y];
      }}
      onPointerUp={() => setDrag(false)}
      onPointerOut={() => setDrag(false)}
      onClick={() => {
        // Trigger ripple effect at e.point
        const currentMesh = meshRef.current;
        if (!currentMesh) return;
        gsap.fromTo(currentMesh.material, { size: 0.08 }, { size: 0.22, duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' });
      }}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial attach="material" color={color} size={0.08} sizeAttenuation opacity={0.7} transparent depthWrite={false} />
    </points>
  );
}

export default function DelosBackground({ mode = 'ring' }: DelosBackgroundProps) {
  return (
    <Canvas camera={{ position: [0, 0, 24], fov: 60 }} style={{ position: 'fixed', inset: 0, zIndex: 0, background: DELOS_THEME.obsidian }}>
      <ambientLight intensity={0.5} />
      <FluidPointCloud mode={mode} />
      {/* Film Grain Effect */}
      <EffectComposer>
        <Noise opacity={0.18} />
      </EffectComposer>
    </Canvas>
  );
}
