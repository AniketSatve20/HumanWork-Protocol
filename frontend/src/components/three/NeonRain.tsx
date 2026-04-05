import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   Westworld — Delos Host Manufacturing Ring System
   ─────────────────────────────────────────────────────────────────────────
   Topographical 3D contour map / circular printing rings inspired by the
   Westworld intro sequence. Click creates a white milk-fluid ripple.
   Drag-to-explore uses precision CAD-style damped orbital controls.
   
   Palette: Aluminum #D1D1D1 · Delos Gold #C9A96E · Obsidian #1A1A1B
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Responsive hook ─────────────────────────────────────────────────── */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

/* ══════════════════════════════════════════════════════════════════════
   GLSL Noise — Simplex 3D
   ══════════════════════════════════════════════════════════════════════ */
const NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

/* ══════════════════════════════════════════════════════════════════════
   Data Types
   ══════════════════════════════════════════════════════════════════════ */
interface NodeData {
  position: THREE.Vector3;
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  ring: number;
  size: number;
  distanceFromCenter: number;
  angle: number;
}

/* ══════════════════════════════════════════════════════════════════════
   Ring Generator — Concentric host-manufacturing rings
   ══════════════════════════════════════════════════════════════════════ */
function generateRingNetwork(nodeCount: number): NodeData[] {
  const nodes: NodeData[] = [];
  const ringCount = 12;

  // Central hub node
  nodes.push({
    position: new THREE.Vector3(0, 0, 0),
    basePosition: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    ring: 0, size: 2.5, distanceFromCenter: 0, angle: 0,
  });

  for (let r = 1; r <= ringCount; r++) {
    const radius = r * 1.8;
    // More nodes on outer rings, fewer on inner — topographical precision
    const pointsOnRing = Math.floor(8 + (r * nodeCount) / (ringCount * 3));
    // Elevation based on noise-modulated topography
    const baseElevation = Math.sin(r * 0.5) * 0.6;

    for (let i = 0; i < pointsOnRing; i++) {
      const angle = (i / pointsOnRing) * Math.PI * 2;
      // Slight radial jitter for organic feel
      const jitterR = radius + (Math.random() - 0.5) * 0.15;
      const jitterAngle = angle + (Math.random() - 0.5) * 0.02;

      const x = jitterR * Math.cos(jitterAngle);
      const z = jitterR * Math.sin(jitterAngle);
      // Topographical height: contour lines with noise displacement
      const y = baseElevation
        + Math.sin(angle * 3 + r) * 0.2
        + Math.cos(angle * 5 - r * 0.7) * 0.15;

      const pos = new THREE.Vector3(x, y, z);
      nodes.push({
        position: pos.clone(),
        basePosition: pos.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        ring: r,
        size: r <= 3 ? 1.0 + Math.random() * 0.4 : 0.4 + Math.random() * 0.5,
        distanceFromCenter: radius,
        angle,
      });
    }
  }

  return nodes;
}

/* ══════════════════════════════════════════════════════════════════════
   Ambient Dust — Sparse floating particles (aluminum white)
   ══════════════════════════════════════════════════════════════════════ */
