import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   Dashboard Background — Subtle animated gradient mesh.
   Clean, professional, non-distracting ambient effect.
   ═══════════════════════════════════════════════════════════════════════════ */

function GradientMesh() {
  const meshRef = useRef<THREE.Mesh>(null!) as any;
  const matRef = useRef<THREE.ShaderMaterial>(null!) as any;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#e8a317') },
    uColorB: { value: new THREE.Color('#0abdc6') },
    uColorC: { value: new THREE.Color('#080b12') },
  }), []);

  useFrame(({ clock }) => {
    matRef.current.uniforms.uTime.value = clock.getElapsedTime() * 0.08;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[30, 20, 32, 32]} />
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
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;
          
          void main() {
            // Create flowing gradient blobs
            vec2 center1 = vec2(0.3 + sin(uTime * 0.7) * 0.15, 0.7 + cos(uTime * 0.5) * 0.1);
            vec2 center2 = vec2(0.7 + cos(uTime * 0.6) * 0.12, 0.3 + sin(uTime * 0.8) * 0.15);
            vec2 center3 = vec2(0.5 + sin(uTime * 0.4) * 0.1, 0.5 + cos(uTime * 0.3) * 0.1);
            
            float d1 = 1.0 - smoothstep(0.0, 0.5, length(vUv - center1));
            float d2 = 1.0 - smoothstep(0.0, 0.45, length(vUv - center2));
            float d3 = 1.0 - smoothstep(0.0, 0.6, length(vUv - center3));
            
            vec3 color = uColorC;
            color = mix(color, uColorA, d1 * 0.08);
            color = mix(color, uColorB, d2 * 0.06);
            color = mix(color, uColorA, d3 * 0.04);
            
            // Subtle vignette
            float vignette = 1.0 - smoothstep(0.4, 1.2, length(vUv - 0.5) * 1.4);
            
            gl_FragColor = vec4(color, 0.6 * vignette);
          }
        `}
      />
    </mesh>
  );
}

/* Very sparse, slow-moving accent particles */
function SubtleParticles() {
  const ref = useRef<THREE.Points>(null!) as any;
  const count = 25;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 2;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.rotation.y = Math.sin(t * 0.02) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#e8a317"
        size={0.015}
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.4 }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1]}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <GradientMesh />
          <SubtleParticles />
        </Suspense>
      </Canvas>
    </div>
  );
}
