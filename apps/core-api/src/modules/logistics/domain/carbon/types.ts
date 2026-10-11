import { ScopeType } from '@prisma/client';
import { AppError } from '../../../../core/errors/app.error';

/**
 * Valid calculation methods supported for logistics carbon emissions.
 * Standard is GLEC Framework v2/v3 freight calculation (tonne-km * factor).
 */
export type LogisticsCalculationMethod = 'GLEC_TONNE_KM' | 'VEHICLE_KM' | 'FUEL_CONSUMPTION';

/**
 * Normalized activity input for a single physical vehicle or vehicle type assignment.
 */
export interface LogisticsActivityInput {
  vehicleId?: string;
  vehicleTypeId?: string;
  vehicleCategory?: string; // e.g. 'HEAVY_TRUCK', 'ARTICULATED_40T', 'RIGID_7_5T', 'LIGHT_VAN'
  fuelType?: string;        // e.g. 'DIESEL', 'PETROL', 'CNG', 'LNG', 'ELECTRIC'
  distanceKm: number;
  cargoWeightKg: number;
  fuelLiters?: number;
  activityDate?: Date;
  region?: string;
  calculationMethod?: LogisticsCalculationMethod;
}

/**
 * Snapshot of the emission factor used for auditability.
 */
export interface VehicleEmissionFactorDTO {
  id: string;
  category: string;
  subCategory: string;
  factorValue: number;
  unit: string;
  co2eUnit: string;
  sourceSet: string;
  version: number;
}

/**
 * Calculated carbon footprint result for a single vehicle assignment / trip.
 */
export interface VehicleCarbonResult {
  vehicleId?: string;
  vehicleTypeId?: string;
  vehicleCategory?: string;
  fuelType?: string;
  distanceKm: number;
  cargoWeightKg: number;
  activityValue: number;
  activityUnit: string;
  scope: ScopeType;
  co2e: number;
  co2eUnit: string; // Typically 'kgCO2e'
  emissionFactor: VehicleEmissionFactorDTO;
  calculationMethod: string;
  formulaUsed: string;
}

/**
 * Input for evaluating the carbon impact of a full logistics scenario (e.g. from an OptimizationRun).
 */
export interface ScenarioCarbonInput {
  organizationId: string;
  shipmentId: string;
  optimizationRunId?: string;
  scenarioName?: string;
  vehicles: LogisticsActivityInput[];
  region?: string;
  activityDate?: Date;
}

/**
 * Provenance tracking details for audit trails.
 */
export interface LogisticsCarbonProvenance {
  engineVersion: string;
  strategyUsed: string;
  factorSources: string[];
  calculatedAt: Date;
}

/**
 * Aggregated carbon impact result for a complete logistics optimization run or scenario.
 */
export interface LogisticsCarbonImpactResult {
  organizationId: string;
  shipmentId: string;
  optimizationRunId?: string;
  scenarioName?: string;
  vehicles: VehicleCarbonResult[];
  totalCo2e: number;
  co2eUnit: string;
  totalDistanceKm: number;
  totalCargoWeightKg: number;
  totalTonneKm: number;
  vehicleCount: number;
  calculatedAt: Date;
  calculationStatus: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  provenance: LogisticsCarbonProvenance;
}

export type LogisticsCarbonErrorCode =
  | 'EMISSION_FACTOR_NOT_FOUND'
  | 'INVALID_LOGISTICS_ACTIVITY'
  | 'UNSUPPORTED_VEHICLE_TYPE'
  | 'UNSUPPORTED_FUEL_TYPE'
  | 'TENANT_ACCESS_DENIED'
  | 'SHIPMENT_NOT_FOUND'
  | 'CARBON_ENGINE_ERROR';

export class LogisticsCarbonError extends AppError {
  public readonly carbonCode: LogisticsCarbonErrorCode;

  constructor(
    message: string,
    carbonCode: LogisticsCarbonErrorCode,
    statusCode = 400,
    details?: Record<string, string[]>,
  ) {
    const sanitized = message.replace(/(key|token|auth)=[^&\s]+/gi, '$1=***');
    super(sanitized, statusCode, carbonCode, details);
    this.carbonCode = carbonCode;
  }
}