function AmbientDust() {
  const ref = useRef<any>(null!);
  const count = 3000;

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 30 + Math.random() * 80;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      siz[i] = 0.05 + Math.random() * 0.12;
    }
    return [pos, siz];
  }, []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float twinkle = sin(uTime * 0.8 + position.x * 50.0 + position.z * 30.0) * 0.4 + 0.6;
        vAlpha = twinkle;
        gl_PointSize = size * twinkle * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha * 0.3;
        gl_FragColor = vec4(0.82, 0.82, 0.82, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
    ref.current.rotation.y += 0.00008;
  });

  return (
    <points ref={ref as any} material={material as any}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
    </points>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Ring Nodes — Particles on concentric rings with topographical height
   ══════════════════════════════════════════════════════════════════════ */
function RingNodes({
  nodes,
  pulseUniforms,
  shockwaves,
}: {
  nodes: NodeData[];
  pulseUniforms: React.MutableRefObject<{
    uTime: { value: number };
    uPulsePositions: { value: THREE.Vector3[] };
    uPulseTimes: { value: number[] };
  }>;
  shockwaves: React.MutableRefObject<{ origin: THREE.Vector3; time: number; force: number }[]>;
}) {
  const ref = useRef<any>(null!);
  const posAttr = useRef<THREE.BufferAttribute | null>(null);

  const [geo, mat] = useMemo(() => {
    const positions = new Float32Array(nodes.length * 3);
    const nodeSizes = new Float32Array(nodes.length);
    const ringIndices = new Float32Array(nodes.length);
    const distFromCenter = new Float32Array(nodes.length);
    const nodeAngles = new Float32Array(nodes.length);

    nodes.forEach((node, i) => {
      positions[i * 3] = node.position.x;
      positions[i * 3 + 1] = node.position.y;
      positions[i * 3 + 2] = node.position.z;
      nodeSizes[i] = node.size;
      ringIndices[i] = node.ring;
      distFromCenter[i] = node.distanceFromCenter;
      nodeAngles[i] = node.angle;
    });

    const geometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.Float32BufferAttribute(positions, 3);
    geometry.setAttribute('position', positionAttr);
    geometry.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nodeSizes, 1));
    geometry.setAttribute('ringIndex', new THREE.Float32BufferAttribute(ringIndices, 1));
    geometry.setAttribute('distFromCenter', new THREE.Float32BufferAttribute(distFromCenter, 1));
    geometry.setAttribute('nodeAngle', new THREE.Float32BufferAttribute(nodeAngles, 1));
    posAttr.current = positionAttr;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPulsePositions: { value: [
          new THREE.Vector3(1e3,1e3,1e3),
          new THREE.Vector3(1e3,1e3,1e3),
          new THREE.Vector3(1e3,1e3,1e3),
        ] },
        uPulseTimes: { value: [-1e3, -1e3, -1e3] },
        uPulseSpeed: { value: 12.0 },
      },
      vertexShader: `${NOISE_GLSL}
        attribute float nodeSize;
        attribute float ringIndex;
        attribute float distFromCenter;
        attribute float nodeAngle;

        uniform float uTime;
        uniform vec3 uPulsePositions[3];
        uniform float uPulseTimes[3];
        uniform float uPulseSpeed;

        varying float vRingIndex;
        varying float vPulseIntensity;
        varying float vDistFromCenter;
        varying float vBreathe;

        float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
          if (pulseTime < 0.0) return 0.0;
          float timeSince = uTime - pulseTime;
          if (timeSince < 0.0 || timeSince > 6.0) return 0.0;
          float pulseRadius = timeSince * uPulseSpeed;
          float distToClick = distance(worldPos, pulsePos);
          float thickness = 3.0;
          float proximity = abs(distToClick - pulseRadius);
          return smoothstep(thickness, 0.0, proximity) * smoothstep(6.0, 0.0, timeSince);
        }

        void main() {
          vRingIndex = ringIndex;
          vDistFromCenter = distFromCenter;

          vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;

          float totalPulse = 0.0;
          for (int i = 0; i < 3; i++) {
            totalPulse += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
          }
          vPulseIntensity = min(totalPulse, 1.0);

          // Slow breathing — structural precision
          float breathe = sin(uTime * 0.3 + distFromCenter * 0.12 + nodeAngle) * 0.1 + 0.9;
          vBreathe = breathe;
          float baseSize = nodeSize * breathe;
          float pulseSize = baseSize * (1.0 + vPulseIntensity * 4.0);

          vec3 modPos = position;
          // Subtle noise displacement on outer rings
          if (ringIndex > 4.0) {
            float noise = snoise(position * 0.06 + uTime * 0.04);
            modPos.y += noise * 0.08;
          }

          vec4 mvPos = modelViewMatrix * vec4(modPos, 1.0);
          gl_PointSize = pulseSize * 0.35 * (800.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;

        varying float vRingIndex;
        varying float vPulseIntensity;
        varying float vDistFromCenter;
        varying float vBreathe;

        void main() {
          vec2 center = 2.0 * gl_PointCoord - 1.0;
          float dist = length(center);
          if (dist > 1.0) discard;

          // Soft glow with hard core
          float core    = 1.0 - smoothstep(0.0, 0.3, dist);
          float halo    = 1.0 - smoothstep(0.0, 1.0, dist);
          float glow    = pow(core, 1.5) + halo * 0.2;

          // Base color — aluminum white with subtle gold warmth on inner rings
          vec3 aluminum = vec3(0.82, 0.82, 0.82);
          vec3 gold     = vec3(0.79, 0.66, 0.43);
          float goldMix = smoothstep(6.0, 0.0, vRingIndex) * 0.25;
          vec3 baseColor = mix(aluminum, gold, goldMix);

          vec3 finalColor = baseColor * vBreathe;

          // Milk-white pulse wash
          if (vPulseIntensity > 0.0) {
            vec3 milkWhite = vec3(0.97, 0.96, 0.94);
            finalColor = mix(finalColor, milkWhite, vPulseIntensity * 0.9);
            finalColor *= (1.0 + vPulseIntensity * 1.8);
            glow *= (1.0 + vPulseIntensity * 1.5);
          }

          // Core brightness
          float coreBright = smoothstep(0.35, 0.0, dist);
          finalColor += vec3(1.0, 0.99, 0.96) * coreBright * 0.3;

          float alpha = glow * (0.7 - 0.25 * dist);
          float camDist = length(vec3(0.0) - cameraPosition);
          float distFade = smoothstep(120.0, 12.0, camDist);

          gl_FragColor = vec4(finalColor, alpha * distFade);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return [geometry, material];
  }, [nodes]);

  // Shockwave physics — push particles, spring back (heavy, cinematic)
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;

    const pu = pulseUniforms.current;
    mat.uniforms.uPulsePositions.value = pu.uPulsePositions.value;
    mat.uniforms.uPulseTimes.value = pu.uPulseTimes.value;

    if (posAttr.current) {
      const posArr = posAttr.current.array as Float32Array;
      const dt = Math.min(delta, 0.05);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        for (const sw of shockwaves.current) {
          const timeSince = t - sw.time;
          if (timeSince < 0 || timeSince > 4.0) continue;
          const shockRadius = timeSince * 14;
          const dist = node.position.distanceTo(sw.origin);
          const proximity = Math.abs(dist - shockRadius);
          if (proximity < 4.0) {
            const dir = node.position.clone().sub(sw.origin).normalize();
            // Milk ripple: predominantly vertical displacement
            dir.y *= 3.0;
            const intensity = (1.0 - proximity / 4.0) * Math.max(0, 1.0 - timeSince / 4.0) * sw.force;
            node.velocity.add(dir.multiplyScalar(intensity * dt * 40));
          }
        }

        // Spring back — heavy damping for that slow, viscous feel
        const springForce = node.basePosition.clone().sub(node.position);
        node.velocity.add(springForce.multiplyScalar(1.5 * dt));
        node.velocity.multiplyScalar(1.0 - 2.5 * dt);

        node.position.add(node.velocity.clone().multiplyScalar(dt));

        posArr[i * 3] = node.position.x;
        posArr[i * 3 + 1] = node.position.y;
        posArr[i * 3 + 2] = node.position.z;
      }

      posAttr.current.needsUpdate = true;
    }
  });

  return <points ref={ref as any} geometry={geo as any} material={mat as any} />;
}

/* ══════════════════════════════════════════════════════════════════════
   Ring Lines — Concentric contour lines connecting nodes on same ring
   ══════════════════════════════════════════════════════════════════════ */
function RingLines({
  nodes,
  pulseUniforms,
}: {
  nodes: NodeData[];
  pulseUniforms: React.MutableRefObject<{
    uTime: { value: number };
    uPulsePositions: { value: THREE.Vector3[] };
    uPulseTimes: { value: number[] };
  }>;
}) {
  const ref = useRef<any>(null!);

  const [geo, mat] = useMemo(() => {
    const positions: number[] = [];
    const startPoints: number[] = [];
    const endPoints: number[] = [];
    const ringIds: number[] = [];

    // Group nodes by ring
    const ringMap = new Map<number, NodeData[]>();
    nodes.forEach((n) => {
      if (n.ring === 0) return;
      if (!ringMap.has(n.ring)) ringMap.set(n.ring, []);
      ringMap.get(n.ring)!.push(n);
    });

    // For each ring, connect adjacent nodes (sorted by angle)
    ringMap.forEach((ringNodes, ringIdx) => {
      const sorted = ringNodes.slice().sort((a, b) => a.angle - b.angle);
      const numSeg = 8;

      for (let i = 0; i < sorted.length; i++) {
        const start = sorted[i].basePosition;
        const end = sorted[(i + 1) % sorted.length].basePosition;

        for (let s = 0; s < numSeg; s++) {
          const t = s / (numSeg - 1);
          positions.push(t, 0, 0);
          startPoints.push(start.x, start.y, start.z);
          endPoints.push(end.x, end.y, end.z);
          ringIds.push(ringIdx);
        }
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('startPoint', new THREE.Float32BufferAttribute(startPoints, 3));
    geometry.setAttribute('endPoint', new THREE.Float32BufferAttribute(endPoints, 3));
    geometry.setAttribute('ringId', new THREE.Float32BufferAttribute(ringIds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPulsePositions: { value: [new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3)] },
        uPulseTimes: { value: [-1e3, -1e3, -1e3] },
        uPulseSpeed: { value: 12.0 },
      },
      vertexShader: `
        attribute vec3 startPoint;
        attribute vec3 endPoint;
        attribute float ringId;

        uniform float uTime;
        uniform vec3 uPulsePositions[3];
        uniform float uPulseTimes[3];
        uniform float uPulseSpeed;

        varying float vAlpha;
        varying float vPulseIntensity;
        varying float vRingId;

        float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
          if (pulseTime < 0.0) return 0.0;
          float timeSince = uTime - pulseTime;
          if (timeSince < 0.0 || timeSince > 6.0) return 0.0;
          float pulseRadius = timeSince * uPulseSpeed;
          float distToClick = distance(worldPos, pulsePos);
          float thickness = 4.0;
          float proximity = abs(distToClick - pulseRadius);
          return smoothstep(thickness, 0.0, proximity) * smoothstep(6.0, 0.0, timeSince);
        }

        void main() {
          float t = position.x;
          vec3 worldPos = mix(startPoint, endPoint, t);
          vRingId = ringId;

          float totalPulse = 0.0;
          for (int i = 0; i < 3; i++) {
            totalPulse += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
          }
          vPulseIntensity = min(totalPulse, 1.0);

          // Subtle sinusoidal curvature for the line
          worldPos.y += sin(t * 3.14159) * 0.04;
          // Breathing elevation
          worldPos.y += sin(uTime * 0.2 + ringId * 0.5) * 0.03;

          vAlpha = 0.6 - abs(t - 0.5) * 0.4;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;

        varying float vAlpha;
        varying float vPulseIntensity;
        varying float vRingId;

        void main() {
          // Aluminum base color, gold warmth on inner rings
          vec3 aluminum = vec3(0.82, 0.82, 0.82);
          vec3 gold     = vec3(0.79, 0.66, 0.43);
          float goldMix = smoothstep(8.0, 1.0, vRingId) * 0.2;
          vec3 color = mix(aluminum, gold, goldMix);

          float alpha = vAlpha * 0.25;

          // Milk-white pulse
          if (vPulseIntensity > 0.0) {
            vec3 milkWhite = vec3(0.97, 0.96, 0.94);
            color = mix(color, milkWhite, vPulseIntensity * 0.9);
            alpha = mix(alpha, 0.8, vPulseIntensity);
          }

          // Subtle shimmer
          float shimmer = sin(uTime * 0.4 + vRingId * 1.7) * 0.05 + 0.95;
          color *= shimmer;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return [geometry, material];
  }, [nodes]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;
    const pu = pulseUniforms.current;
    mat.uniforms.uPulsePositions.value = pu.uPulsePositions.value;
    mat.uniforms.uPulseTimes.value = pu.uPulseTimes.value;
  });

  return <lineSegments ref={ref as any} geometry={geo as any} material={mat as any} />;
}

