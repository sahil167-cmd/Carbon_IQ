import { useState, useMemo } from 'react';
import { Plus, Trash2, Box, Sparkles, AlertCircle, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import type { CreateCargoItemInput } from '../../types/logistics';
import {
  PackagingBoxTypePicker,
  type PackagingBoxPreset,
  type BoxMaterial,
} from './PackagingBoxTypePicker';

export interface SimplifiedCargoLine {
  id: string;
  name: string;
  quantity: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  isFragile: boolean;
  isStackable: boolean;
}

interface SimplifiedCargoEditorProps {
  items: SimplifiedCargoLine[];
  onChange: (items: SimplifiedCargoLine[]) => void;
}

export function createDefaultCargoLine(index: number = 1): SimplifiedCargoLine {
  return {
    id: `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: index === 1 ? 'Electronics Box' : `Standard Freight Package #${index}`,
    quantity: index === 1 ? 20 : 10,
    lengthCm: 60,
    widthCm: 40,
    heightCm: 40,
    weightKg: 18,
    isFragile: false,
    isStackable: true,
  };
}

export default function SimplifiedCargoEditor({
  items,
  onChange,
}: SimplifiedCargoEditorProps) {
  const [error, setError] = useState('');
  const [showBoxLibrary, setShowBoxLibrary] = useState(true);
  const [selectedBoxPresetId, setSelectedBoxPresetId] = useState('fefco_0201');
  const [boxMaterial, setBoxMaterial] = useState<BoxMaterial>('KRAFT_BROWN');
  const [targetLineId, setTargetLineId] = useState<string | null>(items[0]?.id || null);

  const handleAddLine = () => {
    if (items.length >= 50) {
      setError('A consignment manifest cannot exceed 50 cargo lines.');
      return;
    }
    setError('');
    const newLine = createDefaultCargoLine(items.length + 1);
    onChange([...items, newLine]);
    setTargetLineId(newLine.id);
  };

  const handleRemoveLine = (id: string) => {
    if (items.length <= 1) return;
    onChange(items.filter((item) => item.id !== id));
    if (targetLineId === id) {
      setTargetLineId(items.find((it) => it.id !== id)?.id || null);
    }
  };

  const handleUpdateLine = (id: string, updates: Partial<SimplifiedCargoLine>) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleSelectBoxPreset = (preset: PackagingBoxPreset, mat: BoxMaterial) => {
    setSelectedBoxPresetId(preset.id);
    setBoxMaterial(mat);

    const activeId = targetLineId || items[0]?.id;
    if (activeId) {
      handleUpdateLine(activeId, {
        name: preset.name,
        lengthCm: preset.lengthCm,
        widthCm: preset.widthCm,
        heightCm: preset.heightCm,
        weightKg: preset.suggestedWeightKg,
      });
    } else {
      const newLine: SimplifiedCargoLine = {
        id: `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: preset.name,
        quantity: 20,
        lengthCm: preset.lengthCm,
        widthCm: preset.widthCm,
        heightCm: preset.heightCm,
        weightKg: preset.suggestedWeightKg,
        isFragile: false,
        isStackable: true,
      };
      onChange([...items, newLine]);
      setTargetLineId(newLine.id);
    }
  };

  // Live Aggregate Summary Calculation
  const summary = useMemo(() => {
    let totalItems = 0;
    let totalWeightKg = 0;
    let totalVolumeM3 = 0;

    for (const item of items) {
      const qty = Math.max(0, item.quantity || 0);
      const l = Math.max(0, item.lengthCm || 0);
      const w = Math.max(0, item.widthCm || 0);
      const h = Math.max(0, item.heightCm || 0);
      const wt = Math.max(0, item.weightKg || 0);

      totalItems += qty;
      totalWeightKg += qty * wt;
      // Convert cm3 to m3: (l * w * h) / 1,000,000
      totalVolumeM3 += qty * ((l * w * h) / 1_000_000);
    }

    return {
      totalItems,
      totalWeightKg: Number(totalWeightKg.toFixed(1)),
      totalVolumeM3: Number(totalVolumeM3.toFixed(3)),
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Live Consignment Summary Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F6B3A] text-white flex items-center justify-center font-bold shadow-xs">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[12px] font-bold text-[#0F6B3A] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Consignment Summary
              </div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {summary.totalItems} {summary.totalItems === 1 ? 'box' : 'boxes'} •{' '}
                <span className="text-[#0F6B3A]">{summary.totalWeightKg.toLocaleString()} kg total</span> •{' '}
                <span className="text-indigo-900">{summary.totalVolumeM3} m³ total volume</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddLine}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Another Cargo Item
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[13px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Pacdora 3D Packaging Box Library (from pack/ references) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowBoxLibrary(!showBoxLibrary)}
            className="flex items-center gap-2 text-[13px] font-bold text-slate-900 hover:text-[#0F6B3A] transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#0F6B3A]" />
            <span>Pacdora 3D Packaging Library</span>
            <span className="text-[11.5px] font-normal text-slate-500">
              {showBoxLibrary ? '• Click to collapse library' : '• Click to browse & auto-fill dimensions'}
            </span>
            {showBoxLibrary ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {targetLineId && items.length > 1 && (
            <span className="text-[11px] text-slate-500 font-medium">
              Applying to: <strong className="text-slate-800">#{items.findIndex((i) => i.id === targetLineId) + 1}</strong>
            </span>
          )}
        </div>

        {showBoxLibrary && (
          <PackagingBoxTypePicker
            selectedPresetId={selectedBoxPresetId}
            selectedMaterial={boxMaterial}
            onSelect={handleSelectBoxPreset}
          />
        )}
      </div>

      {/* Cargo Item Cards */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const isTargeted = targetLineId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setTargetLineId(item.id)}
              className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 transition-all ${
                isTargeted
                  ? 'border-[#0F6B3A] ring-1 ring-[#0F6B3A]/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${
                      isTargeted ? 'bg-[#0F6B3A]' : 'bg-slate-800'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span className="font-bold text-slate-800 text-[14px]">
                    {item.name || `Cargo Item #${index + 1}`}
                  </span>
                  {isTargeted && items.length > 1 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Selected for Box Auto-Fill
                    </span>
                  )}
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(item.id)}
                    aria-label="Remove cargo item"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* 1. Cargo Name */}
                <div className="lg:col-span-2">
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Cargo Name / Description
                  </label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateLine(item.id, { name: e.target.value })}
                    placeholder="e.g. Electronics Box"
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all"
                  />
                </div>

                {/* 2. Quantity */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleUpdateLine(item.id, {
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    placeholder="20"
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all font-mono"
                  />
                </div>

                {/* 3. Dimensions: Length, Width, Height */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Length (cm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={item.lengthCm}
                    onChange={(e) =>
                      handleUpdateLine(item.id, {
                        lengthCm: Math.max(1, parseFloat(e.target.value) || 1),
                      })
                    }
                    placeholder="60"
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Width (cm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={item.widthCm}
                    onChange={(e) =>
                      handleUpdateLine(item.id, {
                        widthCm: Math.max(1, parseFloat(e.target.value) || 1),
                      })
                    }
                    placeholder="40"
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={item.heightCm}
                    onChange={(e) =>
                      handleUpdateLine(item.id, {
                        heightCm: Math.max(1, parseFloat(e.target.value) || 1),
                      })
                    }
                    placeholder="40"
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Second row: Weight, Fragile, Stackable */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Unit Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={item.weightKg}
                    onChange={(e) =>
                      handleUpdateLine(item.id, {
                        weightKg: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                      })
                    }
                    placeholder="18"
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all font-mono"
                  />
                </div>

                {/* Fragile Toggle Pill */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Fragile Goods?
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateLine(item.id, { isFragile: false })}
                      className={`flex-1 py-2 px-3 text-[12.5px] font-semibold rounded-xl border transition-all ${
                        !item.isFragile
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateLine(item.id, { isFragile: true })}
                      className={`flex-1 py-2 px-3 text-[12.5px] font-semibold rounded-xl border transition-all ${
                        item.isFragile
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Yes (Fragile)
                    </button>
                  </div>
                </div>

                {/* Stackable Toggle Pill */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Stackable?
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateLine(item.id, { isStackable: true })}
                      className={`flex-1 py-2 px-3 text-[12.5px] font-semibold rounded-xl border transition-all ${
                        item.isStackable
                          ? 'bg-[#0F6B3A] text-white border-[#0F6B3A] shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Yes (Stackable)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateLine(item.id, { isStackable: false })}
                      className={`flex-1 py-2 px-3 text-[12.5px] font-semibold rounded-xl border transition-all ${
                        !item.isStackable
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Helper to convert SimplifiedCargoLine to CreateCargoItemInput for backend API.
 */
export function mapSimplifiedCargoToBackend(
  line: SimplifiedCargoLine
): CreateCargoItemInput {
  return {
    description: line.name.trim() || 'Standard Cargo Package',
    packageType: 'BOX',
    quantity: Math.max(1, Math.floor(line.quantity)),
    length: Math.max(1, line.lengthCm),
    width: Math.max(1, line.widthCm),
    height: Math.max(1, line.heightCm),
    dimensionUnit: 'CM',
    unitWeight: Math.max(0.1, line.weightKg),
    weightUnit: 'KG',
    isFragile: Boolean(line.isFragile),
    isStackable: Boolean(line.isStackable),
    allowRotationHorizontal: true,
    allowRotationVertical: false,
  };
}
