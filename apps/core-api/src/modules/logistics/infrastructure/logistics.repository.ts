import {
  PrismaClient,
  Vehicle,
  VehicleType,
  Shipment,
  CargoItem,
  ShipmentStop,
  OptimizationRun,
  LoadPlan,
  RoutePlan,
  CalculatedEmissions,
  OptimizationStatus,
  Prisma,
  VehicleBodyType,
  VehicleFuelType,
} from '@prisma/client';
import { TenantScopedRepository } from '../../../core/repository/tenant-scoped.repository';
import { NotFoundError } from '../../../core/errors/app.error';

export type ShipmentWithCargoAndStops = Shipment & {
  cargoItems: CargoItem[];
  shipmentStops: ShipmentStop[];
  stops: ShipmentStop[];
};

export type VehicleWithSpecification = Vehicle & {
  vehicleType: VehicleType;
};

export type LoadPlanWithVehicle = LoadPlan & {
  vehicleType?: VehicleType | null;
  vehicle?: (Vehicle & { vehicleType?: VehicleType | null }) | null;
};

export type LoadPlanWithVehicleAndRoute = LoadPlanWithVehicle & {
  routePlan?: (RoutePlan & { calculatedEmissions?: CalculatedEmissions | null }) | null;
};

/**
 * LogisticsRepository
 *
 * Implements tenant-isolated data retrieval for vehicles, specifications,
 * shipments, and cargo items.
 *
 * Tenant boundary enforcement:
 * - findByIdScoped returns 404 (never 403) for cross-tenant access.
 * - Global vehicle types (organizationId === null) are accessible across tenants,
 *   while custom vehicle types require organizationId === this.organizationId.
 */
