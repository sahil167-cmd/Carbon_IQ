import {
  PrismaClient,
  Shipment,
  CargoItem,
  ShipmentStatus,
  StopType,
  DimensionUnit,
  WeightUnit,
  VolumeUnit,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../core/errors/app.error';
import { Decimal } from 'decimal.js';

export interface CreateShipmentStopInput {
  stopSequence: number;
  stopType?: StopType;
  facilityName?: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timeWindowStart?: Date | string;
  timeWindowEnd?: Date | string;
  specialInstructions?: string;
  siteId?: string;
}

export interface CreateShipmentInput {
  shipmentNumber?: string;
  referenceNumber?: string;
  description?: string;
  plannedPickupDate?: Date | string;
  plannedDeliveryDate?: Date | string;
  metadata?: Record<string, any>;
  stops?: CreateShipmentStopInput[];
}

export interface UpdateShipmentInput {
  status?: ShipmentStatus;
  referenceNumber?: string;
  description?: string;
  plannedPickupDate?: Date | string;
  plannedDeliveryDate?: Date | string;
  metadata?: Record<string, any>;
}

export interface CreateCargoItemInput {
  sku?: string;
  description: string;
  packageType?: string;
  quantity?: number;
  length: number;
  width: number;
  height: number;
  dimensionUnit?: DimensionUnit;
  unitWeight: number;
  weightUnit?: WeightUnit;
  isStackable?: boolean;
  maxStackWeight?: number;
  maxStackTiers?: number;
  isFragile?: boolean;
  allowRotationHorizontal?: boolean;
  allowRotationVertical?: boolean;
  allowedOrientations?: string[];
  loadingPriority?: number;
  unloadingSequence?: number;
  pickupStopId?: string;
  dropoffStopId?: string;
}

export interface UpdateCargoItemInput {
  sku?: string;
  description?: string;
  packageType?: string;
  quantity?: number;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: DimensionUnit;
  unitWeight?: number;
  weightUnit?: WeightUnit;
  isStackable?: boolean;
  maxStackWeight?: number;
  maxStackTiers?: number;
  isFragile?: boolean;
  allowRotationHorizontal?: boolean;
  allowRotationVertical?: boolean;
  allowedOrientations?: string[];
  loadingPriority?: number;
  unloadingSequence?: number;
  pickupStopId?: string;
  dropoffStopId?: string;
}

export class ShipmentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly organizationId: string,
  ) {}

  private mapShipmentResponse(s: any): any {
    if (!s) return s;
    const stops = s.shipmentStops || s.stops || [];
    const totalWeightKg =
      s.totalWeightKg != null
        ? Number(s.totalWeightKg)
        : s.totalWeight != null
        ? Number(s.totalWeight)
        : 0;
    const totalVolumeM3 =
      s.totalVolumeM3 != null
        ? Number(s.totalVolumeM3)
        : s.totalVolume != null
        ? Number(s.totalVolume)
        : 0;
    const cargoItemsCount =
      s.cargoItemsCount ??
      s.totalItemsCount ??
      s._count?.cargoItems ??
      (s.cargoItems ? s.cargoItems.length : 0);

    return {
      ...s,
      stops,
      totalWeightKg,
      totalVolumeM3,
      cargoItemsCount,
    };
  }

  // ── Shipment Operations ───────────────────────────────────────────────────

  public async createShipment(userId: string, input: CreateShipmentInput): Promise<Shipment> {
    const shipmentNumber =
      input.shipmentNumber || `SHP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          organizationId: this.organizationId,
          shipmentNumber,
          referenceNumber: input.referenceNumber,
          description: input.description,
          plannedPickupDate: input.plannedPickupDate ? new Date(input.plannedPickupDate) : undefined,
          plannedDeliveryDate: input.plannedDeliveryDate ? new Date(input.plannedDeliveryDate) : undefined,
          metadata: input.metadata,
          createdById: userId,
          shipmentStops: input.stops && input.stops.length > 0
            ? {
                create: input.stops.map((s) => ({
                  stopSequence: s.stopSequence,
                  stopType: s.stopType || StopType.PICKUP,
                  facilityName: s.facilityName,
                  addressLine1: s.addressLine1 || s.facilityName || s.city || `Stop ${s.stopSequence}`,
                  addressLine2: s.addressLine2,
                  city: s.city,
                  state: s.state,
                  postalCode: s.postalCode,
                  country: s.country,
                  latitude: s.latitude != null ? new Prisma.Decimal(s.latitude) : null,
                  longitude: s.longitude != null ? new Prisma.Decimal(s.longitude) : null,
                  timeWindowStart: s.timeWindowStart ? new Date(s.timeWindowStart) : null,
                  timeWindowEnd: s.timeWindowEnd ? new Date(s.timeWindowEnd) : null,
                  specialInstructions: s.specialInstructions,
                  siteId: s.siteId || null,
                })),
              }
            : undefined,
        },
        include: {
          shipmentStops: { orderBy: { stopSequence: 'asc' } },
          cargoItems: true,
        },
      });

      return this.mapShipmentResponse(shipment);
    });
  }

  public async listShipments(filter?: { status?: ShipmentStatus; page?: number; limit?: number }) {
    const page = Math.max(1, filter?.page || 1);
    const limit = Math.min(100, Math.max(1, filter?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = {
      organizationId: this.organizationId,
      status: filter?.status,
    };

    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shipmentStops: { orderBy: { stopSequence: 'asc' } },
          _count: { select: { cargoItems: true, optimizationRuns: true } },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      items: items.map((s) => this.mapShipmentResponse(s)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getShipmentById(id: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id,
        organizationId: this.organizationId,
      },
      include: {
        shipmentStops: { orderBy: { stopSequence: 'asc' } },
        cargoItems: { orderBy: { createdAt: 'asc' } },
        optimizationRuns: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            loadPlans: {
              include: {
                vehicle: true,
                vehicleType: true,
                routePlan: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    return this.mapShipmentResponse(shipment);
  }

  public async updateShipment(id: string, input: UpdateShipmentInput): Promise<Shipment> {
    await this.getShipmentById(id); // Asserts existence and tenant boundary

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: input.status,
        referenceNumber: input.referenceNumber,
        description: input.description,
        plannedPickupDate: input.plannedPickupDate ? new Date(input.plannedPickupDate) : undefined,
        plannedDeliveryDate: input.plannedDeliveryDate ? new Date(input.plannedDeliveryDate) : undefined,
        metadata: input.metadata,
      },
      include: {
        shipmentStops: { orderBy: { stopSequence: 'asc' } },
        cargoItems: true,
      },
    });

    return this.mapShipmentResponse(updated);
  }

  // ── Cargo Operations ──────────────────────────────────────────────────────

  public async listCargoItems(shipmentId: string): Promise<CargoItem[]> {
    await this.getShipmentById(shipmentId); // Asserts tenant boundary

    return this.prisma.cargoItem.findMany({
      where: {
        shipmentId,
        organizationId: this.organizationId,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  public async addCargoItem(shipmentId: string, input: CreateCargoItemInput): Promise<CargoItem> {
    await this.getShipmentById(shipmentId); // Asserts tenant boundary

    this.validateCargoInput(input);

    const qty = input.quantity ?? 1;
    const unitWeight = new Decimal(input.unitWeight);
    const totalWeight = unitWeight.mul(qty);

    // Compute volume: length * width * height (cm -> m3 default)
    const dimUnit = input.dimensionUnit || DimensionUnit.CM;
    const unitVolume = this.computeUnitVolumeM3(input.length, input.width, input.height, dimUnit);
    const totalVolume = unitVolume ? unitVolume.mul(qty) : null;

    return this.prisma.$transaction(async (tx) => {
      const cargoItem = await tx.cargoItem.create({
        data: {
          organizationId: this.organizationId,
          shipmentId,
          sku: input.sku,
          description: input.description,
          packageType: input.packageType || 'BOX',
          quantity: qty,
          length: new Prisma.Decimal(input.length),
          width: new Prisma.Decimal(input.width),
          height: new Prisma.Decimal(input.height),
          dimensionUnit: dimUnit,
          unitWeight: new Prisma.Decimal(unitWeight.toNumber()),
          totalWeight: new Prisma.Decimal(totalWeight.toNumber()),
          weightUnit: input.weightUnit || WeightUnit.KG,
          unitVolume: unitVolume ? new Prisma.Decimal(unitVolume.toNumber()) : null,
          totalVolume: totalVolume ? new Prisma.Decimal(totalVolume.toNumber()) : null,
          volumeUnit: VolumeUnit.M3,
          isStackable: input.isStackable ?? true,
          maxStackWeight: input.maxStackWeight != null ? new Prisma.Decimal(input.maxStackWeight) : null,
          maxStackTiers: input.maxStackTiers ?? null,
          isFragile: input.isFragile ?? false,
          allowRotationHorizontal: input.allowRotationHorizontal ?? true,
          allowRotationVertical: input.allowRotationVertical ?? false,
          allowedOrientations: input.allowedOrientations || ['DEFAULT'],
          loadingPriority: input.loadingPriority ?? 1,
          unloadingSequence: input.unloadingSequence ?? 1,
          pickupStopId: input.pickupStopId || null,
          dropoffStopId: input.dropoffStopId || null,
        },
      });

      await this.recalculateShipmentTotals(tx, shipmentId);
      return cargoItem;
    });
  }

  public async updateCargoItem(
    shipmentId: string,
    cargoId: string,
    input: UpdateCargoItemInput,
  ): Promise<CargoItem> {
    await this.getShipmentById(shipmentId); // Asserts tenant boundary

    const existing = await this.prisma.cargoItem.findFirst({
      where: {
        id: cargoId,
        shipmentId,
        organizationId: this.organizationId,
      },
    });

    if (!existing) {
      throw new NotFoundError('CargoItem');
    }

    if (input.length !== undefined || input.width !== undefined || input.height !== undefined || input.unitWeight !== undefined || input.quantity !== undefined) {
      const merged = {
        length: input.length ?? Number(existing.length),
        width: input.width ?? Number(existing.width),
        height: input.height ?? Number(existing.height),
        unitWeight: input.unitWeight ?? Number(existing.unitWeight),
        quantity: input.quantity ?? existing.quantity,
        description: input.description ?? existing.description,
      };
      this.validateCargoInput(merged);
    }

    const qty = input.quantity ?? existing.quantity;
    const unitWeight = input.unitWeight != null ? new Decimal(input.unitWeight) : new Decimal(existing.unitWeight.toString());
    const totalWeight = unitWeight.mul(qty);

    const length = input.length ?? Number(existing.length);
    const width = input.width ?? Number(existing.width);
    const height = input.height ?? Number(existing.height);
    const dimUnit = input.dimensionUnit ?? existing.dimensionUnit;
    const unitVolume = this.computeUnitVolumeM3(length, width, height, dimUnit);
    const totalVolume = unitVolume ? unitVolume.mul(qty) : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.cargoItem.update({
        where: { id: cargoId },
        data: {
          sku: input.sku,
          description: input.description,
          packageType: input.packageType,
          quantity: qty,
          length: input.length != null ? new Prisma.Decimal(input.length) : undefined,
          width: input.width != null ? new Prisma.Decimal(input.width) : undefined,
          height: input.height != null ? new Prisma.Decimal(input.height) : undefined,
          dimensionUnit: input.dimensionUnit,
          unitWeight: input.unitWeight != null ? new Prisma.Decimal(input.unitWeight) : undefined,
          totalWeight: new Prisma.Decimal(totalWeight.toNumber()),
          weightUnit: input.weightUnit,
          unitVolume: unitVolume ? new Prisma.Decimal(unitVolume.toNumber()) : undefined,
          totalVolume: totalVolume ? new Prisma.Decimal(totalVolume.toNumber()) : undefined,
          isStackable: input.isStackable,
          maxStackWeight: input.maxStackWeight != null ? new Prisma.Decimal(input.maxStackWeight) : undefined,
          maxStackTiers: input.maxStackTiers,
          isFragile: input.isFragile,
          allowRotationHorizontal: input.allowRotationHorizontal,
          allowRotationVertical: input.allowRotationVertical,
          allowedOrientations: input.allowedOrientations,
          loadingPriority: input.loadingPriority,
          unloadingSequence: input.unloadingSequence,
          pickupStopId: input.pickupStopId,
          dropoffStopId: input.dropoffStopId,
        },
      });

      await this.recalculateShipmentTotals(tx, shipmentId);
      return updated;
    });
  }

  public async deleteCargoItem(shipmentId: string, cargoId: string): Promise<void> {
    await this.getShipmentById(shipmentId); // Asserts tenant boundary

    const existing = await this.prisma.cargoItem.findFirst({
      where: {
        id: cargoId,
        shipmentId,
        organizationId: this.organizationId,
      },
    });

    if (!existing) {
      throw new NotFoundError('CargoItem');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cargoItem.delete({
        where: { id: cargoId },
      });
      await this.recalculateShipmentTotals(tx, shipmentId);
    });
  }

  // ── Helper Utilities ──────────────────────────────────────────────────────

  private validateCargoInput(input: {
    length: number;
    width: number;
    height: number;
    unitWeight: number;
    quantity?: number;
  }): void {
    if (input.length <= 0 || isNaN(input.length)) {
      throw new ValidationError('Length must be a positive number');
    }
    if (input.width <= 0 || isNaN(input.width)) {
      throw new ValidationError('Width must be a positive number');
    }
    if (input.height <= 0 || isNaN(input.height)) {
      throw new ValidationError('Height must be a positive number');
    }
    if (input.unitWeight <= 0 || isNaN(input.unitWeight)) {
      throw new ValidationError('Unit weight must be a positive number');
    }
    if (input.quantity !== undefined && (input.quantity <= 0 || !Number.isInteger(input.quantity))) {
      throw new ValidationError('Quantity must be a positive integer');
    }
  }

  private computeUnitVolumeM3(
    length: number,
    width: number,
    height: number,
    unit: DimensionUnit,
  ): Decimal | null {
    let lM = new Decimal(length);
    let wM = new Decimal(width);
    let hM = new Decimal(height);

    if (unit === DimensionUnit.CM) {
      lM = lM.div(100);
      wM = wM.div(100);
      hM = hM.div(100);
    } else if (unit === DimensionUnit.MM) {
      lM = lM.div(1000);
      wM = wM.div(1000);
      hM = hM.div(1000);
    } else if (unit === DimensionUnit.INCH) {
      lM = lM.mul(0.0254);
      wM = wM.mul(0.0254);
      hM = hM.mul(0.0254);
    }

    return lM.mul(wM).mul(hM);
  }

  private async recalculateShipmentTotals(tx: Prisma.TransactionClient, shipmentId: string): Promise<void> {
    const items = await tx.cargoItem.findMany({
      where: { shipmentId },
    });

    let totalWeightKg = new Decimal(0);
    let totalVolumeM3 = new Decimal(0);
    let totalItems = 0;

    for (const item of items) {
      totalWeightKg = totalWeightKg.add(new Decimal(item.totalWeight.toString()));
      if (item.totalVolume) {
        totalVolumeM3 = totalVolumeM3.add(new Decimal(item.totalVolume.toString()));
      }
      totalItems += item.quantity;
    }

    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        totalWeight: new Prisma.Decimal(totalWeightKg.toNumber()),
        totalVolume: new Prisma.Decimal(totalVolumeM3.toNumber()),
        totalItemsCount: totalItems,
      },
    });
  }
}
