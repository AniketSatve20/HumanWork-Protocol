import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   HeroScene — Westworld / Delos Manufacturing Aesthetic
   ─────────────────────────────────────────────────────────────────────────
   Concentric structural rings with a topographical contour field.
   Muted aluminum/gold palette on obsidian. Sublime, precise, architectural.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Topographical Contour Plane ─────────────────────────────────────── */
function ContourPlane() {
  const meshRef = useRef<THREE.Mesh>(null!) as any;
  const matRef = useRef<THREE.ShaderMaterial>(null!) as any;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAluminum: { value: new THREE.Color('#D1D1D1') },
    uGold:     { value: new THREE.Color('#C9A96E') },
    uBg:       { value: new THREE.Color('#1A1A1B') },
  }), []);

  useFrame(({ clock }) => {
    matRef.current.uniforms.uTime.value = clock.getElapsedTime() * 0.08;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -3]} rotation={[0, 0, 0]}>
      <planeGeometry args={[22, 14, 80, 80]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`
          varying vec2 vUv;
          varying float vElevation;
          uniform float uTime;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            float elevation = sin(pos.x * 0.6 + uTime * 1.5) * 0.25 
                            + sin(pos.y * 0.5 + uTime * 1.0) * 0.18
                            + sin((pos.x + pos.y) * 0.35 + uTime * 0.7) * 0.12;
            pos.z += elevation;
            vElevation = elevation;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          varying float vElevation;
          uniform vec3 uAluminum;
          uniform vec3 uGold;
          uniform vec3 uBg;
          uniform float uTime;
          
          void main() {
            float mixStrength = (vElevation + 0.5) * 0.5 + 0.25;
            
            // Contour lines — topographical effect
            float contour = abs(fract(vElevation * 5.0) - 0.5);
            float contourLine = 1.0 - smoothstep(0.0, 0.03, contour);
            
            // Base: obsidian with subtle aluminum/gold contour lines
            vec3 lineColor = mix(uAluminum, uGold, smoothstep(0.3, 0.7, mixStrength) * 0.4);
            vec3 color = mix(uBg, lineColor, contourLine * 0.3);
            
            // Subtle gradient wash
            color += uAluminum * smoothstep(0.6, 1.0, mixStrength) * 0.03;
            
            // Fade edges
            float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x)
                           * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
            
            gl_FragColor = vec4(color, 0.4 * edgeFade);
          }
        `}
      />
    </mesh>
  );
}

/* ── Floating Constellation — Aluminum White ─────────────────────────── */
function FloatingConstellation() {
  const ref = useRef<THREE.Points>(null!) as any;
  const count = 80;

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      siz[i] = 0.012 + Math.random() * 0.02;
    }
    return { positions: pos, sizes: siz };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.rotation.y = Math.sin(t * 0.03) * 0.06;
    ref.current.rotation.x = Math.cos(t * 0.02) * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        color="#D1D1D1"
        size={0.03}
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── Subtle Mesa Particles — Cool slate layer ────────────────────────── */
function MesaParticles() {
  const ref = useRef<THREE.Points>(null!) as any;
  const count = 35;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 2;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.rotation.y = -Math.sin(t * 0.025) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#8A9BA8"
        size={0.02}
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── Structural Horizon Line — Aluminum ──────────────────────────────── */
function HorizonLine() {
  return (
    <mesh position={[0, -2.8, -1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 0.002]} />
      <meshBasicMaterial color="#D1D1D1" transparent opacity={0.08} />
    </mesh>
  );
}

/* ── Camera Parallax — Precise, architectural ────────────────────────── */
function CameraRig() {
  useFrame(({ camera, pointer }) => {
    camera.position.x += (pointer.x * 0.3 - camera.position.x) * 0.01;
    camera.position.y += (pointer.y * 0.15 - camera.position.y + 0.3) * 0.01;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ── Mouse-following Light — Warm gold, subtle ───────────────────────── */
function MouseLight() {
  const lightRef = useRef<THREE.PointLight>(null!) as any;
  const { viewport } = useThree();

  useFrame(({ pointer }) => {
    const x = (pointer.x * viewport.width) / 2;
    const y = (pointer.y * viewport.height) / 2;
    lightRef.current.position.x += (x - lightRef.current.position.x) * 0.025;
    lightRef.current.position.y += (y - lightRef.current.position.y) * 0.025;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 0, 4]}
      intensity={0.15}
      color="#C9A96E"
      distance={15}
      decay={2}
    />
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 6], fov: 35 }}
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'default',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.05} />
      <pointLight position={[5, 3, 4]} intensity={0.08} color="#C9A96E" distance={20} />
      <pointLight position={[-4, -2, 3]} intensity={0.04} color="#8A9BA8" distance={15} />

      <MouseLight />
      <ContourPlane />
      <FloatingConstellation />
      <MesaParticles />
      <HorizonLine />
      <CameraRig />

      <Sparkles count={12} size={0.6} scale={8} color="#D1D1D1" opacity={0.08} speed={0.06} />

      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.95}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
