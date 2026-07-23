import { SiteType, SiteStatus } from '@prisma/client';

export interface SiteDTO {
  id: string;
  organizationId: string;
  name: string;
  type: SiteType;
  status: SiteStatus;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  productionCapacity: number | null;
  capacityUnit: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScopeBreakdown {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

export interface SiteDashboardMetrics {
  site: SiteDTO;
  reportingPeriodName: string;
  currentPeriodEmissions: ScopeBreakdown;
  previousPeriodEmissions: ScopeBreakdown | null;
  percentageChange: number | null;
  orgSharePercentage: number;
  monthlyTrend: Array<{
    month: string;
    co2e: number;
  }>;
}
