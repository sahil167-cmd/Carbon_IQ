import { useState } from 'react';
import { Layers, Search } from 'lucide-react';
import type { TransformedBox3D } from '../../../utils/coordinate-transform';
import { getDeterministicCargoColor } from '../../../utils/coordinate-transform';

interface CargoManifestLegendProps {
  boxes: TransformedBox3D[];
  selectedId: string | null;
  onSelect: (instanceId: string) => void;
}

export default function CargoManifestLegend({
  boxes,
  selectedId,
  onSelect,
}: CargoManifestLegendProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBoxes = boxes.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.description.toLowerCase().includes(term) ||
      b.instanceId.toLowerCase().includes(term) ||
      b.cargoId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#0F6B3A]" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Assigned Cargo Manifest ({boxes.length} package{boxes.length !== 1 ? 's' : ''})
            </h3>
            <p className="text-[12px] text-slate-500">
              Click any package to highlight and focus it in the 3D vehicle space.
            </p>
          </div>
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search manifest items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#0F6B3A]"
          />
        </div>
      </div>

      {boxes.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-[13px]">
          No cargo items packed in this vehicle.
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">Oriented Size (mm)</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">Coordinates (mm)</th>
                <th className="py-2.5 px-3">Orientation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBoxes.map((box) => {
                const isSelected = box.instanceId === selectedId;
                const badgeColor = getDeterministicCargoColor(box.cargoId);

                return (
                  <tr
                    key={box.instanceId}
                    onClick={() => onSelect(box.instanceId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      #{box.loadingSequence}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: badgeColor }}
                        />
                        <div className="truncate max-w-[180px]">
                          <div className="font-medium text-slate-900 truncate">
                            {box.description}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {box.instanceId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11.5px] text-slate-600">
                      {box.raw.lengthMm}×{box.raw.widthMm}×{box.raw.heightMm}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11.5px] text-slate-800">
                      {Number(box.weightKg || 0).toFixed(1)} kg
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      ({box.raw.xMm}, {box.raw.yMm}, {box.raw.zMm})
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 truncate max-w-[120px]">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">
                        {box.orientation.replace('UPRIGHT_', '')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
