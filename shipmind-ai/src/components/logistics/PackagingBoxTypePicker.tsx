import React, { useState } from 'react';
import { Check, Box, Package, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export type PackagingCategory =
  | 'ALL'
  | 'BOX'
  | 'MAILER'
  | 'HEAVY_DUTY'
  | 'CUSTOM';

export type BoxMaterial = 'KRAFT_BROWN' | 'BLEACHED_WHITE';

export interface PackagingBoxPreset {
  id: string;
  name: string;
  code: string;
  category: PackagingCategory;
  categoryLabel: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  suggestedWeightKg: number;
  description: string;
  tag?: string;
  imageUrl?: string;
}

export const PACKAGING_BOX_PRESETS: PackagingBoxPreset[] = [
  {
    id: 'fefco_0201',
    name: 'FEFCO 0201 shipping paper box mockup',
    code: 'FEFCO-0201',
    category: 'BOX',
    categoryLabel: 'Shipping Carton',
    lengthCm: 60,
    widthCm: 40,
    heightCm: 40,
    suggestedWeightKg: 18,
    description: 'Standard regular slotted carton (RSC), universal freight choice',
    tag: 'Standard RSC',
    isPopular: true,
    imageUrl: '/pack/pack_fefco_0201.png',
  },
  {
    id: 'square_shipping',
    name: 'Square shipping box mockup',
    code: 'SQB-35',
    category: 'BOX',
    categoryLabel: 'Square Box',
    lengthCm: 35,
    widthCm: 35,
    heightCm: 35,
    suggestedWeightKg: 14,
    description: 'Equal dimensional cubic carton ideal for uniform pallet interlocking',
    tag: 'Cubic Modular',
    isPopular: true,
    imageUrl: '/pack/pack_square_shipping.png',
  },
  {
    id: 'fefco_0202',
    name: 'FEFCO 0202 cartons international standard mockup',
    code: 'FEFCO-0202',
    category: 'BOX',
    categoryLabel: 'Overlap Carton',
    lengthCm: 50,
    widthCm: 40,
    heightCm: 35,
    suggestedWeightKg: 22,
    description: 'Full overlap flaps for enhanced top and bottom stacking strength',
    tag: 'Extra Stacking',
    imageUrl: '/pack/pack_fefco_0202.png',
  },
  {
    id: 'shipping_auto_lock',
    name: 'Shipping box with auto lock bottom mockup',
    code: 'AUTO-LOCK',
    category: 'BOX',
    categoryLabel: 'Auto-Lock Box',
    lengthCm: 45,
    widthCm: 30,
    heightCm: 25,
    suggestedWeightKg: 12,
    description: 'Crash-lock bottom box for ultra-fast manual packing line assembly',
    tag: 'Fast Assembly',
    isPopular: true,
    imageUrl: '/pack/pack_auto_lock.png',
  },
  {
    id: 'fefco_0414',
    name: 'FEFCO 0414 flip-top mailer box mockup',
    code: 'FEFCO-0414',
    category: 'MAILER',
    categoryLabel: 'Flip-Top Mailer',
    lengthCm: 32,
    widthCm: 24,
    heightCm: 10,
    suggestedWeightKg: 4.5,
    description: 'Self-locking roll end tuck top for e-commerce and retail dispatch',
    tag: 'E-Commerce',
    isPopular: true,
    imageUrl: '/pack/pack_fefco_0414.png',
  },
  {
    id: 'double_hook_flip',
    name: 'Double hook flip box mockup',
    code: 'FLIP-HOOK',
    category: 'MAILER',
    categoryLabel: 'Double Hook',
    lengthCm: 40,
    widthCm: 30,
    heightCm: 15,
    suggestedWeightKg: 8,
    description: 'Double hook reinforced side walls with front security closure',
    tag: 'Tamper Resistant',
    imageUrl: '/pack/pack_double_hook_flip.png',
  },
  {
    id: 'box_with_handle',
    name: 'Box with handle mockup',
    code: 'HANDLE-BOX',
    category: 'MAILER',
    categoryLabel: 'Gable Box',
    lengthCm: 38,
    widthCm: 22,
    heightCm: 28,
    suggestedWeightKg: 6,
    description: 'Integrated top carrying handle for retail packages and gift cartons',
    tag: 'With Handle',
    imageUrl: '/pack/pack_box_with_handle.png',
  },
  {
    id: 'fefco_0203',
    name: 'FEFCO 0203 international standard shipping cartons',
    code: 'FEFCO-0203',
    category: 'HEAVY_DUTY',
    categoryLabel: 'Heavy Export',
    lengthCm: 65,
    widthCm: 45,
    heightCm: 45,
    suggestedWeightKg: 32,
    description: 'Heavy duty double wall corrugated board for long-haul export transit',
    tag: 'Export Grade',
    isPopular: true,
    imageUrl: '/pack/pack_fefco_0203.png',
  },
  {
    id: 'tuck_lock_mailer',
    name: 'Tuck lock mailer box',
    code: 'TCK-LOCK',
    category: 'MAILER',
    categoryLabel: 'Tuck Mailer',
    lengthCm: 35,
    widthCm: 25,
    heightCm: 12,
    suggestedWeightKg: 5,
    description: 'Self-sealing corrugated mailer with front locking flap',
    tag: 'Retail Mailer',
    imageUrl: '/pack/pack_tuck_lock_mailer.png',
  },
  {
    id: 'tuck_end_product',
    name: 'Tuck end product box mockup',
    code: 'TCK-0211',
    category: 'BOX',
    categoryLabel: 'Product Box',
    lengthCm: 25,
    widthCm: 18,
    heightCm: 12,
    suggestedWeightKg: 3,
    description: 'Compact reverse tuck folding carton for small electronics and spares',
    tag: 'Compact',
    imageUrl: '/pack/pack_tuck_end.png',
  },
  {
    id: 'fefco_0711',
    name: 'FEFCO 0711 flat shipping box',
    code: 'FEFCO-0711',
    category: 'MAILER',
    categoryLabel: 'Flat Box',
    lengthCm: 45,
    widthCm: 35,
    heightCm: 10,
    suggestedWeightKg: 7,
    description: 'Low-profile pre-glued crash lock base for apparel and flat goods',
    tag: 'Flat Pack',
    imageUrl: '/pack/pack_fefco_0711.png',
  },
  {
    id: 'euro_pallet_unit',
    name: 'EUR-Pallet Cargo Unit (120 × 80 cm)',
    code: 'PLT-EUR',
    category: 'CUSTOM',
    categoryLabel: 'Palletized Unit',
    lengthCm: 120,
    widthCm: 80,
    heightCm: 100,
    suggestedWeightKg: 450,
    description: 'Standard European wooden pallet base with full stacked shrink wrap',
    tag: 'Palletized',
    isPopular: true,
    imageUrl: '/pack/pack_shipping_box.png',
  },
];

export interface PackagingBoxTypePickerProps {
  selectedPresetId?: string;
  selectedMaterial?: BoxMaterial;
  onSelect: (preset: PackagingBoxPreset, material: BoxMaterial) => void;
  compact?: boolean;
}

export const PackagingBoxTypePicker: React.FC<PackagingBoxTypePickerProps> = ({
  selectedPresetId = 'fefco_0201',
  selectedMaterial = 'KRAFT_BROWN',
  onSelect,
  compact = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<PackagingCategory>('ALL');
  const [material, setMaterial] = useState<BoxMaterial>(selectedMaterial);
  const [activePresetId, setActivePresetId] = useState<string>(selectedPresetId);

  const filteredPresets =
    activeCategory === 'ALL'
      ? PACKAGING_BOX_PRESETS
      : PACKAGING_BOX_PRESETS.filter((p) => p.category === activeCategory);

  const handleSelectPreset = (preset: PackagingBoxPreset) => {
    setActivePresetId(preset.id);
    onSelect(preset, material);
  };

  const handleMaterialToggle = (newMat: BoxMaterial, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMaterial(newMat);
    const curr = PACKAGING_BOX_PRESETS.find((p) => p.id === activePresetId);
    if (curr) onSelect(curr, newMat);
  };

  return (
    <div className="space-y-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
      {/* Top Header: Title & Global Material Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shadow-xs">
            <Package className="w-4 h-4 text-amber-800" />
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
              <span>Pacdora 3D Packaging Library</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                FEFCO Certified
              </span>
            </div>
            <div className="text-[11.5px] text-slate-500">
              Click any 3D box model to auto-fill authentic packaging dimensions & tare weight
            </div>
          </div>
        </div>

        {/* Material Selection Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xs text-[11.5px] font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={(e) => handleMaterialToggle('KRAFT_BROWN', e)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              material === 'KRAFT_BROWN'
                ? 'bg-[#B0804B] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#8C5E2E] border border-white/60 inline-block" />
            <span>Kraft Brown Cardboard</span>
          </button>
          <button
            type="button"
            onClick={(e) => handleMaterialToggle('BLEACHED_WHITE', e)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              material === 'BLEACHED_WHITE'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400 inline-block" />
            <span>Bleached White</span>
          </button>
        </div>
      </div>

      {/* Category Pills Matching Pacdora Header */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[12px] font-semibold">
        {[
          { key: 'ALL', label: `All Models (${PACKAGING_BOX_PRESETS.length})` },
          { key: 'BOX', label: 'Shipping Boxes (RSC)' },
          { key: 'MAILER', label: 'Mailer Boxes' },
          { key: 'HEAVY_DUTY', label: 'Heavy Duty Export' },
          { key: 'CUSTOM', label: 'Palletized Cargo' },
        ].map((cat) => {
          const isCatActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key as PackagingCategory)}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                isCatActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Visual Grid of Packaging Box Mockups (Exact Pacdora style) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[310px] overflow-y-auto pr-1">
        {filteredPresets.map((preset) => {
          const isSelected = preset.id === activePresetId;
          const isKraft = material === 'KRAFT_BROWN';

          return (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`group p-3 rounded-2xl border bg-white cursor-pointer transition-all duration-200 flex flex-col justify-between select-none relative ${
                isSelected
                  ? 'border-[#0F6B3A] ring-2 ring-[#0F6B3A]/20 shadow-md bg-emerald-50/20'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Top Row: 3D Badge (Pacdora style) & Check Indicator */}
              <div className="flex items-center justify-between gap-1 mb-1">
                {/* Pacdora 3D Badge with rotate icon */}
                <div className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200/80">
                  <span>3D</span>
                  <svg className="w-2.5 h-2.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                </div>

                {isSelected ? (
                  <span className="w-5 h-5 rounded-full bg-[#0F6B3A] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="text-[9.5px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    {preset.code}
                  </span>
                )}
              </div>

              {/* 3D Realistic Box Illustration directly from Pacdora */}
              <div className="w-full h-[84px] flex items-center justify-center my-1 rounded-xl bg-slate-50/50 p-1 overflow-hidden border border-slate-100">
                {preset.imageUrl ? (
                  <img
                    src={preset.imageUrl}
                    alt={preset.name}
                    className={`w-full h-full object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-xs ${
                      !isKraft && preset.id !== 'tuck_lock_mailer'
                        ? 'contrast-95 brightness-125 grayscale'
                        : ''
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <Box className="w-10 h-10 text-slate-300" />
                )}
              </div>

              {/* Bottom Row: Exact Pacdora Dual Swatch Dots (Brown & White) */}
              <div className="flex items-center gap-1 my-1">
                <span
                  title="Kraft Brown Cardboard"
                  className={`w-3 h-3 rounded-full border inline-block transition-transform ${
                    isKraft ? 'ring-2 ring-[#8C5E2E] scale-110' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: '#B0804B', borderColor: '#8C5E2E' }}
                />
                <span
                  title="Bleached White Corrugated"
                  className={`w-3 h-3 rounded-full border inline-block transition-transform ${
                    !isKraft ? 'ring-2 ring-slate-400 scale-110' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}
                />
              </div>

              {/* Title & Dimensions Specs */}
              <div className="mt-1 text-left">
                <div className="text-[11px] font-bold text-slate-900 line-clamp-2 leading-tight">
                  {preset.name}
                </div>
                <div className="text-[11px] font-mono text-[#0F6B3A] font-bold mt-1">
                  {preset.lengthCm} × {preset.widthCm} × {preset.heightCm} cm
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Tare: ~{preset.suggestedWeightKg} kg
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PackagingBoxTypePicker;
