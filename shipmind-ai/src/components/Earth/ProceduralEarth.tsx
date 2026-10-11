import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Atmosphere } from './Atmosphere';
import { IceCaps } from './IceCaps';

interface ProceduralEarthProps {
  radius?: number;
  redTintIntensity?: number;
  forestDamageLevel?: number; // 0 (healthy green) to 1 (burned charcoal)
  iceMeltRatio?: number;
  rotationSpeed?: number;
}

export function ProceduralEarth({
  radius = 2.0,
  redTintIntensity = 0,
  forestDamageLevel = 0,
  iceMeltRatio = 0,
  rotationSpeed = 0.1,
}: ProceduralEarthProps) {
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const cloudMeshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Procedural Noise Earth Shader Material
  const earthShader = useMemo(() => {
    return {
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;

        uniform float damageLevel;
        uniform float redTint;

        // Simplex / Perlin noise generator
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i  = floor(v + dot(v, C.yyy));
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

          vec4 j = p - 49.0 * floor(p * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);

          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);

          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vec3 pos = normalize(vPosition) * 2.5;
          float elevation = snoise(pos);

          // Deep ocean vs continent land threshold
          vec3 oceanColor = vec3(0.03, 0.25, 0.45);
          vec3 healthyLandColor = vec3(0.08, 0.48, 0.22);
          vec3 dryLandColor = vec3(0.52, 0.35, 0.12);
          vec3 burnedLandColor = vec3(0.12, 0.10, 0.09);

          vec3 landColor = mix(healthyLandColor, dryLandColor, clamp(damageLevel * 1.5, 0.0, 1.0));
          landColor = mix(landColor, burnedLandColor, clamp((damageLevel - 0.4) * 1.6, 0.0, 1.0));

          vec3 baseColor = elevation > 0.05 ? landColor : oceanColor;

          // Apply global heat red tint overlay
          vec3 tintedColor = mix(baseColor, vec3(0.75, 0.15, 0.05), redTint * 0.45);

          // Directional Lighting calculation
          vec3 lightDir = normalize(vec3(1.0, 0.8, 1.2));
          float diff = max(dot(vNormal, lightDir), 0.15);

          gl_FragColor = vec4(tintedColor * diff, 1.0);
        }
      `,
      uniforms: {
        damageLevel: { value: forestDamageLevel },
        redTint: { value: redTintIntensity },
      },
    };
  }, []);

  useFrame((_, delta) => {
    if (earthMeshRef.current) {
      earthMeshRef.current.rotation.y += delta * rotationSpeed;
    }
    if (cloudMeshRef.current) {
      cloudMeshRef.current.rotation.y += delta * (rotationSpeed * 1.35);
    }
    if (materialRef.current) {
      materialRef.current.uniforms.damageLevel.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.damageLevel.value,
        forestDamageLevel,
        0.05
      );
      materialRef.current.uniforms.redTint.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.redTint.value,
        redTintIntensity,
        0.05
      );
    }
  });

  return (
    <group>
      {/* 3D Earth Globe Mesh */}
      <mesh ref={earthMeshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial ref={materialRef} args={[earthShader]} />
      </mesh>

      {/* Dynamic Polar Ice Caps */}
      <IceCaps earthRadius={radius} meltFactor={iceMeltRatio} />

      {/* Cloud Layer Mesh */}
      <mesh ref={cloudMeshRef} scale={1.015}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Atmosphere Glow Outer Shell */}
      <Atmosphere radius={radius} thickness={0.07} redTintIntensity={redTintIntensity} />
    </group>
  );
}
