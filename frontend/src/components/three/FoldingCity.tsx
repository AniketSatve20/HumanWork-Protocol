import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   FoldingCity — Blade Runner 2049-inspired dystopian background.
   Deep infinite space with folding geometry planes, particle vortex,
   and scroll-driven vanishing point shift.
   ═══════════════════════════════════════════════════════════════════════════ */

const AMBER = new THREE.Color('#e8a317');
const ACCENT = new THREE.Color('#0abdc6');
const BG = new THREE.Color('#080b12');

/* ── Folding Architectural Planes ─────────────────────────────────────── */
function FoldingPlanes({ scrollProgress = 0 }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null!) as any;
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);

  const planeCount = 12;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFold: { value: 0 },
    uColorA: { value: AMBER.clone() },
    uColorB: { value: ACCENT.clone() },
    uColorBG: { value: BG.clone() },
  }), []);

  const planes = useMemo(() => {
    const items = [];
    for (let i = 0; i < planeCount; i++) {
      const depth = -3 - i * 4;
      const angle = (i * Math.PI) / 6;
      const scale = 1 + i * 0.5;
      items.push({ depth, angle, scale, index: i });
    }
    return items;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uFold.value = scrollProgress;

    if (groupRef.current) {
      // Slow rotation to create sense of descent
      groupRef.current.rotation.z = Math.sin(t * 0.05) * 0.02 + scrollProgress * 0.15;
      groupRef.current.position.y = scrollProgress * -2;
    }
  });

  const vertexShader = `
    varying vec2 vUv;
    varying float vDepth;
    uniform float uTime;
    uniform float uFold;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Folding effect — panels curl based on scroll
      float foldAngle = uFold * 1.2;
      float foldX = sin(pos.x * 0.5 + uTime * 0.1) * foldAngle * 0.3;
      float foldY = cos(pos.y * 0.5 + uTime * 0.08) * foldAngle * 0.2;
      pos.z += foldX + foldY;
      pos.y += sin(pos.x * 1.5 + uTime * 0.15) * uFold * 0.1;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vDepth = -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    varying float vDepth;
    uniform float uTime;
    uniform float uFold;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorBG;
    
    void main() {
      // Wireframe grid pattern
      vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5);
      float line = min(grid.x, grid.y);
      float wire = 1.0 - smoothstep(0.0, 0.04, line);
      
      // Cross-hatch accent lines
      vec2 diag = abs(fract((vUv.x + vUv.y) * 15.0 - 0.5) - 0.5);
      float cross = 1.0 - smoothstep(0.0, 0.02, diag.x);
      
      // Depth fog
      float fog = smoothstep(5.0, 60.0, vDepth);
      
      // Color mixing
      vec3 wireColor = mix(uColorA, uColorB, sin(vUv.x * 3.14 + uTime * 0.2) * 0.5 + 0.5);
      vec3 color = mix(uColorBG, wireColor, wire * 0.6 + cross * 0.15);
      
      // Edge glow
      float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x)
                     * smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
      
      float alpha = (wire * 0.5 + cross * 0.1) * edgeFade * (1.0 - fog * 0.9);
      
      // Film grain
      float grain = fract(sin(dot(vUv * 200.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
      color += grain * 0.01;
      
      gl_FragColor = vec4(color, alpha * 0.7);
    }
  `;

  return (
    <group ref={groupRef}>
      {planes.map((p) => (
        <mesh
          key={p.index}
          position={[
            Math.sin(p.angle) * 2,
            Math.cos(p.angle) * 1.5,
            p.depth,
          ]}
          rotation={[
            p.angle * 0.3,
            p.angle * 0.2,
            p.index * 0.1,
          ]}
        >
          <planeGeometry args={[p.scale * 6, p.scale * 4, 32, 32]} />
          <shaderMaterial
            ref={(el: any) => { if (el) materialsRef.current[p.index] = el; }}
            uniforms={uniforms}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Particle Vortex — spiraling particles creating depth tunnel ───── */
function ParticleVortex({ scrollProgress = 0 }: { scrollProgress: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!) as any;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 600;

  const particleData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const radius = 1 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.3;
      const depth = -Math.random() * 50;
      const size = 0.01 + Math.random() * 0.03;
      const verticalOffset = (Math.random() - 0.5) * 6;
      data.push({ radius, theta, speed, depth, size, verticalOffset });
    }
    return data;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const scrollShift = scrollProgress * 15;

    for (let i = 0; i < count; i++) {
      const p = particleData[i];
      const angle = p.theta + t * p.speed * 0.2;
      const r = p.radius * (1 + Math.sin(t * 0.3 + i) * 0.1);

      dummy.position.set(
        Math.cos(angle) * r,
        Math.sin(angle) * r * 0.4 + p.verticalOffset + Math.sin(t * 0.5 + i * 0.1) * 0.3,
        p.depth + scrollShift + Math.sin(t * p.speed) * 2
      );
      dummy.scale.setScalar(p.size * (1 + Math.sin(t * 2 + i) * 0.3));
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
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

/* ── Geometric Corridor — receding rectangular frames ─────────────── */
function GeometricCorridor({ scrollProgress = 0 }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null!) as any;
  const frameCount = 20;

  const frames = useMemo(() => {
    return Array.from({ length: frameCount }, (_, i) => ({
      depth: -i * 3 - 5,
      scale: 1 + i * 0.4,
      rotation: i * 0.08,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.z = scrollProgress * 0.3 + Math.sin(t * 0.03) * 0.02;
  });

  return (
    <group ref={groupRef}>
      {frames.map((f, i) => {
        const w = f.scale * 4;
        const h = f.scale * 2.5;
        const opacity = Math.max(0.02, 0.25 - i * 0.012);

        return (
          <group key={i} position={[0, 0, f.depth + scrollProgress * 8]} rotation={[0, 0, f.rotation]}>
            {/* Top edge */}
            <mesh position={[0, h / 2, 0]}>
              <planeGeometry args={[w, 0.005]} />
              <meshBasicMaterial color={i % 3 === 0 ? '#e8a317' : '#0abdc6'} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Bottom edge */}
            <mesh position={[0, -h / 2, 0]}>
              <planeGeometry args={[w, 0.005]} />
              <meshBasicMaterial color={i % 3 === 0 ? '#e8a317' : '#0abdc6'} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Left edge */}
            <mesh position={[-w / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <planeGeometry args={[h, 0.005]} />
              <meshBasicMaterial color={i % 3 === 0 ? '#e8a317' : '#0abdc6'} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Right edge */}
            <mesh position={[w / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <planeGeometry args={[h, 0.005]} />
              <meshBasicMaterial color={i % 3 === 0 ? '#e8a317' : '#0abdc6'} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Corner accents */}
            {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([cx, cy], ci) => (
              <mesh key={ci} position={[cx * w / 2, cy * h / 2, 0]}>
                <circleGeometry args={[0.015 + i * 0.003, 6]} />
                <meshBasicMaterial color="#e8a317" transparent opacity={opacity * 1.5} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ── Ambient Fog Plane — adds atmospheric depth ───────────────────── */
function FogPlane() {
  const matRef = useRef<THREE.ShaderMaterial>(null!) as any;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh position={[0, 0, -30]} scale={[40, 25, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          
          void main() {
            // Radial gradient with animated nebula
            vec2 center = vec2(0.5, 0.5);
            float d = length(vUv - center);
            
            // Animated color clouds
            float n1 = sin(vUv.x * 3.0 + uTime * 0.1) * cos(vUv.y * 4.0 + uTime * 0.08);
            float n2 = sin((vUv.x + vUv.y) * 5.0 + uTime * 0.12);
            
            vec3 col1 = vec3(0.910, 0.639, 0.090) * 0.03; // amber
            vec3 col2 = vec3(0.039, 0.741, 0.776) * 0.04; // cyan
            vec3 color = mix(col1, col2, n1 * 0.5 + 0.5) + col1 * n2 * 0.02;
            
            float alpha = smoothstep(0.8, 0.0, d) * 0.3;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

/* ── Camera Rig — parallax + scroll-driven vanishing point ────────── */
function ScrollCamera({ scrollProgress = 0 }: { scrollProgress: number }) {
  const { camera } = useThree();

  useFrame(({ pointer, clock }) => {
    const t = clock.getElapsedTime();

    // Mouse parallax
    const targetX = pointer.x * 0.5;
    const targetY = pointer.y * 0.3 + 0.5;

    camera.position.x += (targetX - camera.position.x) * 0.015;
    camera.position.y += (targetY - camera.position.y) * 0.015;

    // Scroll shifts the vanishing point — descending into dystopian depths
    camera.position.z = 6 - scrollProgress * 3;
    camera.rotation.x = -scrollProgress * 0.1 + Math.sin(t * 0.05) * 0.01;

    camera.lookAt(0, scrollProgress * -0.5, -20);
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Export — FoldingCity Scene
   ══════════════════════════════════════════════════════════════════════════ */

interface FoldingCityProps {
  scrollProgress?: number;
}

export default function FoldingCity({ scrollProgress = 0 }: FoldingCityProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 6], fov: 60, near: 0.1, far: 100 }}
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#080b12']} />
      <fog attach="fog" args={['#080b12', 15, 60]} />

      <ambientLight intensity={0.05} />
      <pointLight position={[5, 3, 2]} intensity={0.2} color="#e8a317" distance={25} decay={2} />
      <pointLight position={[-4, -2, -5]} intensity={0.1} color="#0abdc6" distance={20} decay={2} />

      <FoldingPlanes scrollProgress={scrollProgress} />
      <GeometricCorridor scrollProgress={scrollProgress} />
      <ParticleVortex scrollProgress={scrollProgress} />
      <FogPlane />
      <ScrollCamera scrollProgress={scrollProgress} />

      <EffectComposer multisampling={4}>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <DepthOfField
          focusDistance={0.01}
          focalLength={0.05}
          bokehScale={3}
        />
      </EffectComposer>
    </Canvas>
  );
}
