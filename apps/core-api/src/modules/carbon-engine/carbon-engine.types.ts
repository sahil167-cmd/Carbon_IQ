import { ScopeType } from '@prisma/client';

export interface CalculationInput {
  documentId: string;
  organizationId: string;
  siteId: string;
  reportingPeriodId: string;
  categoryCode: string;
  country: string; // ISO 3166-1 alpha-2
  asOfDate?: Date;
  fields: Record<string, any>;
}

export interface EmissionFactorDTO {
  id: string;
  category: string;
  subCategory: string;
  region: string;
  factorValue: number;
  unit: string;
  co2eUnit: string;
  sourceSet: string;
  version: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface UnitConversionDTO {
  fromUnit: string;
  toUnit: string;
  conversionFactor: number;
}

export interface CalculationResultDTO {
  id: string;
  documentId: string;
  organizationId: string;
  siteId: string;
  reportingPeriodId: string;
  emissionFactorId: string;
  scope: ScopeType;
  co2e: number;
  co2eLocation: number | null;
  co2eMarket: number | null;
  activityValue: number;
  activityUnit: string;
  calculationMethod: string;
  createdAt: Date;
}

export interface CalculationLogDTO {
  id: string;
  calculatedEmissionsId: string;
  documentId: string;
  inputSnapshot: unknown;
  factorVersion: number;
  formulaVersion: string;
  formulaUsed: string;
  triggeredBy: string;
  createdAt: Date;
}

export interface EmissionsAggregateDTO {
  organizationId: string;
  siteId: string;
  reportingPeriodId: string;
  scope1Total: number;
  scope2LocationTotal: number;
  scope2MarketTotal: number;
  scope3Total: number;
  grandTotal: number;
  updatedAt: Date;
}
