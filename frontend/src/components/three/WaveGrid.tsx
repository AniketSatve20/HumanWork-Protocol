import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Animated wave grid floor ───────────────────────────────────────────────
   A grid of dots that ripple like water. Sits behind landing page sections.
   ─────────────────────────────────────────────────────────────────────────── */

function WaveDots() {
  const meshRef = useRef<THREE.InstancedMesh>(null!) as any;
  const cols = 40;
  const rows = 25;
  const count = cols * rows;
  const spacing = 0.5;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(() => {
    const arr: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push([
          (c - cols / 2) * spacing,
          (r - rows / 2) * spacing,
        ]);
      }
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const [x, z] = offsets[i];
      const dist = Math.sqrt(x * x + z * z);
      const y = Math.sin(dist * 0.6 - t * 0.8) * 0.15 + Math.sin(x * 0.4 + t * 0.5) * 0.08;
      dummy.position.set(x, y, z);
      const s = 0.025 + Math.sin(dist * 0.5 - t * 0.6) * 0.008;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#e8a317" transparent opacity={0.25} />
    </instancedMesh>
  );
}

export default function WaveGrid() {
  return (
    <Canvas
      camera={{ position: [0, 6, 8], fov: 50 }}
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <WaveDots />
    </Canvas>
  );
}
