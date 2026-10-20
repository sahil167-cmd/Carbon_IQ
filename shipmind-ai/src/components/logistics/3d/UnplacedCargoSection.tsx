import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Box,
  Layers,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Truck,
  Scale,
  Maximize2,
} from 'lucide-react';
import type { UnallocatedCargoItem } from '../../../types/logistics';
import { safeNumber } from '../../../utils/number-utils';

interface UnplacedCargoSectionProps {
  unplacedItems?: UnallocatedCargoItem[];
  unplacedCount?: number;
}

interface GroupedCargoSummary {
  key: string;
  description: string;
  count: number;
  unitVolumeM3: number;
  unitWeightKg: number;
  totalVolumeM3: number;
  totalWeightKg: number;
  reasons: string[];
}

export default function UnplacedCargoSection({
  unplacedItems = [],
  unplacedCount = 0,
}: UnplacedCargoSectionProps) {
  const [viewMode, setViewMode] = useState<'grouped' | 'itemized'>('grouped');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  if (unplacedCount <= 0 && (!unplacedItems || unplacedItems.length === 0)) {
    return null;
  }

  const effectiveCount = Math.max(unplacedCount, unplacedItems.length);

  // Group identical cargo items by description, dimensions, and unit specs
  const { groupedSummaries, totalVolumeM3, totalWeightKg } = useMemo(() => {
    const groupMap = new Map<string, GroupedCargoSummary>();
    let sumVol = 0;
    let sumWt = 0;

    for (const item of unplacedItems) {
      const desc = item.description || item.cargoId || 'Standard Cargo Package';
      const volM3 = item.volumeMm3 != null ? safeNumber(item.volumeMm3) / 1e9 : 0;
      const wtKg = item.weightGrams != null ? safeNumber(item.weightGrams) / 1000 : 0;
      const reason = item.reason || 'No available fleet vehicle with remaining capacity could physically fit this cargo';

      sumVol += volM3;
      sumWt += wtKg;

      const groupKey = `${desc}__${volM3.toFixed(3)}__${wtKg.toFixed(1)}`;
      const existing = groupMap.get(groupKey);

      if (existing) {
        existing.count += 1;
        existing.totalVolumeM3 += volM3;
        existing.totalWeightKg += wtKg;
        if (!existing.reasons.includes(reason)) {
          existing.reasons.push(reason);
        }
      } else {
        groupMap.set(groupKey, {
          key: groupKey,
          description: desc,
          count: 1,
          unitVolumeM3: volM3,
          unitWeightKg: wtKg,
          totalVolumeM3: volM3,
          totalWeightKg: wtKg,
          reasons: [reason],
        });
      }
    }

    return {
      groupedSummaries: Array.from(groupMap.values()),
      totalVolumeM3: sumVol,
      totalWeightKg: sumWt,
    };
  }, [unplacedItems]);

  // Filtered itemized list for inspection
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return unplacedItems;
    const q = searchQuery.toLowerCase();
    return unplacedItems.filter(
      (item) =>
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.instanceId && item.instanceId.toLowerCase().includes(q)) ||
        (item.cargoId && item.cargoId.toLowerCase().includes(q))
    );
  }, [unplacedItems, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Estimate additional trucks required (standard 20 FT Container Truck has ~33 m3 volume and ~22,000 kg payload)
  const estAdditionalTrucks = Math.max(
    1,
    Math.ceil(Math.max(totalVolumeM3 / 33, totalWeightKg / 22000))
  );

  return (
    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header with KPI chips and View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-amber-200/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-300/40">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-950">
                Unallocated Cargo Consignment
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                {effectiveCount.toLocaleString()} item{effectiveCount !== 1 ? 's' : ''} overflow
              </span>
            </div>
            <p className="text-[12px] text-amber-800/90 mt-0.5">
              Assigned fleet reached volumetric capacity. Items below could not physically fit into vehicle #{1}.
            </p>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-1 bg-amber-200/50 p-1 rounded-xl self-start md:self-auto border border-amber-300/60">
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'grouped'
                ? 'bg-white text-amber-950 shadow-xs'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Grouped Summary ({groupedSummaries.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('itemized');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'itemized'
                ? 'bg-white text-amber-950 shadow-xs'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Itemized Breakdown ({unplacedItems.length})
          </button>
        </div>
      </div>

      {/* Aggregate Impact Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/90 p-3 rounded-xl border border-amber-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-amber-700">Total Overflow Volume</div>
            <div className="text-sm font-extrabold text-slate-900">
              {totalVolumeM3.toFixed(2)} m³
            </div>
          </div>
        </div>

        <div className="bg-white/90 p-3 rounded-xl border border-amber-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-amber-700">Total Overflow Weight</div>
            <div className="text-sm font-extrabold text-slate-900">
              {(totalWeightKg / 1000).toFixed(2)} tonnes <span className="text-[11px] font-normal text-slate-500">({totalWeightKg.toLocaleString()} kg)</span>
            </div>
          </div>
        </div>

        <div className="bg-white/90 p-3 rounded-xl border border-amber-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">Fleet Recommendation</div>
            <div className="text-xs font-bold text-slate-900">
              +{estAdditionalTrucks} truck{estAdditionalTrucks !== 1 ? 's' : ''} needed for 100% consignment
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grouped' ? (
        /* Grouped Summary View - Compact & Clean */
        <div className="border border-amber-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead className="bg-amber-100/60 text-amber-950 font-bold border-b border-amber-200/80">
              <tr>
                <th className="py-2.5 px-3.5">Cargo Item Specification</th>
                <th className="py-2.5 px-3 text-center">Unallocated Qty</th>
                <th className="py-2.5 px-3">Unit Specs</th>
                <th className="py-2.5 px-3">Total Impact</th>
                <th className="py-2.5 px-3.5">Constraint Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100/80">
              {groupedSummaries.map((group) => (
                <tr key={group.key} className="hover:bg-amber-50/40 text-slate-700 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
                        <Box className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-[12.5px]">
                          {group.description}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Homogeneous Freight Batch
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                      {group.count.toLocaleString()} units
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    <div>{group.unitVolumeM3.toFixed(3)} m³</div>
                    <div className="text-slate-500 text-[10.5px]">{group.unitWeightKg.toFixed(1)} kg / unit</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="font-bold text-slate-900">{group.totalVolumeM3.toFixed(2)} m³</div>
                    <div className="text-slate-500 text-[10.5px]">{group.totalWeightKg.toLocaleString()} kg</div>
                  </td>
                  <td className="py-3 px-3.5 text-[11.5px] text-amber-900 font-medium max-w-xs">
                    {group.reasons[0] || 'Vehicle volumetric/payload capacity limit reached.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Itemized Breakdown View - Paginated with Max-Height Scroll Container */
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by instance ID or description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-200/80 rounded-xl text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="text-[11.5px] text-amber-800 font-medium">
              Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length.toLocaleString()} items
            </div>
          </div>

          {/* Scroll-contained Table (Capped at 340px) */}
          <div className="border border-amber-200/80 rounded-xl overflow-hidden bg-white shadow-2xs max-h-[340px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11.5px]">
              <thead className="bg-amber-100/60 text-amber-950 font-bold border-b border-amber-200/80 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3">Item Instance</th>
                  <th className="py-2 px-3">Volume</th>
                  <th className="py-2 px-3">Weight</th>
                  <th className="py-2 px-3">Rejection Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/70">
                {paginatedItems.map((item, idx) => (
                  <tr key={item.instanceId || idx} className="hover:bg-amber-50/40 text-slate-700 transition-colors">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Box className="w-3 h-3 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900 text-[11.5px]">
                            {item.description || item.cargoId}
                          </div>
                          <div className="text-[9.5px] text-slate-400 font-mono">
                            {item.instanceId || item.cargoId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[10.5px] text-slate-600">
                      {item.volumeMm3 != null ? `${(safeNumber(item.volumeMm3) / 1e9).toFixed(3)} m³` : 'N/A'}
                    </td>
                    <td className="py-2 px-3 font-mono text-[10.5px] text-slate-800">
                      {item.weightGrams != null ? `${(safeNumber(item.weightGrams) / 1000).toFixed(1)} kg` : 'N/A'}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-amber-900 font-medium truncate max-w-xs">
                      {item.reason || 'Remaining fleet capacity exceeded'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11.5px] text-amber-800">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg text-[11.5px] font-semibold text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg text-[11.5px] font-semibold text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