export class LogisticsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaClient, organizationId?: string) {
    super(prisma, organizationId);
  }

  /**
   * Retrieves a VehicleType specification template.
   * Accessible if it belongs to the tenant OR is a global system template (organizationId === null).
   */
  public async findVehicleTypeById(id: string): Promise<VehicleType> {
    const vehicleType = await this.prisma.vehicleType.findFirst({
      where: {
        id,
        OR: [
          { organizationId: this.organizationId },
          { organizationId: null },
        ],
      },
    });

    if (!vehicleType) {
      throw new NotFoundError('VehicleType');
    }

    return vehicleType;
  }

  /**
   * Lists all global approved vehicle specifications (organizationId === null).
   */
  public async listGlobalVehicleTypes(): Promise<VehicleType[]> {
    return this.prisma.vehicleType.findMany({
      where: {
        organizationId: null,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Lists organization-specific custom vehicle specifications.
   */
  public async listTenantVehicleTypes(): Promise<VehicleType[]> {
    return this.prisma.vehicleType.findMany({
      where: {
        organizationId: this.organizationId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Lists all accessible vehicle specifications (Global approved templates + Tenant custom).
   */
  public async listAccessibleVehicleTypes(): Promise<VehicleType[]> {
    return this.prisma.vehicleType.findMany({
      where: {
        OR: [
          { organizationId: this.organizationId },
          { organizationId: null },
        ],
        isActive: true,
      },
      orderBy: [{ organizationId: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Retrieves a physical vehicle instance in the tenant's fleet, including its VehicleType.
   * Strictly tenant-scoped (must belong to this.organizationId).
   */
  public async findVehicleById(id: string): Promise<VehicleWithSpecification> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: this.scopedWhere({ id }),
      include: {
        vehicleType: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle');
    }

    return vehicle;
  }

  /**
   * Lists physical fleet vehicles belonging to the current tenant.
   */
  public async listTenantVehicles(): Promise<VehicleWithSpecification[]> {
    return this.prisma.vehicle.findMany({
      where: this.scopedWhere({ isActive: true }),
      include: {
        vehicleType: true,
      },
      orderBy: { registrationNumber: 'asc' },
    });
  }

  /**
   * Searches for candidate duplicate VehicleTypes within the target scope.
   * Target scope: global (organizationId === null) if isGlobal is true, or tenant-scoped (this.organizationId).
   */
  public async findMatchingVehicleTypes(criteria: {
    make?: string | null;
    model?: string | null;
    variant?: string | null;
    bodyType?: VehicleBodyType;
    fuelType?: VehicleFuelType;
    isGlobal?: boolean;
  }): Promise<VehicleType[]> {
    const targetOrgId = criteria.isGlobal ? null : (this.organizationId || null);

    const where: Prisma.VehicleTypeWhereInput = {
      organizationId: targetOrgId,
      isActive: true,
    };

    if (criteria.make) {
      where.make = { equals: criteria.make, mode: 'insensitive' };
    }
    if (criteria.model) {
      where.model = { equals: criteria.model, mode: 'insensitive' };
    }
    if (criteria.variant) {
      where.variant = { equals: criteria.variant, mode: 'insensitive' };
    }
    if (criteria.bodyType) {
      where.bodyType = criteria.bodyType;
    }
    if (criteria.fuelType) {
      where.fuelType = criteria.fuelType;
    }

    return this.prisma.vehicleType.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates a VehicleType specification.
   * If isGlobal is true or organizationId is explicitly null, creates a global template.
   * Otherwise, assigns to the repository's tenant organizationId.
   */
  public async createVehicleType(
    data: Omit<Prisma.VehicleTypeUncheckedCreateInput, 'organizationId'> & { organizationId?: string | null },
  ): Promise<VehicleType> {
    const targetOrgId = data.organizationId !== undefined
      ? data.organizationId
      : (this.organizationId || null);

    return this.prisma.vehicleType.create({
      data: {
        ...data,
        organizationId: targetOrgId,
      },
    });
  }

  /**
   * Updates an existing VehicleType specification within its authorized scope.
   * Cross-tenant update attempts throw NotFoundError (never 403).
   */
  public async updateVehicleType(
    id: string,
    data: Prisma.VehicleTypeUpdateInput,
    isGlobal = false,
  ): Promise<VehicleType> {
    const targetOrgId = isGlobal ? null : (this.organizationId || null);

    // Verify existing record is in target scope
    const existing = await this.prisma.vehicleType.findFirst({
      where: {
        id,
        organizationId: targetOrgId,
      },
    });

    if (!existing) {
      throw new NotFoundError('VehicleType');
    }

    return this.prisma.vehicleType.update({
      where: { id },
      data,
    });
  }

  /**
   * Creates a physical Vehicle in the tenant fleet.
   */
  public async createVehicle(
    data: Omit<Prisma.VehicleUncheckedCreateInput, 'organizationId'>,
  ): Promise<Vehicle> {
    return this.prisma.vehicle.create({
      data: {
        ...data,
        organizationId: this.organizationId,
      },
    });
  }

  /**
   * Retrieves a shipment with all its cargo items and stops.
   * Strictly tenant-scoped (must belong to this.organizationId).
   */
  public async findShipmentWithCargo(id: string): Promise<ShipmentWithCargoAndStops> {
    const shipment = await this.prisma.shipment.findFirst({
      where: this.scopedWhere({ id }),
      include: {
        cargoItems: true,
        shipmentStops: {
          orderBy: { stopSequence: 'asc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    return {
      ...shipment,
      stops: shipment.shipmentStops,
    };
  }

  /**
   * Retrieves a single cargo item by ID within the tenant.
   */
  public async findCargoItemById(id: string): Promise<CargoItem> {
    return this.findByIdScoped(this.prisma.cargoItem, id, 'CargoItem');
  }

  /**
   * Creates an OptimizationRun along with its associated multi-vehicle LoadPlans.
   * Strictly tenant-scoped (sets organizationId to this.organizationId).
   */
  public async createOptimizationRunWithLoadPlans(data: {
    shipmentId: string;
    scenarioName?: string;
    status?: OptimizationStatus;
    algorithmVersion: string;
    parametersJson?: Prisma.InputJsonValue;
    baselineTruckCount?: number;
    optimizedTruckCount?: number;
    totalLoadedWeightKg?: Prisma.Decimal | number;
    totalLoadedVolumeM3?: Prisma.Decimal | number;
    overallVolumeUtilizationPct?: Prisma.Decimal | number;
    overallWeightUtilizationPct?: Prisma.Decimal | number;
    unassignedItemsCount?: number;
    violationsCount?: number;
    violationsJson?: Prisma.InputJsonValue;
    executionTimeMs?: number;
    loadPlans: Array<{
      vehicleSequence: number;
      vehicleTypeId?: string | null;
      vehicleId?: string | null;
      loadedWeightKg: Prisma.Decimal | number;
      loadedVolumeM3: Prisma.Decimal | number;
      weightUtilizationPct: Prisma.Decimal | number;
      volumeUtilizationPct: Prisma.Decimal | number;
      placementsJson: Prisma.InputJsonValue;
    }>;
  }): Promise<OptimizationRun & { loadPlans: LoadPlan[] }> {
    // Validate shipment exists and belongs to this tenant
    await this.findByIdScoped(this.prisma.shipment, data.shipmentId, 'Shipment');

    return this.prisma.optimizationRun.create({
      data: {
        organizationId: this.organizationId,
        shipmentId: data.shipmentId,
        scenarioName: data.scenarioName || 'Fleet Allocation Plan',
        status: data.status || OptimizationStatus.COMPLETED,
        algorithmVersion: data.algorithmVersion,
        parametersJson: (data.parametersJson as any) ?? undefined,
        baselineTruckCount: data.baselineTruckCount,
        optimizedTruckCount: data.optimizedTruckCount,
        totalLoadedWeightKg: data.totalLoadedWeightKg != null ? new Prisma.Decimal(data.totalLoadedWeightKg) : null,
        totalLoadedVolumeM3: data.totalLoadedVolumeM3 != null ? new Prisma.Decimal(data.totalLoadedVolumeM3) : null,
        overallVolumeUtilizationPct: data.overallVolumeUtilizationPct != null ? new Prisma.Decimal(data.overallVolumeUtilizationPct) : null,
        overallWeightUtilizationPct: data.overallWeightUtilizationPct != null ? new Prisma.Decimal(data.overallWeightUtilizationPct) : null,
        unassignedItemsCount: data.unassignedItemsCount ?? 0,
        violationsCount: data.violationsCount ?? 0,
        violationsJson: data.violationsJson,
        executionTimeMs: data.executionTimeMs,
        loadPlans: {
          create: data.loadPlans.map((lp) => ({
            vehicleSequence: lp.vehicleSequence,
            vehicleTypeId: lp.vehicleTypeId ?? null,
            vehicleId: lp.vehicleId ?? null,
            loadedWeightKg: new Prisma.Decimal(lp.loadedWeightKg),
            loadedVolumeM3: new Prisma.Decimal(lp.loadedVolumeM3),
            weightUtilizationPct: new Prisma.Decimal(lp.weightUtilizationPct),
            volumeUtilizationPct: new Prisma.Decimal(lp.volumeUtilizationPct),
            placementsJson: lp.placementsJson,
          })),
        },
      },
      include: {
        loadPlans: {
          orderBy: { vehicleSequence: 'asc' },
        },
      },
    }) as any;
  }

  /**
   * Retrieves an OptimizationRun with its LoadPlans, Vehicle Specifications, and Route Plans, strictly scoped to this tenant.
   */
  public async findOptimizationRunById(id: string): Promise<OptimizationRun & { loadPlans: LoadPlanWithVehicleAndRoute[] }> {
    const run = await this.prisma.optimizationRun.findFirst({
      where: this.scopedWhere({ id }),
      include: {
        loadPlans: {
          orderBy: { vehicleSequence: 'asc' },
          include: {
            vehicleType: true,
            vehicle: {
              include: {
                vehicleType: true,
              },
            },
            routePlan: {
              include: {
                calculatedEmissions: true,
              },
            },
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundError('OptimizationRun');
    }

    return run as any;
  }

  /**
   * Lists all OptimizationRuns for a shipment with load plans, vehicles, routes, and emissions.
   * Strictly tenant-scoped. Throws NotFoundError (404) if shipment does not belong to tenant.
   */
  public async listOptimizationRunsByShipmentId(
    shipmentId: string,
  ): Promise<Array<OptimizationRun & { loadPlans: LoadPlanWithVehicleAndRoute[] }>> {
    // Validate shipment exists and belongs to this tenant
    await this.findByIdScoped(this.prisma.shipment, shipmentId, 'Shipment');

    const runs = await this.prisma.optimizationRun.findMany({
      where: this.scopedWhere({ shipmentId }),
      orderBy: { createdAt: 'desc' },
      include: {
        loadPlans: {
          orderBy: { vehicleSequence: 'asc' },
          include: {
            vehicleType: true,
            vehicle: {
              include: {
                vehicleType: true,
              },
            },
            routePlan: {
              include: {
                calculatedEmissions: true,
              },
            },
          },
        },
      },
    });

    return runs as any;
  }
}
