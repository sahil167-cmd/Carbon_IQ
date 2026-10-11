/**
 * CarbonIQ — BRSR Compliance Report Domain Types
 * Derived from SEBI BRSR Guidelines (Circular SEBI/HO/CFD/CMD-2/P/CIR/2021/562)
 */

export type DataAvailabilityState =
  | 'AUTO_POPULATED'
  | 'USER_PROVIDED'
  | 'DATA_NOT_PROVIDED'
  | 'NOT_APPLICABLE'
  | 'PENDING_REVIEW';

export interface BrsrEntityDetails {
  cin?: string;
  name: string;
  yearOfIncorporation?: number;
  registeredOfficeAddress?: string;
  corporateAddress?: string;
  email?: string;
  telephone?: string;
  website?: string;
  financialYear: string;
  stockExchanges?: string[];
  paidUpCapital?: string;
  contactPersonName?: string;
  contactPersonDesignation?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  reportingBoundary: 'STANDALONE' | 'CONSOLIDATED';
}

export interface BusinessActivity {
  descriptionMain: string;
  descriptionBusiness: string;
  turnoverPercentage: number;
}

export interface ProductSold {
  productService: string;
  nicCode: string;
  turnoverPercentage: number;
}

export interface LocationCount {
  nationalPlants: number;
  nationalOffices: number;
  internationalPlants: number;
  internationalOffices: number;
}

export interface MarketDetails {
  locationsCount: number;
  exportPercentage: number;
  customerTypesBrief: string;
}

export interface EmployeeGenderData {
  total: number;
  maleCount: number;
  malePercentage: number;
  femaleCount: number;
  femalePercentage: number;
}

export interface EmployeeDetails {
  permanentEmployees: EmployeeGenderData;
  otherThanPermanentEmployees: EmployeeGenderData;
  totalEmployees: EmployeeGenderData;
  permanentWorkers: EmployeeGenderData;
  otherThanPermanentWorkers: EmployeeGenderData;
  totalWorkers: EmployeeGenderData;
  boardOfDirectors: {
    total: number;
    femaleCount: number;
    femalePercentage: number;
  };
  keyManagementPersonnel: {
    total: number;
    femaleCount: number;
    femalePercentage: number;
  };
  turnoverRateTrend?: {
    fyCurrent: { male: number; female: number; total: number };
    fyPrevious: { male: number; female: number; total: number };
    fyPrior: { male: number; female: number; total: number };
  };
}

export interface MaterialIssue {
  id: string;
  issue: string;
  riskOrOpportunity: 'RISK' | 'OPPORTUNITY';
  rationale: string;
  mitigationApproach?: string;
  financialImplications?: string;
}

export interface BrsrSectionA {
  entityDetails: BrsrEntityDetails;
  businessActivities: BusinessActivity[];
  productsSold: ProductSold[];
  operations: LocationCount;
  markets: MarketDetails;
  employees: EmployeeDetails;
  holdingSubsidiaries: Array<{
    name: string;
    type: 'HOLDING' | 'SUBSIDIARY' | 'ASSOCIATE' | 'JOINT_VENTURE';
    sharePercentage: number;
    participatesInBR: boolean;
  }>;
  csrApplicability: {
    isApplicable: boolean;
    turnoverInr?: string;
    netWorthInr?: string;
  };
  materialIssues: MaterialIssue[];
}

export interface BrsrSectionB {
  policyCoverage: {
    p1Ethics: boolean;
    p2Sustainability: boolean;
    p3Employees: boolean;
    p4Stakeholders: boolean;
    p5HumanRights: boolean;
    p6Environment: boolean;
    p7PublicPolicy: boolean;
    p8InclusiveGrowth: boolean;
    p9ConsumerValue: boolean;
  };
  boardApproved: boolean;
  policyWebLink?: string;
  translatedIntoProcedures: boolean;
  extendsToValueChain: boolean;
  certificationsStandards: string[]; // e.g. ["ISO 14001", "GHG Protocol", "GLEC Framework"]
  commitmentsAndTargets: string;
  performanceAgainstTargets: string;
  directorStatement: string;
  highestResponsibleAuthority: {
    name?: string;
    designation?: string;
    din?: string;
  };
  boardReviewDetails: string;
  assurance: {
    isAssured: boolean;
    providerName?: string;
    assuranceType?: 'LIMITED' | 'REASONABLE' | null;
    assuranceStandard?: string;
    reportUrl?: string;
  };
}

