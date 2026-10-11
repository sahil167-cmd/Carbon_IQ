import { useState } from 'react';
import { Box, Edit3, Trash2, Layers, AlertTriangle } from 'lucide-react';
import type { CargoItem } from '../../types/logistics';
import { formatWeight, formatVolume } from '../../utils/number-utils';

interface CargoTableProps {
  items: CargoItem[];
  onEdit: (item: CargoItem) => void;
  onDelete: (item: CargoItem) => Promise<void>;
  onAddCargoClick: () => void;
  isReadOnly?: boolean;
}

export default function CargoTable({
  items,
  onEdit,
  onDelete,
  onAddCargoClick,
  isReadOnly = false,
}: CargoTableProps) {
  const [itemToDelete, setItemToDelete] = useState<CargoItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await onDelete(itemToDelete);
      setItemToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <Box className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">No cargo items added yet</h3>
        <p className="text-[13.5px] text-slate-500 max-w-md mx-auto mb-6">
          Add freight packages, boxes, pallets, or custom items to this shipment to enable 3D load planning and weight distribution.
        </p>
        {!isReadOnly && (
          <button
            type="button"
            onClick={onAddCargoClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            <Box className="w-4 h-4" />
            Add First Cargo Item
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Item & Description</th>
                <th className="py-3 px-4">Dimensions (L × W × H)</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4">Unit Weight</th>
                <th className="py-3 px-4">Total Weight</th>
                <th className="py-3 px-4">Total Volume</th>
                <th className="py-3 px-4">Constraints</th>
                {!isReadOnly && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13.5px]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Item Description */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{item.description}</div>
                    <div className="text-[11.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                      {item.packageType && (
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                          {item.packageType}
                        </span>
                      )}
                      {item.sku && <span>SKU: {item.sku}</span>}
                    </div>
                  </td>

                  {/* Dimensions */}
                  <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {item.length} × {item.width} × {item.height}{' '}
                    <span className="text-slate-400 text-[11px] font-sans">
                      {item.dimensionUnit}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                    {item.quantity}
                  </td>

                  {/* Unit Weight */}
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    {item.unitWeight} {item.weightUnit}
                  </td>

                  {/* Total Weight */}
                  <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {formatWeight(item.totalWeightKg, false, '-')}
                  </td>

                  {/* Total Volume */}
                  <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {formatVolume(item.totalVolumeM3, 3, '-')}
                  </td>

                  {/* Constraints */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.isStackable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Layers className="w-3 h-3" />
                          Stackable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Non-stackable
                        </span>
                      )}

                      {item.isFragile && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          Fragile
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  {!isReadOnly && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          aria-label={`Edit ${item.description}`}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          aria-label={`Delete ${item.description}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Cargo Item?</h3>
            <p className="text-[13.5px] text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-slate-900">"{itemToDelete.description}"</span>?
              This will permanently delete this cargo item and recalculate the shipment's total weight and volume.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-[13.5px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
