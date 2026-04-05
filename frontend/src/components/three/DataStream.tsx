import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Vertical data-stream particles ──────────────────────────────────────────
   Streams of tiny dots rising upward like data flowing through a pipeline.
   Used behind the features / escrow sections.
   ────────────────────────────────────────────────────────────────────────── */

function StreamParticles({ count = 200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!) as any;

  const [positions, speeds, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const pha = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Random x/z in a vertical column spread
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 2;
      spd[i] = 0.3 + Math.random() * 0.6;
      pha[i] = Math.random() * Math.PI * 2;
    }
    return [pos, spd, pha];
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const posArr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      // Rise upward
      posArr[i * 3 + 1] += speeds[i] * 0.012;
      // Gentle horizontal sway
      posArr[i * 3] += Math.sin(t * 0.5 + phases[i]) * 0.001;
      // Reset when above view
      if (posArr[i * 3 + 1] > 5) {
        posArr[i * 3 + 1] = -5;
        posArr[i * 3] = (Math.random() - 0.5) * 8;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#0abdc6"
        size={0.03}
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function StreamLines() {
  const ref = useRef<THREE.Group>(null!) as any;
  const lineCount = 6;

  const lines = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => {
      const x = (i - lineCount / 2) * 1.5 + (Math.random() - 0.5) * 0.5;
      const z = -1 + Math.random() * -2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j < 20; j++) {
        pts.push(new THREE.Vector3(x + Math.sin(j * 0.3) * 0.15, j * 0.5 - 5, z));
      }
      return new THREE.BufferGeometry().setFromPoints(pts);
    });
  }, []);

  const lineObjects = useMemo(() => {
    return lines.map((geo) => {
      const mat = new THREE.LineBasicMaterial({ color: '#e8a317', transparent: true, opacity: 0.06 });
      return new THREE.Line(geo, mat);
    });
  }, [lines]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.children.forEach((child: THREE.Object3D, i: number) => {
      const line = child as THREE.Line;
      const arr = line.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < 20; j++) {
        arr[j * 3] += Math.sin(t * 0.4 + i + j * 0.2) * 0.0005;
      }
      line.geometry.attributes.position.needsUpdate = true;
    });
  });

  return (
    <group ref={ref}>
      {lineObjects.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </group>
  );
}

export default function DataStream() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <StreamParticles />
      <StreamLines />
    </Canvas>
  );
}
