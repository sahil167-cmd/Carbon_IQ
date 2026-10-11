import { useState, useRef, useCallback } from 'react';
import {
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  AlertCircle,
  X,
} from 'lucide-react';
import LogisticsService from '../../services/logistics.service';
import type { ShipmentStop, GeocodeResult } from '../../types/logistics';

interface AddressInputWithGeocodeProps {
  stop: ShipmentStop;
  index?: number;
  onChange: (updates: Partial<ShipmentStop>) => void;
  label?: string;
}

/**
 * Location search component with candidate picker.
 *
 * CRITICAL RULES (enforced here):
 * 1. Never auto-select a geocode result — the user must click a candidate.
 * 2. Changing the search text immediately clears any previously confirmed location.
 * 3. Do NOT submit stale coordinates from a different query.
 */
export default function AddressInputWithGeocode({
  stop,
  onChange,
  label,
}: AddressInputWithGeocodeProps) {
  const [searchText, setSearchText] = useState(
    stop.city || stop.locationName || stop.addressLine1 || ''
  );
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [confirmedLocation, setConfirmedLocation] = useState<GeocodeResult | null>(
    // Only pre-confirm if coordinates already exist on the stop (e.g. editing existing shipment)
    stop.latitude && stop.longitude
      ? {
          displayName: stop.addressLine1 || stop.locationName || stop.city || 'Saved location',
          city: stop.city || undefined,
          state: stop.state || undefined,
          country: stop.country || 'India',
          latitude: stop.latitude,
          longitude: stop.longitude,
          confidence: 1.0,
        }
      : null
  );
  const [geocodeError, setGeocodeError] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCandidates([]);
      setShowCandidates(false);
      return;
    }
    setIsSearching(true);
    setGeocodeError('');
    try {
      const results = await LogisticsService.geocodeCandidates(query);
      setCandidates(results);
      setShowCandidates(results.length > 0);
      if (results.length === 0) {
        setGeocodeError('No locations found. Try a different name or enter coordinates manually.');
      }
    } catch {
      setGeocodeError('Location search unavailable. Enter coordinates manually.');
      setCandidates([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchText(value);

    // RULE 2: Changing the text invalidates any previously confirmed location
    if (confirmedLocation) {
      setConfirmedLocation(null);
      // Clear coordinates from the stop to prevent stale coords being submitted
      onChange({
        latitude: null,
        longitude: null,
        city: undefined,
        state: undefined,
        addressLine1: undefined,
        locationName: undefined,
      });
    }

    setCandidates([]);
    setShowCandidates(false);
    setGeocodeError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        runSearch(value.trim());
      }, 500);
    }
  };

  // RULE 1: User must explicitly click a candidate
  const handleSelectCandidate = (candidate: GeocodeResult) => {
    setConfirmedLocation(candidate);
    setSearchText(candidate.displayName);
    setCandidates([]);
    setShowCandidates(false);
    setGeocodeError('');

    // Derive a clean addressLine1 from the candidate
    const addressLine1 = candidate.displayName;

    onChange({
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      city: candidate.city || undefined,
      state: candidate.state || undefined,
      country: candidate.country || 'India',
      addressLine1,
      locationName: candidate.city || candidate.displayName,
    });
  };

  const handleClearLocation = () => {
    setSearchText('');
    setConfirmedLocation(null);
    setCandidates([]);
    setShowCandidates(false);
    setGeocodeError('');
    onChange({
      latitude: null,
      longitude: null,
      city: undefined,
      state: undefined,
      addressLine1: undefined,
      locationName: undefined,
    });
  };

  const formatCandidateLabel = (c: GeocodeResult): string => {
    // Build a short readable label: "City, State, Country"
    const parts: string[] = [];
    if (c.city) parts.push(c.city);
    if (c.state && c.state !== c.city) parts.push(c.state);
    if (c.country && c.country !== 'India') parts.push(c.country);
    else if (parts.length < 2) parts.push('India');
    return parts.join(', ');
  };

  const formatCandidatePrimary = (c: GeocodeResult): string => {
    // First line: the location name (city or first segment of displayName)
    return c.city || c.displayName.split(',')[0].trim();
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {label && (
        <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#0F6B3A]" />
          {label}
        </div>
      )}

      {/* Search Field */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (candidates.length > 0) setShowCandidates(true);
            }}
            onBlur={() => {
              // Small delay so click on candidate registers first
              setTimeout(() => setShowCandidates(false), 150);
            }}
            placeholder={`Search city or location…`}
            className={`w-full text-[13.5px] pl-9 pr-10 py-2.5 rounded-xl border transition-all outline-none ${
              confirmedLocation
                ? 'border-emerald-400 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-300/40'
                : 'border-slate-200 bg-white focus:ring-2 focus:ring-[#0F6B3A]/10 focus:border-[#0F6B3A]'
            }`}
          />
          {/* Clear button */}
          {searchText && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear location"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0F6B3A]" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Candidate Dropdown */}
        {showCandidates && candidates.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Select a location
            </div>
            {candidates.map((candidate, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur from firing before click
                  handleSelectCandidate(candidate);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 hover:border-l-2 hover:border-emerald-500 transition-all flex items-start gap-3 group border-b border-slate-50 last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 group-hover:text-emerald-700" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900 truncate">
                    {formatCandidatePrimary(candidate)}
                  </div>
                  <div className="text-[11.5px] text-slate-500 truncate">
                    {formatCandidateLabel(candidate)}
                  </div>
                </div>
                {candidate.confidence >= 0.98 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                    Verified
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Confirmed Location Banner */}
        {confirmedLocation ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[12px] font-medium shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">✓ Location confirmed</span>
              <span className="text-emerald-700 mx-1.5">·</span>
              <span className="text-emerald-700">
                {confirmedLocation.city && confirmedLocation.state
                  ? `${confirmedLocation.city}, ${confirmedLocation.state}`
                  : confirmedLocation.displayName.split(',').slice(0, 2).join(',')}
              </span>
              <span className="text-emerald-500 font-mono text-[10.5px] ml-2">
                {confirmedLocation.latitude.toFixed(4)}, {confirmedLocation.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        ) : geocodeError ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{geocodeError}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <Search className="w-3 h-3" />
            <span>Type a city name and select from suggestions</span>
          </div>
        )}

        {/* Manual coordinates toggle */}
        <button
          type="button"
          onClick={() => setShowManualCoords(!showManualCoords)}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1 px-2 rounded hover:bg-slate-100"
        >
          <span>Enter coordinates manually</span>
          {showManualCoords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Manual Coordinates Accordion */}
      {showManualCoords && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="text-[11px] text-slate-500 font-medium">
            Enter precise GPS coordinates if you know them exactly. These override the location search.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Latitude (−90 to +90)
              </label>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={stop.latitude ?? ''}
                onChange={(e) => {
                  const lat = e.target.value === '' ? null : parseFloat(e.target.value);
                  // Manual entry counts as confirmed
                  if (lat !== null && stop.longitude != null) {
                    setConfirmedLocation({
                      displayName: `Manual coordinates (${lat?.toFixed(4)}, ${stop.longitude?.toFixed(4)})`,
                      city: stop.city || undefined,
                      state: stop.state || undefined,
                      country: stop.country || 'India',
                      latitude: lat,
                      longitude: stop.longitude,
                      confidence: 1.0,
                    });
                  }
                  onChange({ latitude: lat });
                }}
                placeholder="e.g. 18.7537"
                className="w-full text-[12.5px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-[#0F6B3A] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Longitude (−180 to +180)
              </label>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={stop.longitude ?? ''}
                onChange={(e) => {
                  const lon = e.target.value === '' ? null : parseFloat(e.target.value);
                  if (lon !== null && stop.latitude != null) {
                    setConfirmedLocation({
                      displayName: `Manual coordinates (${stop.latitude?.toFixed(4)}, ${lon?.toFixed(4)})`,
                      city: stop.city || undefined,
                      state: stop.state || undefined,
                      country: stop.country || 'India',
                      latitude: stop.latitude,
                      longitude: lon,
                      confidence: 1.0,
                    });
                  }
                  onChange({ longitude: lon });
                }}
                placeholder="e.g. 73.4073"
                className="w-full text-[12.5px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-[#0F6B3A] outline-none"
              />
            </div>
          </div>
          {stop.latitude && stop.longitude && (
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Coordinates set: {Number(stop.latitude).toFixed(6)}, {Number(stop.longitude).toFixed(6)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
