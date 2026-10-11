import { AlertTriangle, Box } from 'lucide-react';
import type { UnallocatedCargoItem } from '../../../types/logistics';
import { safeNumber } from '../../../utils/number-utils';

interface UnplacedCargoSectionProps {
  unplacedItems?: UnallocatedCargoItem[];
  unplacedCount?: number;
}

export default function UnplacedCargoSection({
  unplacedItems = [],
  unplacedCount = 0,
}: UnplacedCargoSectionProps) {
  if (unplacedCount <= 0 && (!unplacedItems || unplacedItems.length === 0)) {
    return null;
  }

  const effectiveCount = Math.max(unplacedCount, unplacedItems.length);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-900">
            Unplaced Cargo Consignment ({effectiveCount} item{effectiveCount !== 1 ? 's' : ''})
          </h3>
          <p className="text-[12.5px] text-amber-700 mt-0.5">
            The optimization engine was unable to pack the following items into the assigned fleet within the configured volumetric and payload constraints.
          </p>
        </div>
      </div>

      {unplacedItems.length === 0 ? (
        <div className="p-3.5 bg-white/80 rounded-xl border border-amber-200/60 text-[12.5px] text-amber-800">
          Placement failed for {effectiveCount} item(s); no detailed instance breakdown was provided by the optimizer.
        </div>
      ) : (
        <div className="border border-amber-200/70 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead className="bg-amber-100/50 text-amber-900 font-semibold border-b border-amber-200/60">
              <tr>
                <th className="py-2.5 px-3">Item Identifier</th>
                <th className="py-2.5 px-3">Dimensions / Volume</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">Rejection / Constraint Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {unplacedItems.map((item, idx) => (
                <tr key={item.instanceId || idx} className="hover:bg-amber-50/50 text-slate-700">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Box className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-900">
                          {item.description || item.cargoId}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.instanceId || item.cargoId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {item.volumeMm3 != null ? `${(safeNumber(item.volumeMm3) / 1e9).toFixed(3)} m³` : 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800">
                    {item.weightGrams != null ? `${(safeNumber(item.weightGrams) / 1000).toFixed(1)} kg` : 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 text-[11.5px] text-amber-800 font-medium">
                    {item.reason || 'Placement failed; no detailed reason was provided by the optimizer.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
