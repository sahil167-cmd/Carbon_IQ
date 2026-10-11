import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CO2ParticleSystemProps {
  count?: number;
  speed?: number;
  active?: boolean;
  targetRadius?: number;
}

export function CO2ParticleSystem({
  count = 2500,
  speed = 1.0,
  active = false,
  targetRadius = 2.1,
}: CO2ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Initialize random particle positions, velocities, and original outer radius
  const [positions, velocities, initialDistances] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const dists = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Random spherical coordinates at outer shell (radius 12 to 30)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 12 + Math.random() * 18;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      dists[i] = r;

      // Inward velocity unit vector
      vel[i * 3] = -x / r;
      vel[i * 3 + 1] = -y / r;
      vel[i * 3 + 2] = -z / r;
    }

    return [pos, vel, dists];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !active) return;

    const positionAttr = pointsRef.current.geometry.attributes.position;
    const array = positionAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const vx = velocities[idx];
      const vy = velocities[idx + 1];
      const vz = velocities[idx + 2];

      const currentDist = Math.sqrt(
        array[idx] * array[idx] + array[idx + 1] * array[idx + 1] + array[idx + 2] * array[idx + 2]
      );

      // Move particle inward toward Earth atmosphere
      if (currentDist > targetRadius) {
        array[idx] += vx * delta * 4.5 * speed;
        array[idx + 1] += vy * delta * 4.5 * speed;
        array[idx + 2] += vz * delta * 4.5 * speed;
      } else {
        // Respawn particle back at outer boundary
        const r = initialDistances[i];
        array[idx] = -vx * r;
        array[idx + 1] = -vy * r;
        array[idx + 2] = -vz * r;
      }
    }

    positionAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#f97316" // Glowing CO2 orange-red
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
