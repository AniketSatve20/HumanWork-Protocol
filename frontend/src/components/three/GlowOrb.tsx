import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

/* ── Pulsing glow orb ────────────────────────────────────────────────────────
   A luminous sphere with orbiting rings. Used for the CTA section.
   ────────────────────────────────────────────────────────────────────────── */

function InnerOrb() {
  const ref = useRef<THREE.Mesh>(null!) as any;
  const matRef = useRef<THREE.MeshStandardMaterial>(null!) as any;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.15;
    ref.current.rotation.z = Math.sin(t * 0.3) * 0.1;
    const pulse = 0.95 + Math.sin(t * 1.2) * 0.05;
    ref.current.scale.setScalar(pulse);
    matRef.current.emissiveIntensity = 0.6 + Math.sin(t * 1.5) * 0.25;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.2, 3]} />
      <meshStandardMaterial
        ref={matRef}
        color="#e8a317"
        emissive="#e8a317"
        emissiveIntensity={0.6}
        wireframe
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

function OrbRing({ radius, speed, tiltX, tiltZ }: { radius: number; speed: number; tiltX: number; tiltZ: number }) {
  const ref = useRef<THREE.Mesh>(null!) as any;
  useFrame(({ clock }) => {
    ref.current.rotation.z = tiltZ + clock.getElapsedTime() * speed;
    ref.current.rotation.x = tiltX;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.008, 8, 80]} />
      <meshBasicMaterial color="#0abdc6" transparent opacity={0.25} />
    </mesh>
  );
}

function EnergyField() {
  const ref = useRef<THREE.Points>(null!) as any;
  const count = 80;

  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const pha = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + Math.random() * 0.5;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      pha[i] = Math.random() * Math.PI * 2;
    }
    return [pos, pha];
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const r = 1.8 + Math.sin(t * 0.5 + phases[i]) * 0.3;
      const theta = phases[i] + t * 0.2;
      const phi = Math.acos(2 * (i / count) - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y = t * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#e8a317"
        size={0.04}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* Mouse-following light */
function OrbMouseLight() {
  const lightRef = useRef<THREE.PointLight>(null!) as any;
  const { viewport } = useThree();
  useFrame(({ pointer }) => {
    lightRef.current.position.x += ((pointer.x * viewport.width) / 2 - lightRef.current.position.x) * 0.04;
    lightRef.current.position.y += ((pointer.y * viewport.height) / 2 - lightRef.current.position.y) * 0.04;
  });
  return <pointLight ref={lightRef} position={[0, 0, 3]} intensity={0.3} color="#e8a317" distance={10} decay={2} />;
}

export default function GlowOrb() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 40 }}
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.15} />
      <pointLight position={[3, 3, 3]} intensity={0.4} color="#e8a317" />
      <pointLight position={[-3, -2, 2]} intensity={0.2} color="#0abdc6" />
      <OrbMouseLight />
      <InnerOrb />
      <OrbRing radius={1.7} speed={0.3} tiltX={0.4} tiltZ={0} />
      <OrbRing radius={2.0} speed={-0.2} tiltX={-0.6} tiltZ={0.8} />
      <OrbRing radius={2.3} speed={0.15} tiltX={1.2} tiltZ={-0.3} />
      <EnergyField />
      <Sparkles count={20} size={1.5} scale={4} color="#e8a317" opacity={0.3} speed={0.3} />

      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
