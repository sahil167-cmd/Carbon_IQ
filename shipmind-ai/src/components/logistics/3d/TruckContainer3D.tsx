import { useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import type { TruckDimensions } from '../../../utils/coordinate-transform';

interface TruckContainer3DProps {
  truck: TruckDimensions;
}

export default function TruckContainer3D({ truck }: TruckContainer3DProps) {
  const { lengthM, widthM, heightM } = truck;

  // Center of container
  const centerX = lengthM / 2;
  const centerY = widthM / 2;
  const centerZ = heightM / 2;

  // Create floor grid
  const gridHelper = useMemo(() => {
    const size = Math.max(lengthM, widthM) * 1.2;
    const divisions = Math.max(10, Math.round(size * 2));
    const grid = new THREE.GridHelper(size, divisions, 0x10b981, 0x334155);
    // Rotate grid from X-Z plane to X-Y plane (since Z is up)
    grid.rotation.x = Math.PI / 2;
    grid.position.set(centerX, centerY, 0.001);
    return grid;
  }, [lengthM, widthM, centerX, centerY]);

  return (
    <group>
      {/* Floor Grid */}
      <primitive object={gridHelper} />

      {/* Solid Truck Bed Surface (Z = 0) */}
      <mesh position={[centerX, centerY, -0.01]} receiveShadow>
        <planeGeometry args={[lengthM, widthM]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.8}
          metalness={0.2}
        />
        <Edges color="#10B981" threshold={15} />
      </mesh>

      {/* Transparent Volumetric Shell */}
      <mesh position={[centerX, centerY, centerZ]}>
        <boxGeometry args={[lengthM, widthM, heightM]} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.08}
          roughness={0.1}
          metalness={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        {/* Exterior Container Wireframe Edges */}
        <Edges color="#0F6B3A" threshold={15} />
      </mesh>

      {/* Front Cab / Bulkhead Marker (at X = 0) */}
      <group position={[0, centerY, centerZ]}>
        <mesh>
          <planeGeometry args={[widthM, heightM]} />
          {/* Rotate plane so normal points along +X */}
          <meshBasicMaterial
            color="#1e293b"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
          <Edges color="#475569" threshold={15} />
        </mesh>
      </group>

      {/* Rear Loading Door Marker (at X = lengthM) */}
      <group position={[lengthM, centerY, centerZ]}>
        <mesh>
          <planeGeometry args={[widthM, heightM]} />
          <meshBasicMaterial
            color="#047857"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
          <Edges color="#10b981" threshold={15} />
        </mesh>
      </group>
    </group>
  );
}
