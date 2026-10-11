import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import type { TransformedBox3D } from '../../../utils/coordinate-transform';

interface CargoBox3DProps {
  box: TransformedBox3D;
  isSelected: boolean;
  isHovered: boolean;
  isJustPlaced?: boolean;
  onSelect: (instanceId: string) => void;
  onHover: (instanceId: string | null) => void;
}

// Deterministic natural kraft-brown cardboard tones
const KRAFT_PALETTES = [
  { base: '#C59B6D', tape: '#A37946', label: '#EAD7BA' }, // Standard corrugated kraft
  { base: '#D4A373', tape: '#B07D4C', label: '#F2E5D0' }, // Golden kraft
  { base: '#BA8B58', tape: '#916534', label: '#DFCEB3' }, // Dense shipping carton
  { base: '#A87A47', tape: '#825527', label: '#D5C19F' }, // Heavy-duty kraft
  { base: '#CDA577', tape: '#A77F4F', label: '#EDE0CA' }, // Recycled parcel
];

export default function CargoBox3D({
  box,
  isSelected,
  isHovered,
  isJustPlaced = false,
  onSelect,
  onHover,
}: CargoBox3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Pick deterministic kraft cardboard tone
  const palette = useMemo(() => {
    let hash = 0;
    const str = box.cargoId || box.instanceId || 'box';
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % KRAFT_PALETTES.length;
    return KRAFT_PALETTES[idx];
  }, [box.cargoId, box.instanceId]);

  const tapeThicknessM = Math.min(box.widthM * 0.28, 0.06);

  return (
    <group position={[box.centerX, box.centerY, box.centerZ]}>
      {/* Main Corrugated Cardboard Box */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(box.instanceId);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(box.instanceId);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[box.lengthM, box.widthM, box.heightM]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : isHovered ? '#60a5fa' : isJustPlaced ? '#10b981' : palette.base}
          roughness={0.88}
          metalness={0.02}
          emissive={isSelected ? '#0284c7' : isHovered ? '#2563eb' : isJustPlaced ? '#059669' : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.2 : isJustPlaced ? 0.45 : 0}
        />
        {/* Clean edge borders for box definition */}
        <Edges
          color={isSelected ? '#ffffff' : isJustPlaced ? '#34d399' : '#5c3e21'}
          threshold={15}
          lineWidth={isSelected || isJustPlaced ? 2 : 1}
        />
      </mesh>

      {/* Top Sealing Tape Stripe (Packaging detail) */}
      {!isSelected && !isHovered && box.lengthM > 0.1 && (
        <mesh position={[0, 0, box.heightM / 2 + 0.001]}>
          <planeGeometry args={[box.lengthM * 0.98, tapeThicknessM]} />
          <meshStandardMaterial
            color={palette.tape}
            roughness={0.6}
            metalness={0.05}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Shipping Label Patch (White postage label on top face) */}
      {!isSelected && !isHovered && box.lengthM > 0.2 && box.widthM > 0.2 && (
        <mesh position={[box.lengthM * 0.22, box.widthM * 0.2, box.heightM / 2 + 0.0015]}>
          <planeGeometry args={[Math.min(0.12, box.lengthM * 0.35), Math.min(0.09, box.widthM * 0.35)]} />
          <meshStandardMaterial
            color="#FFFFFF"
            roughness={0.9}
            metalness={0.0}
            transparent
            opacity={0.92}
          />
        </mesh>
      )}
    </group>
  );
}
