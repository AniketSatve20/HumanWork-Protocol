import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// ── Glowing verification shield — KYC identity ──────────────────

function Shield({ verified = false }: { verified?: boolean }) {
  const groupRef = useRef<THREE.Group>(null!) as any;
  const glowRef  = useRef<THREE.Mesh>(null!) as any;

  const color     = verified ? '#22c55e' : '#e8a317';
  const emissive  = verified ? '#22c55e' : '#e8a317';
  const intensity = verified ? 0.4 : 0.15;

  // Shield shape — tapered hexagonal
  const shieldGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.2);
    shape.lineTo(0.85, 0.7);
    shape.lineTo(0.85, -0.1);
    shape.lineTo(0.55, -0.7);
    shape.lineTo(0, -1.1);
    shape.lineTo(-0.55, -0.7);
    shape.lineTo(-0.85, -0.1);
    shape.lineTo(-0.85, 0.7);
    shape.closePath();

    const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(shieldGeo), [shieldGeo]);

  // Inner check/lock symbol
  const symbolGeo = useMemo(() => {
    if (verified) {
      // Checkmark shape
      const s = new THREE.Shape();
      s.moveTo(-0.3, 0.05);
      s.lineTo(-0.1, -0.2);
      s.lineTo(0.35, 0.35);
      s.lineTo(0.3, 0.4);
      s.lineTo(-0.1, -0.05);
      s.lineTo(-0.25, 0.1);
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false });
    } else {
      // Lock body
      return new THREE.BoxGeometry(0.4, 0.35, 0.08);
    }
  }, [verified]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.2;
    }
    if (glowRef.current) {
      const pulse = verified ? 0.8 + Math.sin(t * 2) * 0.2 : 0.4 + Math.sin(t * 1.5) * 0.15;
      glowRef.current.material.opacity = pulse * 0.08;
      glowRef.current.scale.setScalar(1.6 + Math.sin(t * 1.2) * 0.1);
    }
  });

  return (
    <Float speed={0.6} rotationIntensity={0.02} floatIntensity={0.1}>
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Shield body */}
        <mesh geometry={shieldGeo as any} position={[0, 0, -0.06]}>
          <meshStandardMaterial
            color="#0a0c15"
            emissive={emissive}
            emissiveIntensity={intensity}
            roughness={0.3}
            metalness={0.9}
            transparent
            opacity={0.35}
          />
        </mesh>

        {/* Wireframe */}
        <lineSegments geometry={edgesGeo as any} position={[0, 0, -0.06]}>
          <lineBasicMaterial color={color} transparent opacity={0.5} />
        </lineSegments>

        {/* Inner symbol */}
        <mesh geometry={symbolGeo as any} position={verified ? [0, 0, 0.02] : [0, -0.05, 0.02]}>
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Lock arch (only when not verified) */}
        {!verified && (
          <mesh position={[0, 0.2, 0.02]}>
            <torusGeometry args={[0.12, 0.025, 8, 16, Math.PI]} />
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={0.4}
              transparent
              opacity={0.7}
            />
          </mesh>
        )}

        {/* Glow sphere */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.6, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} />
        </mesh>

        {/* Orbiting ring */}
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.4, 0.004, 8, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
        <mesh rotation={[Math.PI / 2.5, Math.PI / 4, 0]}>
          <torusGeometry args={[1.6, 0.003, 8, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.08} />
        </mesh>
      </group>
    </Float>
  );
}

// ── Verification particles — ascending data motes ───────────────
function VerificationParticles({ count = 20, verified = false }: { count?: number; verified?: boolean }) {
  const ref = useRef<THREE.Points>(null!) as any;
  const color = verified ? '#22c55e' : '#e8a317';

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 4;
      p[i * 3 + 1] = (Math.random() - 0.5) * 4;
      p[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return p;
  }, [count]);

  useFrame(() => {
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += 0.003;
      if (arr[i * 3 + 1] > 2) {
        arr[i * 3 + 1] = -2;
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
      <pointsMaterial size={0.015} color={color} transparent opacity={0.3} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export default function ShieldOrb({ verified = false }: { verified?: boolean }) {
  return (
    <div className="w-full h-full min-h-[200px]" style={{ opacity: 0.85 }}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.08} />
          <directionalLight position={[3, 3, 3]} intensity={0.4} color={verified ? '#22c55e' : '#e8a317'} />
          <pointLight position={[-2, -1, -2]} intensity={0.15} color="#0abdc6" />
          <Shield verified={verified} />
          <VerificationParticles count={15} verified={verified} />
        </Suspense>
      </Canvas>
    </div>
  );
}