/* ══════════════════════════════════════════════════════════════════════
   Radial Spoke Lines — Connect center to each ring
   ══════════════════════════════════════════════════════════════════════ */
function RadialSpokes({ nodes }: { nodes: NodeData[] }) {
  const ref = useRef<any>(null!);

  const [geo, mat] = useMemo(() => {
    const positions: number[] = [];
    const center = new THREE.Vector3(0, 0, 0);

    // Pick evenly-spaced nodes from ring 1 to draw spokes
    const ring1 = nodes.filter(n => n.ring === 1).sort((a, b) => a.angle - b.angle);
    const outerRing = nodes.filter(n => n.ring === 12).sort((a, b) => a.angle - b.angle);

    // Draw spoke from center through each ring-1 node to the nearest outer node
    ring1.forEach((innerNode) => {
      const nearest = outerRing.reduce((best, n) => {
        const angleDiff = Math.abs(n.angle - innerNode.angle);
        const bestDiff = Math.abs(best.angle - innerNode.angle);
        return angleDiff < bestDiff ? n : best;
      }, outerRing[0]);

      // From center to outer
      positions.push(center.x, center.y, center.z);
      positions.push(nearest.basePosition.x, nearest.basePosition.y, nearest.basePosition.z);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.55, 0.55, 0.55),
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return [geometry, material];
  }, [nodes]);

  useFrame(({ clock }) => {
    // Subtle rotation
    ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.02) * 0.01;
  });

  return <lineSegments ref={ref as any} geometry={geo as any} material={mat as any} />;
}

