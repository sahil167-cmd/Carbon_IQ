import { useState, useRef } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Truck,
  Maximize2,
  Scale,
  Sparkles,
  Info,
} from 'lucide-react';
import type { OptimizeShipmentRequest } from '../../types/logistics';
import LogisticsService from '../../services/logistics.service';

// ──────────────────────────────────────────────────────────────────────────────
// Indian Truck Specifications from FR8 (https://www.fr8.in/blog/container-truck-size-and-dimensions-in-india/)
// ──────────────────────────────────────────────────────────────────────────────
export interface IndianTruckModel {
  id: string;
  name: string;
  shortName: string;
  dimensionsFt: string;
  dimensionsM: string;
  carryingCapacityTon: string;
  payloadKg: number;
  usableVolumeM3: number;
  imagePath: string;
  badge: string;
  category: string;
  bestFor: string;
  isAvailable: boolean;
}

export type TruckCategory =
  | 'ALL'
  | 'MINI'
  | 'LIGHT'
  | 'MEDIUM'
  | 'CONTAINER'
  | 'HEAVY';

export const INDIAN_CONTAINER_TRUCKS: IndianTruckModel[] = [
  {
    id: 'TRK_TATA_ACE',
    name: 'Tata Ace (Chota Hathi)',
    shortName: 'Tata Ace',
    dimensionsFt: '7 × 4.8 × 4.8 ft',
    dimensionsM: '2.13 × 1.46 × 1.46 m',
    carryingCapacityTon: '0.85 Ton',
    payloadKg: 850,
    usableVolumeM3: 4.5,
    imagePath: '/trucks/tata_ace.jpg',
    badge: 'Last-Mile Express',
    category: 'MINI',
    bestFor: 'Last-mile parcels, e-commerce direct drop, intra-city',
    isAvailable: true,
  },
  {
    id: 'TRK_ASHOK_DOST',
    name: 'Ashok Leyland Dost',
    shortName: 'AL Dost',
    dimensionsFt: '8.2 × 5.3 × 5.0 ft',
    dimensionsM: '2.50 × 1.62 × 1.52 m',
    carryingCapacityTon: '1.5 Ton',
    payloadKg: 1500,
    usableVolumeM3: 6.2,
    imagePath: '/trucks/tata_ace.jpg',
    badge: 'Urban Dispatch',
    category: 'MINI',
    bestFor: 'Urban market distribution, retail consignments',
    isAvailable: true,
  },
  {
    id: 'TRK_BOLERO_MAXI',
    name: 'Mahindra Bolero Maxi Truck',
    shortName: 'Bolero Maxi',
    dimensionsFt: '9.0 × 5.5 × 5.5 ft',
    dimensionsM: '2.74 × 1.68 × 1.68 m',
    carryingCapacityTon: '1.7 Ton',
    payloadKg: 1700,
    usableVolumeM3: 7.7,
    imagePath: '/trucks/tata407.jpg',
    badge: 'Semi-Urban',
    category: 'LIGHT',
    bestFor: 'Semi-urban corridors, wholesale market runs',
    isAvailable: true,
  },
  {
    id: 'TRK_TATA_407',
    name: 'Tata 407 (10 FT Mini Truck)',
    shortName: 'Tata 407',
    dimensionsFt: '10 × 6 × 5.5 ft',
    dimensionsM: '3.05 × 1.83 × 1.68 m',
    carryingCapacityTon: '2.5 Ton',
    payloadKg: 2500,
    usableVolumeM3: 9.4,
    imagePath: '/trucks/tata407.jpg',
    badge: 'Iconic Workhorse',
    category: 'LIGHT',
    bestFor: 'Intra-city tight roads, fast dispatch, small batches',
    isAvailable: true,
  },
  {
    id: 'TRK_EICHER_14FT',
    name: '14 FT Container Truck (Eicher)',
    shortName: '14 FT Eicher',
    dimensionsFt: '14 × 6.5 × 6.5 ft',
    dimensionsM: '4.27 × 1.98 × 1.98 m',
    carryingCapacityTon: '4.0 Ton',
    payloadKg: 4000,
    usableVolumeM3: 16.7,
    imagePath: '/trucks/eicher14.jpg',
    badge: 'Regional Distribution',
    category: 'MEDIUM',
    bestFor: 'Urban & regional distribution, FMCG retail replenishment',
    isAvailable: true,
  },
  {
    id: 'TRK_EICHER_17FT',
    name: '17 FT Container Truck',
    shortName: '17 FT Container',
    dimensionsFt: '17 × 7.0 × 7.0 ft',
    dimensionsM: '5.18 × 2.13 × 2.13 m',
    carryingCapacityTon: '5.0 Ton',
    payloadKg: 5000,
    usableVolumeM3: 23.5,
    imagePath: '/trucks/eicher14.jpg',
    badge: 'Inter-City Express',
    category: 'MEDIUM',
    bestFor: 'Warehouse to warehouse regional replenishment',
    isAvailable: true,
  },
  {
    id: 'TRK_CONTAINER_20FT',
    name: '20 FT Container Truck',
    shortName: '20 FT Container',
    dimensionsFt: '20 × 8 × 8 ft',
    dimensionsM: '6.10 × 2.44 × 2.44 m',
    carryingCapacityTon: '7.0 Ton',
    payloadKg: 7000,
    usableVolumeM3: 36.2,
    imagePath: '/trucks/sxl32.jpg',
    badge: 'Standard ISO',
    category: 'CONTAINER',
    bestFor: 'Intermodal container consignments, export-import freight',
    isAvailable: true,
  },
  {
    id: 'TRK_CONTAINER_24FT',
    name: '24 FT Container Truck (High-Cube)',
    shortName: '24 FT Container',
    dimensionsFt: '24 × 8 × 8.5 ft',
    dimensionsM: '7.32 × 2.44 × 2.59 m',
    carryingCapacityTon: '9.0 Ton',
    payloadKg: 9000,
    usableVolumeM3: 46.2,
    imagePath: '/trucks/sxl32.jpg',
    badge: 'High-Cube',
    category: 'CONTAINER',
    bestFor: 'Palletized industrial goods, electronics, automotive parts',
    isAvailable: true,
  },
  {
    id: 'TRK_32FT_SXL',
    name: '32 FT Single Axle (SXL)',
    shortName: '32 FT SXL',
    dimensionsFt: '32 × 8 × 8 ft',
    dimensionsM: '9.75 × 2.44 × 2.44 m',
    carryingCapacityTon: '7.5 Ton',
    payloadKg: 7500,
    usableVolumeM3: 58.0,
    imagePath: '/trucks/sxl32.jpg',
    badge: 'Most Popular',
    category: 'CONTAINER',
    bestFor: 'E-commerce, FMCG, electronics, volumetric white goods',
    isAvailable: true,
  },
  {
    id: 'TRK_32FT_MXL',
    name: '32 FT Multi-Axle (MXL)',
    shortName: '32 FT MXL',
    dimensionsFt: '32 × 8 × 8.5 ft',
    dimensionsM: '9.75 × 2.44 × 2.59 m',
    carryingCapacityTon: '15.0 Ton',
    payloadKg: 15000,
    usableVolumeM3: 58.0,
    imagePath: '/trucks/mxl32.jpg',
    badge: 'Heavy Freight',
    category: 'HEAVY',
    bestFor: 'Heavy industrial cargo, machinery, steel, bulk long haul',
    isAvailable: true,
  },
  {
    id: 'TRK_40FT_TRAILER',
    name: '40 FT Heavy Container Trailer',
    shortName: '40 FT Trailer',
    dimensionsFt: '40 × 8 × 8.5 ft',
    dimensionsM: '12.19 × 2.44 × 2.59 m',
    carryingCapacityTon: '22.0 Ton',
    payloadKg: 22000,
    usableVolumeM3: 77.0,
    imagePath: '/trucks/mxl32.jpg',
    badge: 'Maximum Capacity',
    category: 'HEAVY',
    bestFor: 'Port logistics, mega-freight, heavy infrastructure cargo',
    isAvailable: true,
  },
];

