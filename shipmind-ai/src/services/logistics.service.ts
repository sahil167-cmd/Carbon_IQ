import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api-client';
import type {
  Shipment,
  CargoItem,
  PaginatedList,
  CreateShipmentInput,
  UpdateShipmentInput,
  CreateCargoItemInput,
  UpdateCargoItemInput,
  OptimizeShipmentRequest,
  FleetOptimizationResult,
  PersistedOptimizationRun,
  RouteResult,
  TrafficETAResult,
  LogisticsCarbonImpactResult,
  EvaluatedScenarioSummary,
  ScenarioComparisonResult,
  CreateScenarioRequest,
  CompareScenariosRequest,
  GeocodeResult,
} from '../types/logistics';

export interface ListShipmentsParams {
  status?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

function normalizeShipment(s: any): Shipment {
  if (!s) return s;
  return {
    ...s,
    stops: s.stops || s.shipmentStops || [],
    totalWeightKg:
      s.totalWeightKg != null
        ? Number(s.totalWeightKg)
        : s.totalWeight != null
        ? Number(s.totalWeight)
        : 0,
    totalVolumeM3:
      s.totalVolumeM3 != null
        ? Number(s.totalVolumeM3)
        : s.totalVolume != null
        ? Number(s.totalVolume)
        : 0,
    cargoItemsCount:
      s.cargoItemsCount ??
      s.totalItemsCount ??
      s._count?.cargoItems ??
      (s.cargoItems ? s.cargoItems.length : 0),
  };
}

/**
 * Logistics API Service
 * Interacts with CarbonIQ backend endpoints mounted at /api/v1/logistics
 */
export const LogisticsService = {
  /**
   * List shipments with pagination and optional status filter
   */
  async listShipments(params?: ListShipmentsParams): Promise<PaginatedList<Shipment>> {
    const res = await apiGet<PaginatedList<Shipment>>('/api/v1/logistics/shipments', params as Record<string, unknown>);
    if (res && res.items) {
      return {
        ...res,
        items: res.items.map(normalizeShipment),
      };
    }
    return res;
  },

  /**
   * Retrieve a single shipment with stops, cargo items, and optimization runs
   */
  async getShipment(id: string): Promise<Shipment> {
    const res = await apiGet<Shipment>(`/api/v1/logistics/shipments/${id}`);
    return normalizeShipment(res);
  },

  /**
   * Create a new shipment with optional stops
   */
  async createShipment(data: CreateShipmentInput): Promise<Shipment> {
    const res = await apiPost<Shipment>('/api/v1/logistics/shipments', data);
    return normalizeShipment(res);
  },

  /**
   * Update shipment metadata or status
   */
  async updateShipment(id: string, data: UpdateShipmentInput): Promise<Shipment> {
    const res = await apiPatch<Shipment>(`/api/v1/logistics/shipments/${id}`, data);
    return normalizeShipment(res);
  },

  /**
   * Add a cargo item to an existing shipment
   * Backend automatically recalculates total shipment weight and volume
   */
  async addCargoItem(
    shipmentId: string,
    data: CreateCargoItemInput
  ): Promise<{ cargoItem: CargoItem; shipmentTotals: { totalWeightKg: number; totalVolumeM3: number } }> {
    const res = await apiPost<any>(
      `/api/v1/logistics/shipments/${shipmentId}/cargo`,
      data
    );
    if (res && res.cargoItem) {
      return res;
    }
    return {
      cargoItem: res as CargoItem,
      shipmentTotals: {
        totalWeightKg: Number(res?.totalWeight || 0),
        totalVolumeM3: Number(res?.totalVolume || 0),
      },
    };
  },

  /**
   * Update a cargo item's dimensions, weight, or constraints
   */
  async updateCargoItem(
    shipmentId: string,
    cargoId: string,
    data: UpdateCargoItemInput
  ): Promise<{ cargoItem: CargoItem; shipmentTotals: { totalWeightKg: number; totalVolumeM3: number } }> {
    const res = await apiPatch<any>(
      `/api/v1/logistics/shipments/${shipmentId}/cargo/${cargoId}`,
      data
    );
    if (res && res.cargoItem) {
      return res;
    }
    return {
      cargoItem: res as CargoItem,
      shipmentTotals: {
        totalWeightKg: Number(res?.totalWeight || 0),
        totalVolumeM3: Number(res?.totalVolume || 0),
      },
    };
  },

  /**
   * Remove a cargo item from a shipment
   */
  async deleteCargoItem(
    shipmentId: string,
    cargoId: string
  ): Promise<{ deleted: boolean; cargoId: string; shipmentTotals: { totalWeightKg: number; totalVolumeM3: number } }> {
    const res = await apiDelete<any>(
      `/api/v1/logistics/shipments/${shipmentId}/cargo/${cargoId}`
    );
    if (res && typeof res.deleted === 'boolean') {
      return res;
    }
    return {
      deleted: true,
      cargoId,
      shipmentTotals: {
        totalWeightKg: 0,
        totalVolumeM3: 0,
      },
    };
  },

  /**
   * Execute multi-objective bounded fleet optimization for a shipment
   */
  async optimizeShipment(
    shipmentId: string,
    request?: OptimizeShipmentRequest
  ): Promise<FleetOptimizationResult> {
    return apiPost<FleetOptimizationResult>(
      `/api/v1/logistics/shipments/${shipmentId}/optimize`,
      request || {}
    );
  },

  /**
   * Retrieve a persisted optimization run and associated multi-vehicle load plans
   */
  async getOptimizationResult(id: string): Promise<PersistedOptimizationRun> {
    return apiGet<PersistedOptimizationRun>(`/api/v1/logistics/optimizations/${id}`);
  },

  /**
   * Retrieve calculated real road route for a shipment (OpenRouteService via backend)
   */
  async getShipmentRoute(shipmentId: string, profile?: string): Promise<RouteResult> {
    const params = profile ? { profile } : undefined;
    return apiGet<RouteResult>(`/api/v1/logistics/shipments/${shipmentId}/route`, params);
  },

  /**
   * Retrieve traffic-aware ETA and congestion assessment for a shipment
   */
  async getShipmentTrafficETA(
    shipmentId: string,
    params?: { departureTime?: string; profile?: string }
  ): Promise<TrafficETAResult> {
    return apiGet<TrafficETAResult>(
      `/api/v1/logistics/shipments/${shipmentId}/traffic-eta`,
      params as Record<string, unknown>
    );
  },

  /**
   * Retrieve calculated real carbon footprint for a shipment via Carbon Engine
   */
  async getShipmentCarbon(
    shipmentId: string,
    params?: { optimizationRunId?: string; region?: string; distanceKm?: number }
  ): Promise<LogisticsCarbonImpactResult> {
    return apiGet<LogisticsCarbonImpactResult>(
      `/api/v1/logistics/shipments/${shipmentId}/carbon`,
      params as Record<string, unknown>
    );
  },

  /**
   * List all saved scenarios / optimization runs for a shipment
   */
  async getShipmentScenarios(shipmentId: string): Promise<EvaluatedScenarioSummary[]> {
    return apiGet<EvaluatedScenarioSummary[]>(
      `/api/v1/logistics/shipments/${shipmentId}/scenarios`
    );
  },

  /**
   * Run what-if fleet optimization and save as a named scenario
   */
  async createShipmentScenario(
    shipmentId: string,
    payload: CreateScenarioRequest
  ): Promise<EvaluatedScenarioSummary> {
    return apiPost<EvaluatedScenarioSummary>(
      `/api/v1/logistics/shipments/${shipmentId}/scenarios`,
      payload
    );
  },

  /**
   * Compare baseline scenario against one or more target scenarios
   */
  async compareShipmentScenarios(
    shipmentId: string,
    payload: CompareScenariosRequest
  ): Promise<ScenarioComparisonResult> {
    return apiPost<ScenarioComparisonResult>(
      `/api/v1/logistics/shipments/${shipmentId}/scenarios/compare`,
      payload
    );
  },

  /**
   * Geocodes a location query and returns up to 5 ranked candidates.
   * The UI MUST display these to the user — do NOT auto-select.
   */
  async geocodeCandidates(query: string): Promise<GeocodeResult[]> {
    try {
      const res = await apiGet<{ candidates: GeocodeResult[] }>(
        `/api/v1/logistics/geocode?q=${encodeURIComponent(query)}`
      );
      if (res && Array.isArray(res.candidates)) {
        return res.candidates;
      }
      // Handle legacy single-result response shape gracefully
      if (res && typeof (res as any).latitude === 'number') {
        return [res as unknown as GeocodeResult];
      }
      return [];
    } catch {
      return [];
    }
  },
};

export default LogisticsService;
