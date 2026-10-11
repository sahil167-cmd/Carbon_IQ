import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import type { TruckDimensions } from '../../../utils/coordinate-transform';

interface RealisticTruckModel3DProps {
  truck: TruckDimensions;
  isRealisticMode?: boolean;
}

export const RealisticTruckModel3D: React.FC<RealisticTruckModel3DProps> = ({
  truck,
  isRealisticMode = true,
}) => {
  const { lengthM, widthM, heightM } = truck;

  const centerX = lengthM / 2;
  const centerY = widthM / 2;
  const centerZ = heightM / 2;

  // Classify Indian Truck category based on length and vehicle name
  const truckName = (truck.name || '').toLowerCase();
  const isMiniTruck = lengthM < 3.8 || truckName.includes('dost') || truckName.includes('ace') || truckName.includes('bolero');
  const isMediumTruck = !isMiniTruck && (lengthM < 8.0 || truckName.includes('407') || truckName.includes('eicher') || truckName.includes('14 ft') || truckName.includes('17 ft') || truckName.includes('20 ft'));
  const isHeavyTruck = !isMiniTruck && !isMediumTruck;

  // Proportions adapted strictly to authentic Indian commercial vehicle classes
  const cabLength = isMiniTruck
    ? Math.max(0.95, Math.min(1.25, lengthM * 0.38))
    : isMediumTruck
    ? Math.max(1.4, Math.min(1.8, lengthM * 0.28))
    : Math.min(2.4, Math.max(1.8, lengthM * 0.22));

  const cabWidth = widthM * (isMiniTruck ? 0.94 : 0.96);
  const cabHeight = isMiniTruck
    ? Math.max(heightM * 0.95, 1.45)
    : isMediumTruck
    ? Math.max(heightM * 0.95, 1.95)
    : Math.max(heightM * 0.96, 2.45);

  // Wheel proportions: Authentic upright vertical truck wheels
  const wheelRadius = isMiniTruck ? 0.28 : isMediumTruck ? 0.36 : 0.44;
  const wheelThickness = isMiniTruck ? 0.18 : isMediumTruck ? 0.22 : 0.26;
  const axleZ = -wheelRadius;
  const groundZ = -wheelRadius * 2;
  const chassisZ = isMiniTruck ? -0.18 : isMediumTruck ? -0.26 : -0.32;

  // Ground road grid
  const gridHelper = useMemo(() => {
    const size = Math.max(lengthM + cabLength + 3, widthM + 4) * 1.25;
    const divisions = Math.max(16, Math.round(size * 1.6));
    const grid = new THREE.GridHelper(size, divisions, 0x10b981, 0x1e293b);
    grid.rotation.x = Math.PI / 2; // Rotate grid from X-Z to X-Y plane
    grid.position.set(centerX - cabLength / 3, centerY, groundZ + 0.002);
    return grid;
  }, [lengthM, widthM, centerX, centerY, cabLength, groundZ]);

  const isMultiAxle = isHeavyTruck && lengthM >= 8.5; // e.g. 32ft MXL, 40ft container

  // Axle X positions adapted for vehicle chassis wheelbase
  const frontAxleX = -cabLength * (isMiniTruck ? 0.52 : 0.60);
  const rearAxle1X = lengthM - (isMiniTruck ? 0.55 : isMediumTruck ? 0.85 : 1.1);
  const rearAxle2X = lengthM - 2.1;

  return (
    <group>
      {/* ── Ground Road Grid ── */}
      <primitive object={gridHelper} />

      {/* ── Road Asphalt Strip under Truck ── */}
      <mesh position={[centerX - cabLength / 3, centerY, groundZ - 0.01]} receiveShadow>
        <planeGeometry args={[lengthM + cabLength + 4, widthM + 2.5]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* ── Solid Truck Bed Surface (Z = 0) ── */}
      <mesh position={[centerX, centerY, -0.01]} receiveShadow>
        <planeGeometry args={[lengthM, widthM]} />
        <meshStandardMaterial
          color={isRealisticMode ? '#1e293b' : '#0f172a'}
          roughness={0.8}
          metalness={0.2}
        />
        <Edges color="#10B981" threshold={15} />
      </mesh>

      {/* ── Realistic Truck Body ── */}
      {isRealisticMode ? (
        <group>
          {/* Front Bulkhead Wall (Between Cab & Cargo at X = 0) */}
          <mesh position={[0, centerY, centerZ]}>
            <boxGeometry args={[0.08, widthM, heightM]} />
            <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.6} />
          </mesh>

          {/* Left Semi-Transparent Cutaway Wall (at Y = widthM) */}
          <mesh position={[centerX, widthM, centerZ]}>
            <boxGeometry args={[lengthM, 0.04, heightM]} />
            <meshStandardMaterial
              color="#38bdf8"
              transparent
              opacity={0.12}
              roughness={0.2}
              metalness={0.7}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
            <Edges color="#0284c7" threshold={15} />
          </mesh>

          {/* Right Semi-Transparent Cutaway Wall (at Y = 0) */}
          <mesh position={[centerX, 0, centerZ]}>
            <boxGeometry args={[lengthM, 0.04, heightM]} />
            <meshStandardMaterial
              color="#38bdf8"
              transparent
              opacity={0.12}
              roughness={0.2}
              metalness={0.7}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
            <Edges color="#0284c7" threshold={15} />
          </mesh>

          {/* Roof Frame & Corner Posts */}
          <group position={[centerX, centerY, heightM]}>
            {/* Translucent Glass Roof */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[lengthM, widthM]} />
              <meshStandardMaterial
                color="#0284c7"
                transparent
                opacity={0.08}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {/* Structural Roof Perimeter Beams */}
            <mesh position={[0, widthM / 2, 0.02]}>
              <boxGeometry args={[lengthM, 0.06, 0.05]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, -widthM / 2, 0.02]}>
              <boxGeometry args={[lengthM, 0.06, 0.05]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>

          {/* Rear Swing Doors (Wide Open at 115° to reveal interior cargo load) */}
          <group position={[lengthM, 0, centerZ]}>
            {/* Right Door (Hinged at Y = 0) */}
            <group rotation={[0, 0, -Math.PI * 0.65]}>
              <mesh position={[0, widthM * 0.24, 0]}>
                <boxGeometry args={[0.06, widthM * 0.48, heightM * 0.98]} />
                <meshStandardMaterial color="#0f766e" metalness={0.5} roughness={0.4} />
                <Edges color="#14b8a6" threshold={15} />
              </mesh>
              {/* Chrome Vertical Locking Bars */}
              <mesh position={[0.04, widthM * 0.24, 0]}>
                <cylinderGeometry args={[0.016, 0.016, heightM * 0.95, 12]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
              </mesh>
            </group>
          </group>

          <group position={[lengthM, widthM, centerZ]}>
            {/* Left Door (Hinged at Y = widthM) */}
            <group rotation={[0, 0, Math.PI * 0.65]}>
              <mesh position={[0, -widthM * 0.24, 0]}>
                <boxGeometry args={[0.06, widthM * 0.48, heightM * 0.98]} />
                <meshStandardMaterial color="#0f766e" metalness={0.5} roughness={0.4} />
                <Edges color="#14b8a6" threshold={15} />
              </mesh>
              {/* Chrome Vertical Locking Bars */}
              <mesh position={[0.04, -widthM * 0.24, 0]}>
                <cylinderGeometry args={[0.016, 0.016, heightM * 0.95, 12]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
              </mesh>
            </group>
          </group>

          {/* ── Front Truck Driver Cabin (Indian Commercial Truck Cab) ── */}
          <group position={[-cabLength / 2, centerY, cabHeight / 2 - 0.05]}>
            {/* Main Aerodynamic Cab Shell */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[cabLength, cabWidth, cabHeight]} />
              <meshStandardMaterial
                color="#0f766e" // Emerald Forest Green Modern Fleet
                roughness={0.25}
                metalness={0.45}
              />
              <Edges color="#042f2e" threshold={15} />
            </mesh>

            {/* Sloped Windshield (Deep Gloss Black Glass at front -X) */}
            <mesh position={[-cabLength / 2 - 0.02, 0, cabHeight * 0.16]} rotation={[0, -0.06, 0]}>
              <planeGeometry args={[cabWidth * 0.88, cabHeight * 0.42]} />
              <meshStandardMaterial
                color="#020617"
                roughness={0.1}
                metalness={0.95}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Aerodynamic Roof Wind Deflector / Spoiler (Heavy) or Cab Headboard (Mini/Medium) */}
            {isHeavyTruck ? (
              <mesh position={[cabLength * 0.08, 0, cabHeight / 2 + 0.18]}>
                <boxGeometry args={[cabLength * 0.72, cabWidth * 0.88, 0.35]} />
                <meshStandardMaterial color="#115e59" roughness={0.3} metalness={0.4} />
              </mesh>
            ) : isMiniTruck ? (
              /* Mini pickup cab rear protection rack */
              <group position={[cabLength * 0.46, 0, cabHeight / 2 + 0.06]}>
                <mesh>
                  <boxGeometry args={[0.04, cabWidth * 0.9, 0.12]} />
                  <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.8} />
                </mesh>
              </group>
            ) : (
              /* Medium rigid truck curved wind visor */
              <mesh position={[cabLength * 0.05, 0, cabHeight / 2 + 0.12]}>
                <boxGeometry args={[cabLength * 0.6, cabWidth * 0.85, 0.2]} />
                <meshStandardMaterial color="#0f766e" roughness={0.35} metalness={0.5} />
              </mesh>
            )}

            {/* Front Radiator Grille (Horizontal Black & Chrome Slats) */}
            <mesh position={[-cabLength / 2 - 0.02, 0, -cabHeight * 0.22]}>
              <planeGeometry args={[cabWidth * 0.78, cabHeight * 0.32]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.8} />
            </mesh>

            {/* High-Intensity Headlights with LED Glow */}
            <mesh position={[-cabLength / 2 - 0.03, -cabWidth * 0.34, -cabHeight * 0.24]}>
              <boxGeometry args={[0.02, cabWidth * 0.18, 0.14]} />
              <meshStandardMaterial color="#ffffff" emissive="#fef08a" emissiveIntensity={1.0} />
            </mesh>
            <mesh position={[-cabLength / 2 - 0.03, cabWidth * 0.34, -cabHeight * 0.24]}>
              <boxGeometry args={[0.02, cabWidth * 0.18, 0.14]} />
              <meshStandardMaterial color="#ffffff" emissive="#fef08a" emissiveIntensity={1.0} />
            </mesh>

            {/* Heavy Front Commercial Steel Bumper */}
            <mesh position={[-cabLength / 2 - 0.08, 0, -cabHeight * 0.42]}>
              <boxGeometry args={[0.16, cabWidth * 1.04, 0.26]} />
              <meshStandardMaterial color="#090d16" roughness={0.85} metalness={0.4} />
            </mesh>

            {/* Side Mirrors on Extended Arms */}
            <group position={[-cabLength * 0.28, -cabWidth / 2 - 0.14, cabHeight * 0.16]}>
              <mesh>
                <boxGeometry args={[0.08, 0.04, 0.26]} />
                <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
              </mesh>
            </group>
            <group position={[-cabLength * 0.28, cabWidth / 2 + 0.14, cabHeight * 0.16]}>
              <mesh>
                <boxGeometry args={[0.08, 0.04, 0.26]} />
                <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
              </mesh>
            </group>
          </group>

          {/* ── Steel Chassis Rails & Undercarriage ── */}
          <group position={[centerX - cabLength / 3, centerY, chassisZ]}>
            {/* Left Rail */}
            <mesh position={[0, widthM * 0.28, 0]}>
              <boxGeometry args={[lengthM + cabLength * 0.85, 0.1, 0.22]} />
              <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.3} />
            </mesh>
            {/* Right Rail */}
            <mesh position={[0, -widthM * 0.28, 0]}>
              <boxGeometry args={[lengthM + cabLength * 0.85, 0.1, 0.22]} />
              <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.3} />
            </mesh>

            {/* Cylindrical Diesel Fuel Tank with Chrome Mounting Straps */}
            <mesh position={[-0.1, -widthM * 0.44, -0.06]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[isMiniTruck ? 0.18 : 0.28, isMiniTruck ? 0.18 : 0.28, isMiniTruck ? 0.8 : 1.4, 18]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
            </mesh>

            {/* Battery / Air Tank Box on opposite side */}
            <mesh position={[-0.1, widthM * 0.44, -0.06]}>
              <boxGeometry args={[isMiniTruck ? 0.6 : 1.2, 0.38, 0.38]} />
              <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
            </mesh>
          </group>

          {/* ── Upright Vertical Wheels (Axle points along Y, rolling along X-Z) ── */}
          {/* Front Steer Axle (Single tire per side) */}
          <VerticalWheelAssembly
            position={[frontAxleX, -wheelThickness / 2, axleZ]}
            radius={wheelRadius}
            thickness={wheelThickness}
            isDualTire={false}
          />
          <VerticalWheelAssembly
            position={[frontAxleX, widthM + wheelThickness / 2, axleZ]}
            radius={wheelRadius}
            thickness={wheelThickness}
            isDualTire={false}
          />

          {/* Rear Drive Axle 1 (Single tire for Mini, Dual commercial tires for Medium/Heavy) */}
          <VerticalWheelAssembly
            position={[rearAxle1X, isMiniTruck ? -wheelThickness / 2 : -wheelThickness * 0.8, axleZ]}
            radius={wheelRadius}
            thickness={wheelThickness}
            isDualTire={!isMiniTruck}
          />
          <VerticalWheelAssembly
            position={[rearAxle1X, isMiniTruck ? widthM + wheelThickness / 2 : widthM + wheelThickness * 0.8, axleZ]}
            radius={wheelRadius}
            thickness={wheelThickness}
            isDualTire={!isMiniTruck}
          />

          {/* Rear Drive Axle 2 (for heavy multi-axle 32ft MXL / 40ft only) */}
          {isMultiAxle && (
            <>
              <VerticalWheelAssembly
                position={[rearAxle2X, -wheelThickness * 0.8, axleZ]}
                radius={wheelRadius}
                thickness={wheelThickness}
                isDualTire={true}
              />
              <VerticalWheelAssembly
                position={[rearAxle2X, widthM + wheelThickness * 0.8, axleZ]}
                radius={wheelRadius}
                thickness={wheelThickness}
                isDualTire={true}
              />
            </>
          )}
        </group>
      ) : (
        /* ── Classic X-Ray Wireframe Hold Mode ── */
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
          <Edges color="#0F6B3A" threshold={15} />
        </mesh>
      )}
    </group>
  );
};

