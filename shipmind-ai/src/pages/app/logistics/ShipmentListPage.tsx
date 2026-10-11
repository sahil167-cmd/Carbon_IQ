import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Plus, Search, AlertCircle, RefreshCw, ChevronRight, ArrowRight } from 'lucide-react';
import AppLayout from '../../../components/layout/AppLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import Pagination from '../../../components/shared/Pagination';
import LogisticsService from '../../../services/logistics.service';
import type { Shipment } from '../../../types/logistics';
import { formatWeight, formatVolume } from '../../../utils/number-utils';

export default function ShipmentListPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await LogisticsService.listShipments({
        page,
        limit,
        status: statusFilter || undefined,
      });
      setShipments(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load shipments from API');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const filteredShipments = search
    ? shipments.filter((s) => {
        const query = search.toLowerCase();
        return (
          s.shipmentNumber.toLowerCase().includes(query) ||
          (s.referenceNumber && s.referenceNumber.toLowerCase().includes(query)) ||
          (s.description && s.description.toLowerCase().includes(query))
        );
      })
    : shipments;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getRouteSummary = (shipment: Shipment) => {
    if (!shipment.stops || shipment.stops.length === 0) {
      return <span className="text-slate-400 italic">No stops defined</span>;
    }
    const origin = shipment.stops[0];
    const destination = shipment.stops[shipment.stops.length - 1];

    const originText = origin.city || origin.locationName || origin.country || 'Origin';
    const destText = destination.city || destination.locationName || destination.country || 'Destination';

    if (shipment.stops.length === 1) {
      return <span className="font-medium text-slate-800">{originText}</span>;
    }

    return (
      <div className="flex items-center gap-1.5 font-medium text-slate-800 text-[13px]">
        <span>{originText}</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>{destText}</span>
        {shipment.stops.length > 2 && (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded ml-1">
            +{shipment.stops.length - 2} via
          </span>
        )}
      </div>
    );
  };

  return (
    <AppLayout title="Logistics & Fleet" subtitle="Shipment Operations & Load Planning">
      {/* Header Bar */}
      <div className="glass border-b border-slate-200 px-6 py-5 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Truck className="w-6 h-6 text-[#0F6B3A]" />
              Shipments & Freight Manifests
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              {loading ? 'Fetching live database records...' : `${total} active shipments found`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/app/shipments/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Create Shipment
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Controls / Filter Row */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shipment number, ref..."
              className="w-full text-[13.5px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <label className="text-[12px] font-semibold text-slate-500 whitespace-nowrap">
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-[13px] font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#0F6B3A]"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PLANNED">Planned</option>
              <option value="OPTIMIZED">Optimized</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button
              type="button"
              onClick={fetchShipments}
              disabled={loading}
              aria-label="Refresh shipments list"
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="text-[14px] font-semibold">Failed to fetch shipments</p>
                <p className="text-[12.5px] text-rose-600">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchShipments}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-semibold rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredShipments.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#E6F4EA] text-[#0F6B3A] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No shipments found</h3>
            <p className="text-[13.5px] text-slate-500 max-w-sm mx-auto mb-6">
              {statusFilter
                ? `There are no shipments matching status "${statusFilter}". Try selecting All Statuses.`
                : 'Get started by creating your first freight shipment and defining stops and cargo.'}
            </p>
            <Link
              to="/app/shipments/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F6B3A] hover:bg-[#125C3A] text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Shipment
            </Link>
          </div>
        )}

        {/* Shipments Table */}
        {!loading && !error && filteredShipments.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Shipment #</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Route</th>
                    <th className="py-3.5 px-4 text-center">Items</th>
                    <th className="py-3.5 px-4">Weight (kg)</th>
                    <th className="py-3.5 px-4">Volume (m³)</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13.5px]">
                  {filteredShipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Shipment Number & Reference */}
                      <td className="py-4 px-4">
                        <Link
                          to={`/app/shipments/${s.id}`}
                          className="font-bold text-slate-900 hover:text-[#0F6B3A] transition-colors"
                        >
                          {s.shipmentNumber}
                        </Link>
                        {s.referenceNumber && (
                          <div className="text-[11.5px] text-slate-500 font-mono mt-0.5">
                            Ref: {s.referenceNumber}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={s.status} />
                      </td>

                      {/* Route */}
                      <td className="py-4 px-4 min-w-[200px]">{getRouteSummary(s)}</td>

                      {/* Cargo Items Count */}
                      <td className="py-4 px-4 text-center font-bold text-slate-800">
                        {s.cargoItemsCount ?? (s.cargoItems ? s.cargoItems.length : 0)}
                      </td>

                      {/* Total Weight */}
                      <td className="py-4 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {formatWeight(s.totalWeightKg, false, '-')}
                      </td>

                      {/* Total Volume */}
                      <td className="py-4 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {formatVolume(s.totalVolumeM3, 2, '-')}
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-slate-500 whitespace-nowrap text-[12.5px]">
                        {new Date(s.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/app/shipments/${s.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[12.5px] font-semibold text-[#0F6B3A] bg-[#E6F4EA] hover:bg-[#d0ebd6] rounded-lg transition-colors"
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[12.5px] text-slate-500">
                  Showing Page <span className="font-semibold">{page}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span> ({total} total shipments)
                </p>
                <Pagination current={page} total={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
