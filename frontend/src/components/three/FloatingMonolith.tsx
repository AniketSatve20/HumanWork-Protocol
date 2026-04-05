import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   FloatingMonolith — Peripheral, slow-motion 3D element for Dashboard.
   A rotating replicant-era monolith with subtle edge glow that reacts very
   slowly to mouse movement. Non-distracting — occupies peripheral vision.
   ═══════════════════════════════════════════════════════════════════════════ */

const AMBER = new THREE.Color('#e8a317');
const ACCENT = new THREE.Color('#0abdc6');

/* ── The Monolith — rotating beveled block with edge emission ─────── */
function Monolith() {
  const meshRef = useRef<THREE.Mesh>(null!) as any;
  const matRef = useRef<THREE.ShaderMaterial>(null!) as any;
  const { pointer } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouseX: { value: 0 },
    uMouseY: { value: 0 },
    uColorA: { value: AMBER.clone() },
    uColorB: { value: ACCENT.clone() },
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    // Very slow mouse tracking — glacial response
    uniforms.uMouseX.value += (pointer.x - uniforms.uMouseX.value) * 0.003;
    uniforms.uMouseY.value += (pointer.y - uniforms.uMouseY.value) * 0.003;

    if (meshRef.current) {
      // Ultra-slow rotation
      meshRef.current.rotation.y = t * 0.04 + uniforms.uMouseX.value * 0.15;
      meshRef.current.rotation.x = Math.sin(t * 0.02) * 0.05 + uniforms.uMouseY.value * 0.08;
      meshRef.current.rotation.z = Math.sin(t * 0.03) * 0.02;

      // Gentle float
      meshRef.current.position.y = Math.sin(t * 0.15) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[0.8, 2.2, 0.4, 4, 8, 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec2 vUv;
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec2 vUv;
          uniform float uTime;
          uniform float uMouseX;
          uniform float uMouseY;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          
          void main() {
            // Base obsidian color
            vec3 baseColor = vec3(0.03, 0.035, 0.06);
            
            // Edge detection via fresnel
            vec3 viewDir = normalize(cameraPosition - vPosition);
            float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.5);
            
            // Animated edge color
            vec3 edgeColor = mix(uColorA, uColorB, sin(uTime * 0.3 + vUv.y * 3.14) * 0.5 + 0.5);
            
            // Scan line effect
            float scanLine = sin(vUv.y * 40.0 + uTime * 0.5) * 0.5 + 0.5;
            scanLine = smoothstep(0.4, 0.6, scanLine) * 0.03;
            
            // Combine
            vec3 color = baseColor + edgeColor * fresnel * 0.6 + edgeColor * scanLine;
            
            // Surface micro-detail
            float grain = fract(sin(dot(vUv * 200.0, vec2(12.9898, 78.233))) * 43758.5453);
            color += grain * 0.008;
            
            float alpha = 0.85 + fresnel * 0.15;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

/* ── Orbiting ring particles — slow, ambient ──────────────────────── */
function OrbitalParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!) as any;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 40;

  const particleData = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      radius: 1.5 + Math.random() * 1.2,
      theta: (i / count) * Math.PI * 2,
      speed: 0.03 + Math.random() * 0.05,
      yOffset: (Math.random() - 0.5) * 2,
      size: 0.008 + Math.random() * 0.015,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const p = particleData[i];
      const angle = p.theta + t * p.speed;

      dummy.position.set(
        Math.cos(angle) * p.radius,
        p.yOffset + Math.sin(t * 0.2 + p.phase) * 0.3,
        Math.sin(angle) * p.radius * 0.5
      );
      dummy.scale.setScalar(p.size * (1 + Math.sin(t + p.phase) * 0.3));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        color="#e8a317"
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

/* ── Orbital Ring — thin gold ring around monolith ────────────────── */
function OrbitalRing() {
  const ref = useRef<THREE.Mesh>(null!) as any;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.1) * 0.1;
    ref.current.rotation.z = t * 0.02;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1.8, 0.003, 8, 128]} />
      <meshBasicMaterial
        color="#e8a317"
        transparent
        opacity={0.2}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ── Camera Rig — ultra-slow mouse tracking ───────────────────────── */
function SlowCamera() {
  const { camera } = useThree();

  useFrame(({ pointer, clock }) => {
    const t = clock.getElapsedTime();
    // Extremely slow tracking — glacial response
    camera.position.x += (pointer.x * 0.15 - camera.position.x) * 0.003;
    camera.position.y += (pointer.y * 0.08 + 0.2 - camera.position.y) * 0.003;
    camera.position.z = 5 + Math.sin(t * 0.05) * 0.1;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function FloatingMonolith() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.35 }}
    >
      <Canvas
        camera={{ position: [0, 0.2, 5], fov: 35 }}
        dpr={[1, Math.min(window.devicePixelRatio, 1.5)]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'default',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.03} />
        <pointLight position={[3, 2, 4]} intensity={0.08} color="#e8a317" distance={15} decay={2} />
        <pointLight position={[-2, -1, 3]} intensity={0.04} color="#0abdc6" distance={12} decay={2} />

        <Suspense fallback={null}>
          <Monolith />
          <OrbitalParticles />
          <OrbitalRing />
          <SlowCamera />
        </Suspense>

        <EffectComposer>
          <Bloom
            intensity={0.4}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.95}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
