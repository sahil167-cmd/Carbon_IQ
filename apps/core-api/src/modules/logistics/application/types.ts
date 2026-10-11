import { DimensionUnit, WeightUnit, Prisma } from '@prisma/client';

export interface PackShipmentInput {
  shipmentId: string;
  vehicleId?: string;
  vehicleTypeId?: string;
}

export interface DirectVehicleSpec {
  length: Prisma.Decimal | number | string;
  width: Prisma.Decimal | number | string;
  height: Prisma.Decimal | number | string;
  dimensionUnit?: DimensionUnit;
  maxPayload: Prisma.Decimal | number | string;
  weightUnit?: WeightUnit;
  name?: string;
}

export interface DirectCargoItem {
  cargoId: string;
  description?: string;
  length: Prisma.Decimal | number | string;
  width: Prisma.Decimal | number | string;
  height: Prisma.Decimal | number | string;
  dimensionUnit?: DimensionUnit;
  weight: Prisma.Decimal | number | string;
  weightUnit?: WeightUnit;
  quantity: number;

  isStackable?: boolean;
  maxStackWeight?: Prisma.Decimal | number | string;
  maxStackTiers?: number;
  isFragile?: boolean;

  allowRotationHorizontal?: boolean;
  allowRotationVertical?: boolean;
  allowedOrientations?: string[];

  loadingPriority?: number;
  unloadingSequence?: number;
}

export interface PackManifestInput {
  vehicleId?: string;
  vehicleTypeId?: string;
  vehicleSpec?: DirectVehicleSpec;
  cargo: DirectCargoItem[];
}