/* ══════════════════════════════════════════════════════════════════════
   Milk Ripple Rings — White liquid expanding circles on click
   ══════════════════════════════════════════════════════════════════════ */
function MilkRippleRings({
  shockwaves,
}: {
  shockwaves: React.MutableRefObject<{ origin: THREE.Vector3; time: number; force: number }[]>;
}) {
  const ringsRef = useRef<THREE.Group>(null!);
  const ringMeshes = useRef<THREE.Mesh[]>([]);

  // Pre-create ring meshes
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.95, 1.0, 128), []);
  const ringMats = useMemo(() => {
    return Array.from({ length: 3 }, () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBirth: { value: -100 },
          uMaxRadius: { value: 35 },
          uSpeed: { value: 12.0 },
        },
        vertexShader: `
          uniform float uTime;
          uniform float uBirth;
          uniform float uSpeed;
          uniform float uMaxRadius;

          varying float vAlpha;
          varying vec2 vUv;

          void main() {
            vUv = uv;
            float timeSince = uTime - uBirth;
            float radius = timeSince * uSpeed;

            // Scale the ring over time
            vec3 scaled = position * radius;
            vAlpha = smoothstep(uMaxRadius, uMaxRadius * 0.3, radius) * smoothstep(0.0, 2.0, timeSince);

            gl_Position = projectionMatrix * modelViewMatrix * vec4(scaled, 1.0);
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          varying vec2 vUv;

          void main() {
            // Milk-white with a slight pearlescent sheen
            vec3 milkColor = vec3(0.96, 0.95, 0.93);
            // Add slight thickness variation around the ring
            float thickness = 0.6 + 0.4 * sin(vUv.x * 6.28318 * 8.0) * 0.3;
            gl_FragColor = vec4(milkColor, vAlpha * thickness * 0.6);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    shockwaves.current.forEach((sw, i) => {
      if (i >= 3 || !ringMeshes.current[i]) return;
      const mesh = ringMeshes.current[i];
      const mat = ringMats[i];
      mat.uniforms.uTime.value = t;
      mat.uniforms.uBirth.value = sw.time;
      mesh.position.copy(sw.origin);
      // Lay flat on xz plane
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = (t - sw.time) < 6.0;
    });
  });

  return (
    <group ref={ringsRef}>
      {ringMats.map((mat, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) ringMeshes.current[i] = el; }}
          geometry={ringGeo}
          material={mat}
          visible={false}
        />
      ))}
      {/* Second ring set — thinner, slightly delayed */}
      {ringMats.map((_, i) => {
        const innerRingGeo = new THREE.RingGeometry(0.98, 1.0, 128);
        const delayedMat = ringMats[i].clone();
        return (
          <mesh
            key={`inner-${i}`}
            ref={(el) => {
              if (el) {
                // Animate with slight delay
                const update = () => {
                  const t = performance.now() / 1000;
                  const sw = shockwaves.current[i];
                  if (!sw) return;
                  delayedMat.uniforms.uTime.value = t;
                  delayedMat.uniforms.uBirth.value = sw.time + 0.15;
                  delayedMat.uniforms.uSpeed.value = 10.0;
                  el.position.copy(sw.origin);
                  el.rotation.x = -Math.PI / 2;
                  el.visible = (t - sw.time) < 6.5;
                };
                el.onBeforeRender = update;
              }
            }}
            geometry={innerRingGeo}
            material={delayedMat}
            visible={false}
          />
        );
      })}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CAD Interaction Controller
   ─────────────────────────────────────────────────────────────────────
   Drag: Precision orbital rotation with heavy damping (CAD feel)
   Click: Milk ripple + shockwave at intersection point
   ══════════════════════════════════════════════════════════════════════ */
function InteractionController({
  pulseUniforms,
  shockwaves,
}: {
  pulseUniforms: React.MutableRefObject<{
    uTime: { value: number };
    uPulsePositions: { value: THREE.Vector3[] };
    uPulseTimes: { value: number[] };
  }>;
  shockwaves: React.MutableRefObject<{ origin: THREE.Vector3; time: number; force: number }[]>;
}) {
  const { gl, camera, clock, pointer } = useThree();
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0.45, y: 0 }); // slight top-down default
  const currentRotation = useRef({ x: 0.45, y: 0 });
  const pulseIndex = useRef(0);

  // Raycasting plane for click detection
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (e: MouseEvent) => {
      isDragging.current = true;
      hasDragged.current = false;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      velocity.current = { x: 0, y: 0 };
      canvas.style.cursor = 'grabbing';
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasDragged.current = true;
      }

      // CAD sensitivity — precise, measured rotation
      const sensitivity = 0.003;
      velocity.current.x = dx * sensitivity;
      velocity.current.y = dy * sensitivity;

      targetRotation.current.y += dx * sensitivity;
      targetRotation.current.x += dy * sensitivity;
      // Clamp vertical to prevent flipping — architectural constraint
      targetRotation.current.x = Math.max(-0.8, Math.min(1.2, targetRotation.current.x));

      lastPointer.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'default';

      // If it was a click (not a drag), emit milk ripple
      if (!hasDragged.current) {
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const t = clock.getElapsedTime();
          const idx = pulseIndex.current % 3;

          pulseUniforms.current.uPulsePositions.value[idx] = intersection.clone();
          pulseUniforms.current.uPulseTimes.value[idx] = t;

          shockwaves.current.push({
            origin: intersection.clone(),
            time: t,
            force: 1.2,
          });

          // Cleanup old shockwaves
          shockwaves.current = shockwaves.current.filter(s => t - s.time < 6.0);

          pulseIndex.current++;
        }
      }
    };

    // Touch support
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      isDragging.current = true;
      hasDragged.current = false;
      lastPointer.current = { x: touch.clientX, y: touch.clientY };
      velocity.current = { x: 0, y: 0 };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - lastPointer.current.x;
      const dy = touch.clientY - lastPointer.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDragged.current = true;
      const sensitivity = 0.004;
      velocity.current.x = dx * sensitivity;
      velocity.current.y = dy * sensitivity;
      targetRotation.current.y += dx * sensitivity;
      targetRotation.current.x += dy * sensitivity;
      targetRotation.current.x = Math.max(-0.8, Math.min(1.2, targetRotation.current.x));
      lastPointer.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = () => {
      if (!hasDragged.current) {
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const t = clock.getElapsedTime();
          const idx = pulseIndex.current % 3;
          pulseUniforms.current.uPulsePositions.value[idx] = intersection.clone();
          pulseUniforms.current.uPulseTimes.value[idx] = t;
          shockwaves.current.push({ origin: intersection.clone(), time: t, force: 1.0 });
          shockwaves.current = shockwaves.current.filter(s => t - s.time < 6.0);
          pulseIndex.current++;
        }
      }
      isDragging.current = false;
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [camera, gl, clock, pointer, raycaster, plane, intersection, pulseUniforms, shockwaves]);

  // Apply CAD orbital inertia
  useFrame(({ scene }) => {
    pulseUniforms.current.uTime.value = clock.getElapsedTime();

    // Heavy inertia decay when not dragging — architectural mass
    if (!isDragging.current) {
      targetRotation.current.y += velocity.current.x;
      targetRotation.current.x += velocity.current.y;
      targetRotation.current.x = Math.max(-0.8, Math.min(1.2, targetRotation.current.x));
      velocity.current.x *= 0.975; // slow decay = weighty, precise
      velocity.current.y *= 0.975;
    }

    // Smooth interpolation — CAD-grade smoothing (0.03 = heavy, deliberate)
    currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.03;
    currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.03;

    scene.rotation.x = currentRotation.current.x;
    scene.rotation.y = currentRotation.current.y;
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   Camera Controller — Slow architectural drift + subtle parallax
   ══════════════════════════════════════════════════════════════════════ */
function CameraController() {
  const { camera } = useThree();
  const angleRef = useRef(0);

  useFrame(({ pointer }) => {
    // Very slow orbital drift
    angleRef.current += 0.0003;
    const radius = 32;
    const baseX = Math.sin(angleRef.current) * radius * 0.05;
    const baseZ = radius;

    // Subtle mouse parallax — architectural precision (heavy lerp)
    camera.position.x += (baseX + pointer.x * 1.5 - camera.position.x) * 0.008;
    camera.position.y += (14 + pointer.y * 1.0 - camera.position.y) * 0.008;
    camera.position.z += (baseZ - camera.position.z) * 0.008;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   Grid Floor — Subtle structural reference plane
   ══════════════════════════════════════════════════════════════════════ */
function StructuralGrid() {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={ref} position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 60, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          varying vec3 vWorldPos;
          uniform float uTime;

          void main() {
            // Grid lines
            vec2 grid = abs(fract(vWorldPos.xz * 0.25) - 0.5);
            float line = min(grid.x, grid.y);
            float gridAlpha = 1.0 - smoothstep(0.0, 0.02, line);

            // Fade at edges
            float dist = length(vWorldPos.xz) / 30.0;
            float edgeFade = 1.0 - smoothstep(0.5, 1.0, dist);

            // Subtle breathing
            float breathe = sin(uTime * 0.15) * 0.01 + 0.99;

            vec3 color = vec3(0.55, 0.55, 0.55);
            float alpha = gridAlpha * edgeFade * 0.04 * breathe;

            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ═══ Main Export ═══
   ══════════════════════════════════════════════════════════════════════ */
interface NeonRainProps {
  scrollProgress?: number;
  particleDensity?: number;
}

export default function NeonRain(_props: NeonRainProps) {
  const isMobile = useIsMobile();

  const nodeCount = isMobile ? 80 : 200;
  const nodes = useMemo(() => generateRingNetwork(nodeCount), [nodeCount]);

  const pulseUniforms = useRef({
    uTime: { value: 0 },
    uPulsePositions: { value: [
      new THREE.Vector3(1e3, 1e3, 1e3),
      new THREE.Vector3(1e3, 1e3, 1e3),
      new THREE.Vector3(1e3, 1e3, 1e3),
    ]},
    uPulseTimes: { value: [-1e3, -1e3, -1e3] },
  });

  const shockwaves = useRef<{ origin: THREE.Vector3; time: number; force: number }[]>([]);

  const dpr: [number, number] = isMobile ? [1, 1] : [1, Math.min(window.devicePixelRatio, 2)];

  return (
    <Canvas
      camera={{ position: [0, 14, 32], fov: 55 }}
      dpr={dpr}
      gl={{
        antialias: !isMobile,
        alpha: true,
        powerPreference: isMobile ? 'low-power' : 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
      }}
      style={{ position: 'absolute', inset: 0, background: '#1A1A1B', cursor: 'default' }}
    >
      <fog attach="fog" args={['#1A1A1B', 35, 100]} />

      <AmbientDust />
      <StructuralGrid />
      <RingNodes nodes={nodes} pulseUniforms={pulseUniforms} shockwaves={shockwaves} />
      <RingLines nodes={nodes} pulseUniforms={pulseUniforms} />
      <RadialSpokes nodes={nodes} />
      <MilkRippleRings shockwaves={shockwaves} />
      <InteractionController pulseUniforms={pulseUniforms} shockwaves={shockwaves} />
      <CameraController />

      <EffectComposer>
        <Bloom
          intensity={isMobile ? 0.6 : 1.2}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.8}
        />
      </EffectComposer>
    </Canvas>
  );
}
