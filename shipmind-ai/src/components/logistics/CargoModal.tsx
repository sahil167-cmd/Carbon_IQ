import { useState, useEffect } from 'react';
import { X, Box, AlertCircle, ChevronDown, ChevronUp, Sparkles, Layers } from 'lucide-react';
import type {
  CargoItem,
  CreateCargoItemInput,
  DimensionUnit,
  WeightUnit,
} from '../../types/logistics';
import { PackagingBoxTypePicker, type PackagingBoxPreset, type BoxMaterial } from './PackagingBoxTypePicker';

interface CargoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCargoItemInput) => Promise<void>;
  initialData?: CargoItem | null;
  shipmentNumber?: string;
}

export default function CargoModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  shipmentNumber,
}: CargoModalProps) {
  // Primary operational fields (cm, kg defaults)
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [length, setLength] = useState<number | ''>(60);
  const [width, setWidth] = useState<number | ''>(40);
  const [height, setHeight] = useState<number | ''>(40);
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('CM');
  const [unitWeight, setUnitWeight] = useState<number | ''>(18);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('KG');
  const [isFragile, setIsFragile] = useState(false);
  const [isStackable, setIsStackable] = useState(true);

  // Advanced / Optional fields
  const [sku, setSku] = useState('');
  const [packageType, setPackageType] = useState('BOX');
  const [maxStackWeight, setMaxStackWeight] = useState<number | ''>('');
  const [maxStackTiers, setMaxStackTiers] = useState<number | ''>('');
  const [handlingInstructions, setHandlingInstructions] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBoxPicker, setShowBoxPicker] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fefco_0201');
  const [boxMaterial, setBoxMaterial] = useState<BoxMaterial>('KRAFT_BROWN');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description || '');
      setSku(initialData.sku || '');
      setPackageType(initialData.packageType || 'BOX');
      setQuantity(initialData.quantity || 1);
      setLength(Number(initialData.length) || 60);
      setWidth(Number(initialData.width) || 40);
      setHeight(Number(initialData.height) || 40);
      setDimensionUnit(initialData.dimensionUnit || 'CM');
      setUnitWeight(Number(initialData.unitWeight) || 18);
      setWeightUnit(initialData.weightUnit || 'KG');
      setIsStackable(initialData.isStackable ?? true);
      setMaxStackWeight(initialData.maxStackWeight ? Number(initialData.maxStackWeight) : '');
      setMaxStackTiers(initialData.maxStackTiers ? Number(initialData.maxStackTiers) : '');
      setIsFragile(initialData.isFragile ?? false);
      setHandlingInstructions(initialData.handlingInstructions || '');
    } else {
      setDescription('');
      setSku('');
      setPackageType('BOX');
      setQuantity(1);
      setLength(60);
      setWidth(40);
      setHeight(40);
      setDimensionUnit('CM');
      setUnitWeight(18);
      setWeightUnit('KG');
      setIsStackable(true);
      setMaxStackWeight('');
      setMaxStackTiers('');
      setIsFragile(false);
      setHandlingInstructions('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Live calculated summary
  const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 0;
  const l = typeof length === 'number' && length > 0 ? length : 0;
  const w = typeof width === 'number' && width > 0 ? width : 0;
  const h = typeof height === 'number' && height > 0 ? height : 0;
  const wt = typeof unitWeight === 'number' && unitWeight > 0 ? unitWeight : 0;

  const totalWeight = qty * wt;
  const totalVolumeM3 = (qty * (l * w * h)) / 1_000_000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Cargo description is required.');
      return;
    }
    if (typeof length !== 'number' || length <= 0) {
      setError('Length must be a positive number.');
      return;
    }
    if (typeof width !== 'number' || width <= 0) {
      setError('Width must be a positive number.');
      return;
    }
    if (typeof height !== 'number' || height <= 0) {
      setError('Height must be a positive number.');
      return;
    }
    if (typeof unitWeight !== 'number' || unitWeight <= 0) {
      setError('Unit weight must be a positive number.');
      return;
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      setError('Quantity must be an integer greater than 0.');
      return;
    }

    const payload: CreateCargoItemInput = {
      description: description.trim(),
      sku: sku.trim() || undefined,
      packageType: packageType || undefined,
      quantity: Math.floor(quantity),
      length,
      width,
      height,
      dimensionUnit,
      unitWeight,
      weightUnit,
      isStackable,
      maxStackWeight: typeof maxStackWeight === 'number' ? maxStackWeight : undefined,
      maxStackTiers: typeof maxStackTiers === 'number' ? Math.floor(maxStackTiers) : undefined,
      isFragile,
      allowRotationHorizontal: true,
      allowRotationVertical: false,
      handlingInstructions: handlingInstructions.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save cargo item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectBoxPreset = (preset: PackagingBoxPreset, mat: BoxMaterial) => {
    setSelectedPresetId(preset.id);
    setBoxMaterial(mat);
    if (
      !description ||
      description.includes('FEFCO') ||
      description.includes('Carton') ||
      description.includes('Box') ||
      description.includes('Pallet')
    ) {
      setDescription(preset.name);
    }
    setLength(preset.lengthCm);
    setWidth(preset.widthCm);
    setHeight(preset.heightCm);
    setUnitWeight(preset.suggestedWeightKg);
    setPackageType(preset.category === 'PALLET_CRATES' ? 'PALLET' : 'BOX');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] text-[#0F6B3A] flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialData ? 'Edit Cargo Item' : 'Add Cargo Item'}
              </h2>
              {shipmentNumber && (
                <p className="text-[12px] text-slate-500">
                  Shipment: <span className="font-semibold text-slate-700">{shipmentNumber}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2.5 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#0F6B3A]" />
            Item Totals:
          </span>
          <span className="font-bold text-slate-800">
            {qty} units • {totalWeight.toFixed(1)} kg • {totalVolumeM3.toFixed(3)} m³
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-[13px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Pacdora 3D Box Packaging Library (Auto-fill) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBoxPicker(!showBoxPicker)}
                className="flex items-center gap-2 text-[12.5px] font-bold text-slate-800 hover:text-[#0F6B3A] transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#0F6B3A]" />
                <span>Choose Packaging Box Type (Pacdora 3D Library)</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {showBoxPicker ? '• Click to collapse' : '• Click to browse & auto-fill dimensions'}
                </span>
                {showBoxPicker ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-1" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                )}
              </button>
            </div>

            {showBoxPicker && (
              <PackagingBoxTypePicker
                selectedPresetId={selectedPresetId}
                selectedMaterial={boxMaterial}
                onSelect={handleSelectBoxPreset}
              />
            )}
          </div>

          {/* 1. Description & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Cargo Name / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Electronics Box"
                className="w-full text-[13.5px] px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full text-[13.5px] px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* 2. Dimensions (cm) */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">
              Dimensions (cm)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Length (cm)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={length}
                  onChange={(e) => setLength(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full text-[13px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-[#0F6B3A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Width (cm)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={width}
                  onChange={(e) => setWidth(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full text-[13px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-[#0F6B3A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={height}
                  onChange={(e) => setHeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full text-[13px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-[#0F6B3A] outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Unit Weight (kg) */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Unit Weight (kg) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              required
              value={unitWeight}
              onChange={(e) => setUnitWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="e.g. 18"
              className="w-full text-[13.5px] px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A] outline-none transition-all font-mono"
            />
          </div>

          {/* 4. Fragile & Stackable Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Fragile Cargo?
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFragile(false)}
                  className={`flex-1 py-1.5 px-3 text-[12px] font-semibold rounded-xl border transition-all ${
                    !isFragile
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setIsFragile(true)}
                  className={`flex-1 py-1.5 px-3 text-[12px] font-semibold rounded-xl border transition-all ${
                    isFragile
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Stackable?
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStackable(true)}
                  className={`flex-1 py-1.5 px-3 text-[12px] font-semibold rounded-xl border transition-all ${
                    isStackable
                      ? 'bg-[#0F6B3A] text-white border-[#0F6B3A] shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsStackable(false)}
                  className={`flex-1 py-1.5 px-3 text-[12px] font-semibold rounded-xl border transition-all ${
                    !isStackable
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          {/* 5. Progressive Disclosure: Advanced Options */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              <span>Advanced: SKU, package type, stack tiers</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="p-3 bg-slate-50 rounded-xl space-y-3 mt-2 border border-slate-200 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      SKU / Part Code
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. SKU-101"
                      className="w-full text-[12.5px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-[#0F6B3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Package Type
                    </label>
                    <select
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value)}
                      className="w-full text-[12.5px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-[#0F6B3A]"
                    >
                      <option value="BOX">Standard Box</option>
                      <option value="PALLET">Pallet</option>
                      <option value="CRATE">Wooden Crate</option>
                      <option value="DRUM">Barrel / Drum</option>
                      <option value="SACK">Sack</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Max Stack Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={maxStackWeight}
                      onChange={(e) =>
                        setMaxStackWeight(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      placeholder="e.g. 500"
                      className="w-full text-[12.5px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-[#0F6B3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Max Stack Tiers
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={maxStackTiers}
                      onChange={(e) =>
                        setMaxStackTiers(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                      }
                      placeholder="e.g. 4"
                      className="w-full text-[12.5px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-[#0F6B3A]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? 'Saving...' : initialData ? 'Update Cargo' : 'Add Cargo Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
