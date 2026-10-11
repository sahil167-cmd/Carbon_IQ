import {
  DimensionUnit,
  Prisma,
  VehicleBodyType,
  VehicleFuelType,
  VehicleType,
  WeightUnit,
} from '@prisma/client';

/**
 * Authoritative specification sources supported for engineering provenance.
 */
export enum SpecificationSourceType {
  OEM_SPEC_SHEET = 'OEM_SPEC_SHEET',
  ARAI_HOMOLOGATION = 'ARAI_HOMOLOGATION',
  CMVR_CERTIFICATE = 'CMVR_CERTIFICATE',
  OFFICIAL_MANUFACTURER_PORTAL = 'OFFICIAL_MANUFACTURER_PORTAL',
  AUTHORITATIVE_REGULATORY_RECORD = 'AUTHORITATIVE_REGULATORY_RECORD',
  OTHER = 'OTHER',
}

/**
 * Technical specification lifecycle states.
 */
export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  DEPRECATED = 'DEPRECATED',
}

/**
 * Structured corroborating source reference.
 */
export interface CorroboratingSource {
  sourceName: string;
  sourceUrl?: string;
  sourceType?: SpecificationSourceType | string;
  referenceDate?: string | Date;
  notes?: string;
}

/**
 * Application-level ingestion input contract.
 */
export interface VehicleSpecificationIngestionInput {
  name: string;
  make?: string | null;
  model?: string | null;
  variant?: string | null;
  category?: string | null;
  bodyType: VehicleBodyType;
  fuelType: VehicleFuelType;
  emissionStandard?: string | null;

  // Internal Cargo Space (optional for chassis-only models, required for packing compatibility)
  internalLength?: Prisma.Decimal | number | string | null;
  internalWidth?: Prisma.Decimal | number | string | null;
  internalHeight?: Prisma.Decimal | number | string | null;
  dimensionUnit?: DimensionUnit;

  doorWidth?: Prisma.Decimal | number | string | null;
  doorHeight?: Prisma.Decimal | number | string | null;

  // External Dimensions (optional)
  externalLength?: Prisma.Decimal | number | string | null;
  externalWidth?: Prisma.Decimal | number | string | null;
  externalHeight?: Prisma.Decimal | number | string | null;

  // Weight Limits
  maxPayload: Prisma.Decimal | number | string;
  grossVehicleWeight?: Prisma.Decimal | number | string | null;
  tareWeight?: Prisma.Decimal | number | string | null;
  weightUnit?: WeightUnit;

  volumetricCapacity?: Prisma.Decimal | number | string | null;
  volumeUnit?: 'M3' | 'CFT' | 'LITER' | 'CM3';

  // Axle Constraints
  axleCount?: number | null;
  axleConfiguration?: string | null;
  maxAxleWeightFront?: Prisma.Decimal | number | string | null;
  maxAxleWeightRear?: Prisma.Decimal | number | string | null;

  isRefrigerated?: boolean;
  temperatureMin?: Prisma.Decimal | number | string | null;
  temperatureMax?: Prisma.Decimal | number | string | null;

  // Engineering Provenance
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceType?: SpecificationSourceType | string | null;
  verificationStatus?: VerificationStatus | string;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
  notes?: string | null;
  corroboratingSources?: CorroboratingSource[];

  // Catalog Scope: true = Global Approved Template (organizationId: null); false = Tenant Custom
  isGlobal?: boolean;
}

/**
 * Result of packing compatibility analysis.
 */
export interface PackingCompatibilityResult {
  isCompatible: boolean;
  reasons: string[];
}

/**
 * Response contract returned by ingestion service.
 */
export interface IngestionResult {
  vehicleType: VehicleType;
  action: 'CREATED' | 'UPDATED' | 'EXISTING_UNMODIFIED';
  isPackingCompatible: boolean;
  packingCompatibilityReasons: string[];
  verificationStatus: string;
}