interface ChooseIndianTruckSectionProps {
  shipmentId: string;
  shipmentNumber: string;
  totalCargoWeightKg?: number;
  totalCargoVolumeM3?: number;
  onOptimizationComplete: (runId: string) => void;
}

export default function ChooseIndianTruckSection({
  shipmentId,
  shipmentNumber,
  totalCargoWeightKg = 0,
  totalCargoVolumeM3 = 0,
  onOptimizationComplete,
}: ChooseIndianTruckSectionProps) {
  const allTrucks = INDIAN_CONTAINER_TRUCKS;
  const [selectedCategory, setSelectedCategory] = useState<TruckCategory>('ALL');
  const carouselRef = useRef<HTMLDivElement>(null);

  const trucks = selectedCategory === 'ALL'
    ? allTrucks
    : allTrucks.filter((t) => t.category === selectedCategory);

  // Recommend best truck based on payload and volume
  const recommendedTruck = (() => {
    // Look for the most economical truck that fits both weight and volume
    const sortedByCapacity = [...trucks].sort((a, b) => a.payloadKg - b.payloadKg);
    for (const t of sortedByCapacity) {
      if (t.payloadKg >= totalCargoWeightKg && t.usableVolumeM3 >= totalCargoVolumeM3) {
        return t;
      }
    }
    return trucks[0]; // default to 32ft SXL
  })();

  const [selectedId, setSelectedId] = useState<string>(recommendedTruck.id);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStep, setOptimizationStep] = useState('');
  const [error, setError] = useState('');

  const selectedTruck = trucks.find((t) => t.id === selectedId) || trucks[0];
  const selectedIndex = trucks.findIndex((t) => t.id === selectedId);

  // Carousel navigation
  const handleScroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 340;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleSelectTruckByIndex = (index: number) => {
    if (index >= 0 && index < trucks.length) {
      setSelectedId(trucks[index].id);
      if (carouselRef.current) {
        const cardWidth = 340;
        carouselRef.current.scrollTo({
          left: index * cardWidth,
          behavior: 'smooth',
        });
      }
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError('');
    const steps = [
      'Analyzing cargo freight manifest…',
      `Aligning container bounds to ${selectedTruck.name}…`,
      'Computing 3D heuristic packing coordinates…',
      'Calculating Scope 3 carbon savings…',
    ];

    for (const step of steps) {
      setOptimizationStep(step);
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const dims = selectedTruck.dimensionsM
        .replace('m', '')
        .split('×')
        .map((s) => parseFloat(s.trim()));
      const lengthMm = Math.round((dims[0] || 2.5) * 1000);
      const widthMm = Math.round((dims[1] || 1.6) * 1000);
      const heightMm = Math.round((dims[2] || 1.5) * 1000);

      const req: OptimizeShipmentRequest = {
        scenarioName: `3D Load — ${selectedTruck.name}`,
        options: {
          maxVehiclesToConsider: 6,
          maxCandidateSolutions: 50,
          maxExecutionTimeMs: 5000,
          allowMultiVehicleFallback: true,
          targetVehicle: {
            id: selectedTruck.id,
            name: selectedTruck.name,
            lengthMm,
            widthMm,
            heightMm,
            maxPayloadGrams: selectedTruck.payloadKg * 1000,
            category: selectedTruck.category,
          },
        } as any,
        persistOptimizationRun: true,
      };

      const result = await LogisticsService.optimizeShipment(shipmentId, req);
      setOptimizationStep('✓ 3D load plan created');
      await new Promise((r) => setTimeout(r, 400));

      if (result.optimizationRunId) {
        onOptimizationComplete(result.optimizationRunId);
      } else {
        throw new Error('No optimization run ID returned.');
      }
    } catch (err: any) {
      setError(err.message || 'Optimization failed. Please verify cargo items and retry.');
      setIsOptimizing(false);
    }
  };

  if (isOptimizing) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm space-y-6">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-[#0F6B3A] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Cpu className="w-8 h-8 text-[#0F6B3A]" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Optimizing 3D Load Plan</h3>
          <p className="text-[13.5px] text-slate-500 mt-1 font-medium">{optimizationStep}</p>
        </div>
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#0F6B3A] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/60 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3A] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Indian Logistics Standards (FR8)
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#0F6B3A]" />
            Select Indian Truck Type
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">
            Choose from standard Indian container trucks with authoritative dimensions for 3D load simulation.
          </p>
        </div>

        {/* Carousel Prev/Next Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            title="Previous truck"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            title="Next truck"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ALL', label: `All Fleet (${allTrucks.length})` },
          { key: 'MINI', label: `Mini Pickup (${allTrucks.filter((t) => t.category === 'MINI').length})` },
          { key: 'LIGHT', label: `Light Commercial (${allTrucks.filter((t) => t.category === 'LIGHT').length})` },
          { key: 'MEDIUM', label: `Medium Truck (${allTrucks.filter((t) => t.category === 'MEDIUM').length})` },
          { key: 'CONTAINER', label: `Standard Container (${allTrucks.filter((t) => t.category === 'CONTAINER').length})` },
          { key: 'HEAVY', label: `Heavy Multi-Axle (${allTrucks.filter((t) => t.category === 'HEAVY').length})` },
        ].map((tab) => {
          const isTabActive = selectedCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSelectedCategory(tab.key as TruckCategory);
                if (carouselRef.current) carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all shrink-0 cursor-pointer ${
                isTabActive
                  ? 'bg-[#0F6B3A] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-[13px] flex items-center gap-2">
          <Info className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── CARD CAROUSEL (matching reference UI) ── */}
      <div
        ref={carouselRef}
        className="flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {trucks.map((truck) => {
          const isSelected = truck.id === selectedId;
          const isRecommended = truck.id === recommendedTruck.id;

          return (
            <div
              key={truck.id}
              onClick={() => setSelectedId(truck.id)}
              className={`shrink-0 w-[310px] sm:w-[330px] rounded-3xl p-5 bg-white border cursor-pointer transition-all duration-300 flex flex-col justify-between snap-start select-none ${
                isSelected
                  ? 'border-[#0F6B3A] shadow-md ring-2 ring-[#0F6B3A]/20 scale-[1.01]'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Card Header: Name + "Available" / "Recommended" pill */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[17px] font-black text-slate-900 tracking-tight leading-snug">
                      {truck.name}
                    </h3>
                    <div className="text-[12px] text-slate-400 font-medium mt-0.5">
                      {truck.dimensionsFt}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {isRecommended && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase text-amber-800 bg-amber-50 border border-amber-200">
                        Best Fit
                      </span>
                    )}
                    <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Available
                    </span>
                  </div>
                </div>

                {/* 3D Photorealistic Truck Image Render */}
                <div className="my-5 w-full h-[180px] bg-white rounded-2xl flex items-center justify-center overflow-hidden">
                  <img
                    src={truck.imagePath}
                    alt={truck.name}
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Card Footer: Specs & Select Status */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Payload
                  </div>
                  <div className="text-[15px] font-black text-slate-900">
                    {truck.carryingCapacityTon}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">
                    Volume
                  </div>
                  <div className="text-[15px] font-bold text-slate-700 text-right">
                    {truck.usableVolumeM3} m³
                  </div>
                </div>

                <div className="pl-3">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-[#0F6B3A] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Carousel Dot Indicators ── */}
      <div className="flex items-center justify-center gap-2">
        {trucks.map((truck, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={truck.id}
              type="button"
              onClick={() => handleSelectTruckByIndex(idx)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                isSelected
                  ? 'w-7 h-2.5 bg-gradient-to-r from-[#0F6B3A] to-emerald-500 shadow-xs'
                  : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title={`View ${truck.name}`}
            />
          );
        })}
      </div>

      {/* ── ACTIVE SELECTION SUMMARY CARD (matching reference UI media_1788950062305) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden p-1 shrink-0 flex items-center justify-center shadow-xs">
              <img
                src={selectedTruck.imagePath}
                alt={selectedTruck.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Shipment {shipmentNumber || 'Consignment'}
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">
                {selectedTruck.name}
              </h3>
              <div className="text-[12px] text-slate-500 font-medium">
                {selectedTruck.category} · {selectedTruck.dimensionsFt}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active · Ready for 3D Load Plan
            </span>
          </div>
        </div>

        {/* 3-Column Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-b border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-500 text-[12px] font-semibold mb-1">
              <Scale className="w-4 h-4 text-[#0F6B3A]" />
              <span>Carrying Capacity</span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {selectedTruck.carryingCapacityTon}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Max {selectedTruck.payloadKg.toLocaleString()} kg payload limit
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-500 text-[12px] font-semibold mb-1">
              <Maximize2 className="w-4 h-4 text-[#0F6B3A]" />
              <span>Cargo Volume</span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {selectedTruck.usableVolumeM3} m³
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Internal dimensions: {selectedTruck.dimensionsM}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-500 text-[12px] font-semibold mb-1">
              <Sparkles className="w-4 h-4 text-[#0F6B3A]" />
              <span>Optimized Suitability</span>
            </div>
            <div className="text-2xl font-black text-[#0F6B3A]">
              Recommended
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium line-clamp-1">
              {selectedTruck.bestFor}
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-[12.5px] text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0F6B3A] shrink-0" />
            <span>
              Clicking optimize calculates the exact 3D spatial packing, volumetric fill rate, and carbon savings.
            </span>
          </div>

          <button
            type="button"
            onClick={handleOptimize}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#0F6B3A] to-[#148347] hover:from-[#0c562e] hover:to-[#0F6B3A] text-white font-bold text-[14px] rounded-2xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
            Optimize 3D Load Plan
          </button>
        </div>
      </div>
    </div>
  );
}