export interface EnergyMetric {
  renewableElectricityKwh: number;
  gridElectricityKwh: number;
  totalElectricityKwh: number;
  fuelStationaryDieselLiters: number;
  fuelMobileDieselLiters: number;
  fuelNaturalGasM3: number;
  totalFuelEnergyGj: number;
  totalEnergyConsumptionGj: number;
  energyIntensityPerTurnover?: string;
}

export interface ScopeBreakdownMetric {
  co2eKg: number;
  co2eTonnes: number;
  activityQuantity: number;
  activityUnit: string;
  methodology: string;
  sourceDocumentsCount: number;
  documentIds: string[];
}

export interface CarbonIQAggregatedMetrics {
  financialYear: string;
  reportingPeriodName: string;
  reportingPeriodId: string;
  scope1: {
    totalTonnes: number;
    totalKg: number;
    stationaryCombustion: ScopeBreakdownMetric;
    mobileCombustion: ScopeBreakdownMetric;
    fugitiveEmissions: ScopeBreakdownMetric;
  };
  scope2: {
    totalLocationTonnes: number;
    totalLocationKg: number;
    totalMarketTonnes: number;
    totalMarketKg: number;
    locationBased: ScopeBreakdownMetric;
    marketBased: ScopeBreakdownMetric;
  };
  scope3: {
    totalTonnes: number;
    totalKg: number;
    upstreamTransport: ScopeBreakdownMetric;
    downstreamTransport: ScopeBreakdownMetric;
    purchasedGoods: ScopeBreakdownMetric;
    businessTravel: ScopeBreakdownMetric;
  };
  totalScope1And2Tonnes: number;
  grandTotalTonnes: number;
  energy: EnergyMetric;
  provenance: Array<{
    scope: string;
    category: string;
    activityValue: number;
    activityUnit: string;
    co2eKg: number;
    co2eTonnes: number;
    documentFileName: string;
    documentId: string;
    factorSource: string;
    factorValue: number;
    calculationMethod: string;
  }>;
}

export interface SupplementalEnvironmentalData {
  waterWithdrawalKl?: number;
  waterConsumptionKl?: number;
  waterIntensity?: string;
  airEmissionsNoxKg?: number;
  airEmissionsSoxKg?: number;
  airEmissionsPmKg?: number;
  wasteGeneratedTonnes?: number;
  wasteRecycledTonnes?: number;
  wasteDisposedTonnes?: number;
  greenInitiativesSummary?: string;
  ecologicallySensitiveAreasNearby?: boolean;
}

export interface BrsrSectionC {
  p1EthicsDetails?: string;
  p2SustainableSourcingPct?: number;
  p2LcaConducted?: boolean;
  p3RetirementBenefitsDetails?: string;
  p3HealthSafetyCoveragePct?: number;
  p4StakeholderIdentificationProcess?: string;
  p5HumanRightsTrainingPct?: number;
  p5MinimumWagesCompliancePct?: number;
  p6Environmental: {
    carbonMetrics: CarbonIQAggregatedMetrics;
    supplemental: SupplementalEnvironmentalData;
  };
  p7TradeAssociationsAffiliations?: string[];
  p8SocialImpactAssessmentsSummary?: string;
  p9ConsumerGrievanceMechanism?: string;
}

export interface BrsrCompletenessResult {
  overallScore: number; // 0 to 100
  status: 'INCOMPLETE' | 'READY_FOR_REVIEW' | 'COMPLETE';
  sections: {
    sectionA: { total: number; completed: number; missingFields: string[] };
    sectionB: { total: number; completed: number; missingFields: string[] };
    sectionC: { total: number; completed: number; missingFields: string[] };
    carbonIQ: { isGrounded: boolean; recordsCount: number; scope1: boolean; scope2: boolean; scope3: boolean };
  };
  missingRequiredItems: string[];
}
