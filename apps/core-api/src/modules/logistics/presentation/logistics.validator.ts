import { z } from 'zod';
import {
  ShipmentStatus,
  StopType,
  DimensionUnit,
  WeightUnit,
} from '@prisma/client';

export const stopSchema = z.object({
  stopSequence: z.number().int().min(1).max(50),
  stopType: z.nativeEnum(StopType).optional().default(StopType.PICKUP),
  facilityName: z.string().max(255).optional(),
  addressLine1: z.string().max(255).optional().default(''),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(50).optional(),
  country: z.string().min(1, 'country is required').max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timeWindowStart: z.string().datetime().optional(),
  timeWindowEnd: z.string().datetime().optional(),
  specialInstructions: z.string().max(1000).optional(),
  siteId: z.string().max(100).optional(),
});

export const createShipmentSchema = z.object({
  shipmentNumber: z.string().max(100).optional(),
  referenceNumber: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  plannedPickupDate: z.string().datetime().optional(),
  plannedDeliveryDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
  stops: z.array(stopSchema).max(50, 'Shipment cannot exceed 50 stops').optional(),
});

export const updateShipmentSchema = z.object({
  status: z.nativeEnum(ShipmentStatus).optional(),
  referenceNumber: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  plannedPickupDate: z.string().datetime().optional(),
  plannedDeliveryDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

export const createCargoItemSchema = z.object({
  sku: z.string().max(100).optional(),
  description: z.string().min(1, 'Cargo description is required').max(500),
  packageType: z.string().max(50).optional().default('BOX'),
  quantity: z.number().int().positive().max(1000, 'Quantity cannot exceed 1000 units per cargo line').default(1),
  length: z.number().positive('length must be positive').max(100000, 'length cannot exceed 100,000 mm'),
  width: z.number().positive('width must be positive').max(100000, 'width cannot exceed 100,000 mm'),
  height: z.number().positive('height must be positive').max(100000, 'height cannot exceed 100,000 mm'),
  dimensionUnit: z.nativeEnum(DimensionUnit).optional().default(DimensionUnit.CM),
  unitWeight: z.number().positive('unitWeight must be positive').max(500000, 'unitWeight cannot exceed 500,000 kg'),
  weightUnit: z.nativeEnum(WeightUnit).optional().default(WeightUnit.KG),
  isStackable: z.boolean().optional().default(true),
  maxStackWeight: z.number().positive().max(500000).optional(),
  maxStackTiers: z.number().int().positive().max(20).optional(),
  isFragile: z.boolean().optional().default(false),
  allowRotationHorizontal: z.boolean().optional().default(true),
  allowRotationVertical: z.boolean().optional().default(false),
  allowedOrientations: z.array(z.string().max(20)).max(6).optional(),
  loadingPriority: z.number().int().min(1).max(100).optional().default(1),
  unloadingSequence: z.number().int().min(1).max(100).optional().default(1),
  pickupStopId: z.string().max(100).optional(),
  dropoffStopId: z.string().max(100).optional(),
});

export const updateCargoItemSchema = createCargoItemSchema.partial();

export const optimizeShipmentSchema = z.object({
  vehicleIds: z.array(z.string().max(100)).max(100).optional(),
  vehicleTypeIds: z.array(z.string().max(100)).max(50).optional(),
  scenarioName: z.string().max(200).optional(),
  persistOptimizationRun: z.boolean().optional().default(true),
  options: z
    .object({
      maxVehiclesToConsider: z.number().int().min(1).max(20, 'maxVehiclesToConsider cannot exceed 20').optional(),
      maxCandidateSolutions: z.number().int().min(1).max(500, 'maxCandidateSolutions cannot exceed 500').optional(),
      maxExecutionTimeMs: z.number().int().min(500).max(30000, 'maxExecutionTimeMs cannot exceed 30,000ms').optional(),
      allowMultiVehicleFallback: z.boolean().optional(),
    })
    .optional(),
});

export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const calculateDirectRouteSchema = z.object({
  origin: coordinateSchema,
  destination: coordinateSchema,
  waypoints: z.array(coordinateSchema).max(25, 'Route cannot exceed 25 waypoints').optional(),
  profile: z.enum(['driving-car', 'driving-hgv']).optional(),
});

export const scenarioCarbonSchema = z.object({
  scenarioName: z.string().max(200).optional(),
  region: z.string().max(100).optional(),
  activityDate: z.string().datetime().optional(),
  vehicles: z.array(
    z.object({
      vehicleId: z.string().max(100).optional(),
      vehicleTypeId: z.string().max(100).optional(),
      vehicleCategory: z.string().max(100).optional(),
      fuelType: z.string().max(50).optional(),
      distanceKm: z.number().min(0, 'distanceKm must be non-negative').max(100000),
      cargoWeightKg: z.number().min(0, 'cargoWeightKg must be non-negative').max(500000),
      fuelLiters: z.number().min(0).max(100000).optional(),
      calculationMethod: z.enum(['GLEC_TONNE_KM', 'VEHICLE_KM', 'FUEL_CONSUMPTION']).optional(),
    }),
  ).min(1, 'At least one vehicle must be provided in scenario').max(100, 'Scenario cannot exceed 100 vehicle entries'),
});

export const createScenarioSchema = z.object({
  scenarioName: z.string().min(1, 'scenarioName is required').max(200),
  vehicleIds: z.array(z.string().max(100)).max(100).optional(),
  vehicleTypeIds: z.array(z.string().max(100)).max(50).optional(),
  options: z
    .object({
      maxVehiclesToConsider: z.number().int().min(1).max(20, 'maxVehiclesToConsider cannot exceed 20').optional(),
      maxCandidateSolutions: z.number().int().min(1).max(500, 'maxCandidateSolutions cannot exceed 500').optional(),
      maxExecutionTimeMs: z.number().int().min(500).max(30000, 'maxExecutionTimeMs cannot exceed 30,000ms').optional(),
      allowMultiVehicleFallback: z.boolean().optional(),
    })
    .optional(),
});

export const compareScenariosSchema = z.object({
  baselineScenarioId: z.string().min(1, 'baselineScenarioId is required').max(100),
  targetScenarioIds: z.array(z.string().min(1).max(100)).min(1, 'At least one targetScenarioId must be provided').max(20, 'Cannot compare more than 20 scenarios simultaneously'),
});

export type CreateShipmentBody = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentBody = z.infer<typeof updateShipmentSchema>;
export type CreateCargoItemBody = z.infer<typeof createCargoItemSchema>;
export type UpdateCargoItemBody = z.infer<typeof updateCargoItemSchema>;
export type OptimizeShipmentBody = z.infer<typeof optimizeShipmentSchema>;
export type CalculateDirectRouteBody = z.infer<typeof calculateDirectRouteSchema>;
export type ScenarioCarbonBody = z.infer<typeof scenarioCarbonSchema>;
export type CreateScenarioBody = z.infer<typeof createScenarioSchema>;
export type CompareScenariosBody = z.infer<typeof compareScenariosSchema>;
