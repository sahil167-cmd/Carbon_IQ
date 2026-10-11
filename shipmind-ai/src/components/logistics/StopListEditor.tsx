import { Plus, Trash2, ArrowDown, MapPin, ArrowUp } from 'lucide-react';
import AddressInputWithGeocode from './AddressInputWithGeocode';
import type { ShipmentStop, StopType } from '../../types/logistics';

interface StopListEditorProps {
  stops: ShipmentStop[];
  onChange: (stops: ShipmentStop[]) => void;
}

export default function StopListEditor({ stops, onChange }: StopListEditorProps) {
  const handleAddStop = () => {
    const nextSeq = stops.length + 1;
    const newStop: ShipmentStop = {
      sequenceOrder: nextSeq,
      stopType: 'TRANSIT_WAYPOINT',
      locationName: '',
      addressLine1: '',
      city: '',
      country: 'India',
      latitude: undefined,
      longitude: undefined,
    };
    onChange([...stops, newStop]);
  };

  const handleRemoveStop = (index: number) => {
    if (stops.length <= 2) return; // Minimum 2 stops (origin & destination)
    const updated = stops
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, sequenceOrder: idx + 1 }));
    onChange(updated);
  };

  const handleUpdateStop = (index: number, updates: Partial<ShipmentStop>) => {
    const updated = stops.map((s, i) => (i === index ? { ...s, ...updates } : s));
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;
    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;
    const reindexed = newStops.map((s, idx) => ({ ...s, sequenceOrder: idx + 1 }));
    onChange(reindexed);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0F6B3A]" />
            Route Stops (Pickup & Destination)
          </h3>
          <p className="text-[12.5px] text-slate-500">
            Define your origin pickup and final delivery destination. Add optional intermediate waypoints if needed.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddStop}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold text-[#0F6B3A] bg-[#E6F4EA] hover:bg-[#d0ebd6] rounded-xl transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Stop
        </button>
      </div>

      <div className="space-y-4">
        {stops.map((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === stops.length - 1;

          const defaultLabel = isFirst
            ? 'Origin / Pickup Stop'
            : isLast
            ? 'Final Delivery Destination'
            : `Intermediate Waypoint #${index}`;

          return (
            <div key={index} className="relative">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-colors space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        isFirst
                          ? 'bg-[#0F6B3A] text-white'
                          : isLast
                          ? 'bg-indigo-700 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {stop.sequenceOrder}
                    </span>

                    <select
                      value={stop.stopType}
                      onChange={(e) => handleUpdateStop(index, { stopType: e.target.value as StopType })}
                      className="text-[12.5px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F6B3A]"
                    >
                      <option value="PICKUP">Pickup</option>
                      <option value="DROPOFF">Delivery</option>
                      <option value="TRANSIT_WAYPOINT">Waypoint</option>
                    </select>

                    <span className="text-[12px] text-slate-400 font-medium hidden sm:inline">
                      {defaultLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(index, 'up')}
                      aria-label="Move stop up"
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(index, 'down')}
                      aria-label="Move stop down"
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    {stops.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(index)}
                        aria-label="Delete stop"
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Friendly Address & Auto-Geocoding Section */}
                <AddressInputWithGeocode
                  stop={stop}
                  index={index}
                  onChange={(updates) => handleUpdateStop(index, updates)}
                />
              </div>

              {!isLast && (
                <div className="flex justify-center py-1">
                  <div className="w-0.5 h-3 bg-slate-200 rounded" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
