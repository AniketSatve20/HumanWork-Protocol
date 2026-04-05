import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { DELOS_THEME } from '@/theme';

type NodePosition = [number, number, number];

interface NarrativeNode {
  projectId?: string | number;
  title?: string;
  description?: string;
  projects?: NarrativeNode[];
  milestones?: NarrativeNode[];
  [key: string]: unknown;
}

interface FlattenedNarrativeNode extends NarrativeNode {
  position: NodePosition;
  depth: number;
  isMilestone?: boolean;
}

interface NarrativeFlowData {
  user: NarrativeNode;
}

interface NarrativeFlowTreeProps {
  data: NarrativeFlowData;
  activeProjectId?: string | number | null;
  onNodeClick?: (node: FlattenedNarrativeNode) => void;
}

// Helper: Recursively flatten tree into points with positions and metadata
function flattenTree(
  node: NarrativeNode,
  depth = 0,
  angle = 0,
  parentPos: NodePosition = [0, 0, 0],
  branchLength = 2,
  spread = Math.PI / 3
): FlattenedNarrativeNode[] {
  const points: FlattenedNarrativeNode[] = [];
  const nodePos: NodePosition = [
    parentPos[0] + Math.cos(angle) * branchLength * (1 + depth * 0.2),
    parentPos[1] - depth * 2,
    parentPos[2] + Math.sin(angle) * branchLength * (1 + depth * 0.2),
  ];
  points.push({ ...node, position: nodePos, depth });
  if (node.projects) {
    const n = node.projects.length;
    node.projects.forEach((child: NarrativeNode, i: number) => {
      const childAngle = angle - spread / 2 + (spread * i) / Math.max(1, n - 1);
      points.push(...flattenTree(child, depth + 1, childAngle, nodePos, branchLength * 0.85, spread * 0.8));
    });
  }
  if (node.milestones) {
    const n = node.milestones.length;
    node.milestones.forEach((milestone: NarrativeNode, i: number) => {
      const childAngle = angle - spread / 2 + (spread * i) / Math.max(1, n - 1);
      const milestonePos: NodePosition = [
        nodePos[0] + Math.cos(childAngle) * branchLength * 0.5,
        nodePos[1] - 1,
        nodePos[2] + Math.sin(childAngle) * branchLength * 0.5,
      ];
      points.push({ ...milestone, position: milestonePos, depth: depth + 1, isMilestone: true });
    });
  }
  return points;
}

function NarrativeFlowPoints({ data, onNodeClick, activeProjectId }: NarrativeFlowTreeProps) {
  const [hovered, setHovered] = useState<FlattenedNarrativeNode | null>(null);
  const [bloomNode, setBloomNode] = useState<FlattenedNarrativeNode | null>(null);
  const points = useMemo(() => flattenTree(data.user), [data]);
  const getNodeAtIndex = (index: number | undefined): FlattenedNarrativeNode | null => {
    if (typeof index !== 'number') return null;
    return points[index] ?? null;
  };

  const positions = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      arr[i * 3] = p.position[0];
      arr[i * 3 + 1] = p.position[1];
      arr[i * 3 + 2] = p.position[2];
    });
    return arr;
  }, [points]);
  const colors = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      let color: string = DELOS_THEME.bone;
      if (p.projectId === activeProjectId) color = DELOS_THEME.hostSaffron; // Host Orange
      arr.set(new THREE.Color(color).toArray(), i * 3);
    });
    return arr;
  }, [points, activeProjectId]);

  // Raycast for interactivity
  const ref = useRef<THREE.Group | null>(null);
  useFrame(() => {
    // Optional: add fluid inertia rotation
    const currentGroup = ref.current;
    if (!currentGroup) return;
    currentGroup.rotation.y += 0.0015;
    currentGroup.rotation.x = Math.sin(Date.now() * 0.0001) * 0.05;
  });

  return (
    <group ref={ref}>
      <Points
        positions={positions}
        colors={colors}
        stride={3}
        onPointerOver={e => {
          const node = getNodeAtIndex(e.index);
          setHovered(node);
        }}
        onPointerOut={() => setHovered(null)}
        onClick={e => {
          const node = getNodeAtIndex(e.index);
          if (!node) return;
          setBloomNode(node);
          onNodeClick?.(node);
        }}
      >
        <PointMaterial
          vertexColors
          size={bloomNode ? 0.18 : 0.12}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </Points>
      {hovered && (
        <Html
          position={hovered.position}
          center
          style={{
            pointerEvents: 'none',
            color: DELOS_THEME.hostSaffron,
            fontFamily: 'Bodoni Moda, serif',
            fontWeight: 600,
            fontSize: 18,
            background: 'rgba(26,26,27,0.85)',
            borderRadius: 8,
            padding: 8,
            border: `0.5px solid ${DELOS_THEME.bone}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          {hovered.title || hovered.description}
        </Html>
      )}
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={bloomNode ? 2.5 : 0.7} />
      </EffectComposer>
    </group>
  );
}

export default function NarrativeFlowTree({ data, activeProjectId, onNodeClick }: NarrativeFlowTreeProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 24], fov: 60 }}
      style={{ width: '100vw', height: '100vh', background: DELOS_THEME.obsidian }}
    >
      <ambientLight intensity={0.7} />
      <NarrativeFlowPoints data={data} onNodeClick={onNodeClick} activeProjectId={activeProjectId} />
    </Canvas>
  );
}
