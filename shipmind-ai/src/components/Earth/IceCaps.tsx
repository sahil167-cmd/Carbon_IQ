import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface IceCapsProps {
  earthRadius?: number;
  meltFactor?: number; // 0 (full ice) to 1 (melted ice)
}

export function IceCaps({ earthRadius = 2.0, meltFactor = 0 }: IceCapsProps) {
  const northCapRef = useRef<THREE.Mesh>(null);
  const southCapRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const targetScale = Math.max(0.05, 1 - meltFactor * 0.85);
    if (northCapRef.current) {
      northCapRef.current.scale.set(targetScale, targetScale, targetScale);
    }
    if (southCapRef.current) {
      southCapRef.current.scale.set(targetScale, targetScale, targetScale);
    }
  });

  return (
    <group>
      {/* North Pole Ice Cap */}
      <mesh ref={northCapRef} position={[0, earthRadius * 0.88, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[earthRadius * 0.45, 32]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* South Pole Ice Cap */}
      <mesh ref={southCapRef} position={[0, -earthRadius * 0.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[earthRadius * 0.45, 32]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
