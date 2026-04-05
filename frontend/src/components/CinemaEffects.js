// CinemaEffects.js — Delos Cinematic Post-Processing
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function CinemaEffects({ bloomSelector }) {
  const { gl } = useThree();
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.0;

  return (
    <EffectComposer>
      {/* Selective Bloom: Only Host Saffron (#FA831B) and 'Active' nodes */}
      <Bloom
        intensity={1.5}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.025}
        blendFunction={BlendFunction.ADD}
        mipmapBlur
        // Optionally, use bloomSelector for selective bloom masking
      />
      <Vignette eskil={false} offset={0.3} darkness={0.5} />
      <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
      <ChromaticAberration offset={[0.0005, 0.0005]} />
    </EffectComposer>
  );
}
