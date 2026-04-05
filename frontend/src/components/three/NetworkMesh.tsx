import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Interconnected node network — blockchain topology ────────────

const AMBER   = new THREE.Color('#e8a317');
const ACCENT = new THREE.Color('#0abdc6');

interface NodeData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  phase: number;
}

function Nodes({ count = 18 }: { count?: number }) {
  const meshRef  = useRef<THREE.InstancedMesh>(null!) as any;
  const linesRef = useRef<THREE.LineSegments>(null!) as any;
  const dummy    = useMemo(() => new THREE.Object3D(), []);

  const nodes = useMemo<NodeData[]>(() => {
    return Array.from({ length: count }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.001,
      ),
      color: Math.random() > 0.3 ? AMBER.clone() : ACCENT.clone(),
      size: 0.03 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  // Pre-allocate line buffer (max edges = count*(count-1)/2, but cap)
  const maxEdges = count * 3;
  const linePositions = useMemo(() => new Float32Array(maxEdges * 6), [maxEdges]);
  const lineColors    = useMemo(() => new Float32Array(maxEdges * 6), [maxEdges]);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    g.setAttribute('color',    new THREE.BufferAttribute(lineColors, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [linePositions, lineColors]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const CONNECTION_DIST = 1.8;

    // Move nodes
    for (let i = 0; i < count; i++) {
      const n = nodes[i];
      n.pos.add(n.vel);
      // Float
      n.pos.y += Math.sin(t * 0.5 + n.phase) * 0.0005;
      // Bounce at boundaries
      if (Math.abs(n.pos.x) > 2.5) n.vel.x *= -1;
      if (Math.abs(n.pos.y) > 1.5) n.vel.y *= -1;
      if (Math.abs(n.pos.z) > 1.5) n.vel.z *= -1;

      // Pulse size
      const scale = n.size * (1 + Math.sin(t * 2 + n.phase) * 0.2);
      dummy.position.copy(n.pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Build edges
    let idx = 0;
    for (let i = 0; i < count && idx < maxEdges; i++) {
      for (let j = i + 1; j < count && idx < maxEdges; j++) {
        const d = nodes[i].pos.distanceTo(nodes[j].pos);
        if (d < CONNECTION_DIST) {
          const alpha = 1 - d / CONNECTION_DIST;
          const ci = idx * 6;
          linePositions[ci]     = nodes[i].pos.x;
          linePositions[ci + 1] = nodes[i].pos.y;
          linePositions[ci + 2] = nodes[i].pos.z;
          linePositions[ci + 3] = nodes[j].pos.x;
          linePositions[ci + 4] = nodes[j].pos.y;
          linePositions[ci + 5] = nodes[j].pos.z;
          // Fade color by distance
          const c = AMBER.clone().lerp(ACCENT, 0.5);
          lineColors[ci]     = c.r * alpha;
          lineColors[ci + 1] = c.g * alpha;
          lineColors[ci + 2] = c.b * alpha;
          lineColors[ci + 3] = c.r * alpha;
          lineColors[ci + 4] = c.g * alpha;
          lineColors[ci + 5] = c.b * alpha;
          idx++;
        }
      }
    }
    lineGeo.setDrawRange(0, idx * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#e8a317" transparent opacity={0.7} />
      </instancedMesh>
      <lineSegments ref={linesRef} geometry={lineGeo as any}>
        <lineBasicMaterial vertexColors transparent opacity={0.25} depthWrite={false} />
      </lineSegments>
    </>
  );
}

function CameraRig() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x += (pointer.x * 0.3 - camera.position.x) * 0.01;
    camera.position.y += (pointer.y * 0.15 + 0.2 - camera.position.y) * 0.01;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function NetworkMesh() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }}>
      <Canvas
        camera={{ position: [0, 0.2, 4], fov: 45 }}
        dpr={[1, 1]}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Nodes count={20} />
          <CameraRig />
        </Suspense>
      </Canvas>
    </div>
  );
}
