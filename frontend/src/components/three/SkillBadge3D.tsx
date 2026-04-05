import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// ── 3D Rotating Skill Badge — hexagonal achievement token ───────

function HexBadge({ score = 0 }: { score?: number }) {
  const groupRef = useRef<THREE.Group>(null!) as any;
  const innerRef = useRef<THREE.Mesh>(null!) as any;
  const ringRef  = useRef<THREE.Mesh>(null!) as any;

  // Color based on score
  const badgeColor = useMemo(() => {
    if (score >= 90) return '#22c55e'; // green — excellent
    if (score >= 70) return '#e8a317'; // gold — good
    if (score >= 50) return '#0abdc6'; // blue — passing
    return '#6b7280';                  // gray — default
  }, [score]);

  const hexGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const sides = 6;
    const radius = 0.9;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
  }, []);

  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(hexGeo), [hexGeo]);

  // Star shape in center
  const starGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outer = 0.35;
    const inner = 0.15;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.25;
    }
    if (innerRef.current) {
      innerRef.current.rotation.z = -t * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.15;
    }
  });

  return (
    <Float speed={0.5} rotationIntensity={0.04} floatIntensity={0.12}>
      <group ref={groupRef}>
        {/* Main hex body */}
        <mesh geometry={hexGeo as any} position={[0, 0, -0.075]}>
          <meshStandardMaterial
            color="#0b0d18"
            emissive={badgeColor}
            emissiveIntensity={0.12}
            roughness={0.25}
            metalness={0.95}
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Hex wireframe */}
        <lineSegments geometry={edgesGeo as any} position={[0, 0, -0.075]}>
          <lineBasicMaterial color={badgeColor} transparent opacity={0.55} />
        </lineSegments>

        {/* Inner rotating star */}
        <mesh ref={innerRef} geometry={starGeo as any} position={[0, 0, 0.03]}>
          <meshStandardMaterial
            color={badgeColor}
            emissive={badgeColor}
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Score ring — arc proportional to score */}
        {score > 0 && (
          <mesh ref={ringRef} rotation={[0, 0, -Math.PI / 2]}>
            <torusGeometry args={[1.15, 0.02, 8, 64, (score / 100) * Math.PI * 2]} />
            <meshBasicMaterial color={badgeColor} transparent opacity={0.6} />
          </mesh>
        )}

        {/* Background ring track */}
        <mesh>
          <torusGeometry args={[1.15, 0.008, 8, 64]} />
          <meshBasicMaterial color="#2C3E50" transparent opacity={0.15} />
        </mesh>

        {/* Outer decoration ring */}
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[1.35, 0.003, 8, 64]} />
          <meshBasicMaterial color={badgeColor} transparent opacity={0.1} />
        </mesh>
      </group>
    </Float>
  );
}

// ── Achievement particles ───────────────────────────────────────
function AchievementParticles({ color = '#e8a317' }: { color?: string }) {
  const ref = useRef<THREE.Points>(null!) as any;
  const count = 25;

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.8 + Math.random() * 1.5;
      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      velocities[i] = 0.001 + Math.random() * 0.003;
    }
    return { positions, velocities };
  }, []);

  useFrame(({ clock }) => {
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      // Orbit around center
      const angle = t * velocities[i] + (i / count) * Math.PI * 2;
      const r = 1 + Math.sin(t * 0.5 + i) * 0.3;
      arr[i * 3]     = Math.cos(angle) * r;
      arr[i * 3 + 2] = Math.sin(angle) * r;
      arr[i * 3 + 1] += Math.sin(t * 2 + i) * 0.001;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.012} color={color} transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export default function SkillBadge3D({ score = 0 }: { score?: number }) {
  const badgeColor = score >= 90 ? '#22c55e' : score >= 70 ? '#e8a317' : score >= 50 ? '#0abdc6' : '#6b7280';

  return (
    <div className="w-full h-full min-h-[220px]" style={{ opacity: 0.9 }}>
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          <directionalLight position={[3, 4, 3]} intensity={0.5} color={badgeColor} />
          <pointLight position={[-2, -1, -2]} intensity={0.12} color="#0abdc6" />
          <HexBadge score={score} />
          <AchievementParticles color={badgeColor} />
          <Sparkles count={8} scale={4} size={0.3} speed={0.05} color={badgeColor} opacity={0.08} />
        </Suspense>
      </Canvas>
    </div>
  );
}