// ── Realistic Vertical Truck Wheel Subcomponent ──
// CylinderGeometry default height is along Y. With scene camera.up = [0,0,1]:
// An unrotated cylinder has its axle along Y and circular face in X-Z plane!
// This guarantees it stands upright vertically on the road!
function VerticalWheelAssembly({
  position,
  radius,
  thickness,
  isDualTire = false,
}: {
  position: [number, number, number];
  radius: number;
  thickness: number;
  isDualTire?: boolean;
}) {
  const tireCount = isDualTire ? 2 : 1;
  const tireSpacing = thickness * 1.15;

  return (
    <group position={position}>
      {Array.from({ length: tireCount }).map((_, idx) => {
        const yOffset = isDualTire ? (idx === 0 ? -tireSpacing / 2 : tireSpacing / 2) : 0;

        return (
          <group key={idx} position={[0, yOffset, 0]}>
            {/* 1. Heavy Rubber Tread (Vertical upright cylinder along Y) */}
            <mesh castShadow receiveShadow>
              {/* NO ROTATION: height along Y means circular tread profile is vertical in X-Z! */}
              <cylinderGeometry args={[radius, radius, thickness, 32]} />
              <meshStandardMaterial
                color="#0a0e17" // Deep vulcanized tire black
                roughness={0.92}
                metalness={0.08}
              />
            </mesh>

            {/* 2. Recessed Steel Wheel Rim */}
            <mesh>
              <cylinderGeometry args={[radius * 0.64, radius * 0.64, thickness * 1.04, 24]} />
              <meshStandardMaterial
                color="#cbd5e1" // Heavy silver steel rim
                roughness={0.25}
                metalness={0.88}
              />
            </mesh>

            {/* 3. Deep Dish Inner Ring Rim Lip */}
            <mesh>
              <cylinderGeometry args={[radius * 0.48, radius * 0.48, thickness * 1.08, 20]} />
              <meshStandardMaterial
                color="#334155"
                roughness={0.4}
                metalness={0.7}
              />
            </mesh>

            {/* 4. Central Heavy Axle Hubcap / Spindle with Emerald / Chrome Accent */}
            <mesh>
              <cylinderGeometry args={[radius * 0.22, radius * 0.22, thickness * 1.14, 16]} />
              <meshStandardMaterial
                color="#0f766e"
                roughness={0.3}
                metalness={0.85}
              />
            </mesh>
          </group>
        );
      })}

      {/* Heavy Mudguard / Fender Arch Above Wheels */}
      <mesh position={[0, 0, radius + 0.08]}>
        <boxGeometry args={[radius * 2.3, isDualTire ? thickness * 2.5 : thickness * 1.4, 0.06]} />
        <meshStandardMaterial color="#090d16" roughness={0.8} metalness={0.3} />
      </mesh>
    </group>
  );
}

export default RealisticTruckModel3D;
