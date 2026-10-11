import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AtmosphereProps {
  radius?: number;
  thickness?: number;
  redTintIntensity?: number; // 0 (blue/healthy) to 1 (intense red/greenhouse)
}

export function Atmosphere({ radius = 2.0, thickness = 0.08, redTintIntensity = 0 }: AtmosphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const customShader = useMemo(() => {
    return {
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 colorHealthy;
        uniform vec3 colorWarning;
        uniform float redTint;
        
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.5);
          vec3 finalColor = mix(colorHealthy, colorWarning, redTint);
          gl_FragColor = vec4(finalColor, intensity * 0.85);
        }
      `,
      uniforms: {
        colorHealthy: { value: new THREE.Color('#38bdf8') }, // Bright Cyan Blue
        colorWarning: { value: new THREE.Color('#f97316') }, // Vibrant Orange Red
        redTint: { value: redTintIntensity },
      },
    };
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.redTint.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.redTint.value,
        redTintIntensity,
        0.05
      );
    }
  });

  return (
    <mesh ref={meshRef} scale={1 + thickness}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        args={[customShader]}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
