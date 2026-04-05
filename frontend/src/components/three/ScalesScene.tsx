import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// ── 3D Balance Scales — dispute resolution visualization ────────

function ScaleBeam({
  tilt = 0, // -1 to 1 — negative = left down, positive = right down
}: { tilt?: number }) {
  const beamRef  = useRef<THREE.Group>(null!) as any;
  const leftRef  = useRef<THREE.Group>(null!) as any;
  const rightRef = useRef<THREE.Group>(null!) as any;
  const pivotRef = useRef<THREE.Mesh>(null!) as any;

  const targetTilt = THREE.MathUtils.clamp(tilt, -1, 1) * 0.15;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Gentle sway + tilt toward the heavier side
    const sway = Math.sin(t * 0.8) * 0.02;
    if (beamRef.current) {
      beamRef.current.rotation.z += (targetTilt + sway - beamRef.current.rotation.z) * 0.03;
    }

    // Keep pans level (counter-rotate beam tilt)
    if (leftRef.current && rightRef.current) {
      const beamZ = beamRef.current?.rotation.z || 0;
      leftRef.current.rotation.z  = -beamZ;
      rightRef.current.rotation.z = -beamZ;
    }

    // Pivot glow pulse
    if (pivotRef.current) {
      pivotRef.current.material.emissiveIntensity = 0.2 + Math.sin(t * 2) * 0.08;
    }
  });

  return (
    <Float speed={0.3} rotationIntensity={0.01} floatIntensity={0.08}>
      <group position={[0, 0, 0]}>
        {/* Central pillar */}
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 0.8, 8]} />
          <meshStandardMaterial color="#1a1d2e" emissive="#e8a317" emissiveIntensity={0.08} metalness={0.9} roughness={0.3} />
        </mesh>

        {/* Base */}
        <mesh position={[0, -0.9, 0]}>
          <cylinderGeometry args={[0.35, 0.4, 0.06, 16]} />
          <meshStandardMaterial color="#0d0f1a" emissive="#e8a317" emissiveIntensity={0.04} metalness={0.95} roughness={0.2} />
        </mesh>

        {/* Pivot point */}
        <mesh ref={pivotRef} position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#e8a317" emissive="#e8a317" emissiveIntensity={0.2} metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Beam */}
        <group ref={beamRef} position={[0, -0.05, 0]}>
          <mesh>
            <boxGeometry args={[2, 0.025, 0.025]} />
            <meshStandardMaterial color="#1e2236" emissive="#e8a317" emissiveIntensity={0.06} metalness={0.9} roughness={0.3} />
          </mesh>

          {/* Left chains */}
          {[0.15, 0.3, 0.45].map((y, i) => (
            <mesh key={`lc-${i}`} position={[-0.9, -y, 0]}>
              <torusGeometry args={[0.02, 0.004, 4, 8]} />
              <meshBasicMaterial color="#e8a317" transparent opacity={0.4} />
            </mesh>
          ))}
          {/* Right chains */}
          {[0.15, 0.3, 0.45].map((y, i) => (
            <mesh key={`rc-${i}`} position={[0.9, -y, 0]}>
              <torusGeometry args={[0.02, 0.004, 4, 8]} />
              <meshBasicMaterial color="#e8a317" transparent opacity={0.4} />
            </mesh>
          ))}

          {/* Left pan */}
          <group ref={leftRef} position={[-0.9, -0.55, 0]}>
            <mesh>
              <cylinderGeometry args={[0.25, 0.28, 0.04, 16]} />
              <meshStandardMaterial
                color="#0f1220"
                emissive="#0abdc6"
                emissiveIntensity={0.12}
                metalness={0.9}
                roughness={0.25}
                transparent
                opacity={0.6}
              />
            </mesh>
            {/* Pan rim */}
            <mesh>
              <torusGeometry args={[0.27, 0.008, 8, 32]} />
              <meshBasicMaterial color="#0abdc6" transparent opacity={0.35} />
            </mesh>
          </group>

          {/* Right pan */}
          <group ref={rightRef} position={[0.9, -0.55, 0]}>
            <mesh>
              <cylinderGeometry args={[0.25, 0.28, 0.04, 16]} />
              <meshStandardMaterial
                color="#0f1220"
                emissive="#0abdc6"
                emissiveIntensity={0.12}
                metalness={0.9}
                roughness={0.25}
                transparent
                opacity={0.6}
              />
            </mesh>
            <mesh>
              <torusGeometry args={[0.27, 0.008, 8, 32]} />
              <meshBasicMaterial color="#0abdc6" transparent opacity={0.35} />
            </mesh>
          </group>
        </group>

        {/* Orbital ring decoration */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <torusGeometry args={[1.3, 0.003, 8, 64]} />
          <meshBasicMaterial color="#e8a317" transparent opacity={0.06} />
        </mesh>
      </group>
    </Float>
  );
}

// ── Justice particles — drifting evidence motes ─────────────────
function JusticeParticles({ count = 20 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!) as any;

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 4;
      p[i * 3 + 1] = (Math.random() - 0.5) * 3;
      p[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return p;
  }, [count]);

  useFrame(({ clock }) => {
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      arr[i * 3]     += Math.sin(t * 0.3 + i) * 0.0008;
      arr[i * 3 + 1] += 0.001;
      if (arr[i * 3 + 1] > 1.5) {
        arr[i * 3 + 1] = -1.5;
        arr[i * 3] = (Math.random() - 0.5) * 4;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.012} color="#e8a317" transparent opacity={0.2} sizeAttenuation depthWrite={false} />
    </points>
  );
}

interface ScalesSceneProps {
  /** -1 to 1: negative = client favored, positive = freelancer favored, 0 = balanced */
  tilt?: number;
}

export default function ScalesScene({ tilt = 0 }: ScalesSceneProps) {
  return (
    <div className="w-full h-full min-h-[200px]" style={{ opacity: 0.85 }}>
      <Canvas
        camera={{ position: [0, 0.2, 3], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.08} />
          <directionalLight position={[3, 4, 3]} intensity={0.45} color="#e8a317" />
          <pointLight position={[-3, -1, -2]} intensity={0.15} color="#0abdc6" />
          <ScaleBeam tilt={tilt} />
          <JusticeParticles count={15} />
        </Suspense>
      </Canvas>
    </div>
  );
}
