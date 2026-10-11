import { PrismaClient } from '@prisma/client';
import { CarbonIQAggregatedMetrics, ScopeBreakdownMetric, EnergyMetric } from './brsr.types';

/**
 * BRSRDataAggregationService
 * Pure, read-only aggregation layer mapping verified CarbonIQ accounting ledger
 * records into SEBI BRSR Section C (Principle 6) environmental disclosures.
 *
 * GUARANTEE: Does NOT calculate, re-calculate, or mutate accounting data.
 */
export class BRSRDataAggregationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Aggregate calculated emissions and activity records for a given organization and period.
   */
  async aggregateForPeriod(
    organizationId: string,
    reportingPeriodId?: string,
    financialYear: string = 'FY 2025-26',
  ): Promise<CarbonIQAggregatedMetrics> {
    // 1. Resolve reporting period or latest period
    let period: any = null;
    if (reportingPeriodId) {
      period = await this.prisma.reportingPeriod.findUnique({
        where: { id: reportingPeriodId },
      });
    }

    if (!period) {
      period = await this.prisma.reportingPeriod.findFirst({
        where: { organizationId },
        orderBy: { startDate: 'desc' },
      });
    }

    const resolvedPeriodId = period?.id || 'default-period';
    const resolvedPeriodName = period?.name || financialYear;

    // 2. Fetch all verified calculated emissions for the tenant and period
    const calculatedRecords = await this.prisma.calculatedEmissions.findMany({
      where: {
        organizationId,
        ...(period ? { reportingPeriodId: period.id } : {}),
      },
      include: {
        document: true,
        emissionFactor: true,
        activityRecord: true,
      },
    });

    // Helper builder for empty ScopeBreakdownMetric
    const createEmptyMetric = (methodology: string = 'GHG Protocol'): ScopeBreakdownMetric => ({
      co2eKg: 0,
      co2eTonnes: 0,
      activityQuantity: 0,
      activityUnit: 'N/A',
      methodology,
      sourceDocumentsCount: 0,
      documentIds: [],
    });

    // Scope 1 sub-categories
    const s1Stationary = createEmptyMetric('GHG Protocol Stationary Combustion');
    const s1Mobile = createEmptyMetric('GHG Protocol Mobile Fleet');
    const s1Fugitive = createEmptyMetric('GHG Protocol Fugitive & Refrigerant');

    // Scope 2 sub-categories
    const s2Location = createEmptyMetric('GHG Protocol Scope 2 Location-Based');
    const s2Market = createEmptyMetric('GHG Protocol Scope 2 Market-Based');

    // Scope 3 sub-categories
    const s3Upstream = createEmptyMetric('GLEC Framework Freight Transportation');
    const s3Downstream = createEmptyMetric('GLEC Framework Downstream Logistics');
    const s3PurchasedGoods = createEmptyMetric('GHG Protocol Cat 1 Purchased Goods');
    const s3BusinessTravel = createEmptyMetric('DEFRA Business Travel');

    // Energy metrics
    const energy: EnergyMetric = {
      renewableElectricityKwh: 0,
      gridElectricityKwh: 0,
      totalElectricityKwh: 0,
      fuelStationaryDieselLiters: 0,
      fuelMobileDieselLiters: 0,
      fuelNaturalGasM3: 0,
      totalFuelEnergyGj: 0,
      totalEnergyConsumptionGj: 0,
    };

    const provenanceList: CarbonIQAggregatedMetrics['provenance'] = [];

    // 3. Process records deterministically
    for (const record of calculatedRecords) {
      const co2eKg = record.co2e || 0;
      const co2eTonnes = co2eKg / 1000;
      const factorCat = (record.emissionFactor?.category || '').toUpperCase();
      const factorSub = (record.emissionFactor?.subCategory || '').toUpperCase();
      const docName = record.document?.fileName || 'Document';
      const docId = record.documentId;
      const actQty = record.activityValue || 0;
      const actUnit = record.activityUnit || 'UNITS';

      // Record provenance
      provenanceList.push({
        scope: record.scope,
        category: record.emissionFactor?.category || 'GENERAL',
        activityValue: actQty,
        activityUnit: actUnit,
        co2eKg,
        co2eTonnes: parseFloat(co2eTonnes.toFixed(4)),
        documentFileName: docName,
        documentId: docId,
        factorSource: record.emissionFactor?.sourceSet || 'IPCC / GLEC',
        factorValue: record.emissionFactor?.factorValue || 0,
        calculationMethod: record.calculationMethod || 'QTY_X_FACTOR',
      });

      // --- Scope 1 Aggregation ---
      if (record.scope === 'SCOPE_1') {
        if (factorCat.includes('STATIONARY') || factorSub.includes('GENERATOR') || factorSub.includes('BOILER') || factorSub.includes('NATURAL_GAS')) {
          s1Stationary.co2eKg += co2eKg;
          s1Stationary.activityQuantity += actQty;
          s1Stationary.activityUnit = actUnit;
          if (!s1Stationary.documentIds.includes(docId)) s1Stationary.documentIds.push(docId);

          if (actUnit === 'LITERS') energy.fuelStationaryDieselLiters += actQty;
          if (actUnit === 'M3' || actUnit === 'CUBIC_METERS') energy.fuelNaturalGasM3 += actQty;
        } else if (factorCat.includes('MOBILE') || factorSub.includes('FLEET') || factorSub.includes('DIESEL') || factorSub.includes('TRUCK')) {
          s1Mobile.co2eKg += co2eKg;
          s1Mobile.activityQuantity += actQty;
          s1Mobile.activityUnit = actUnit;
          if (!s1Mobile.documentIds.includes(docId)) s1Mobile.documentIds.push(docId);

          if (actUnit === 'LITERS') energy.fuelMobileDieselLiters += actQty;
        } else {
          s1Fugitive.co2eKg += co2eKg;
          s1Fugitive.activityQuantity += actQty;
          s1Fugitive.activityUnit = actUnit;
          if (!s1Fugitive.documentIds.includes(docId)) s1Fugitive.documentIds.push(docId);
        }
      }

      // --- Scope 2 Aggregation ---
      else if (record.scope === 'SCOPE_2') {
        const locCo2e = record.co2eLocation !== null && record.co2eLocation !== undefined ? record.co2eLocation : co2eKg;
        const mktCo2e = record.co2eMarket !== null && record.co2eMarket !== undefined ? record.co2eMarket : co2eKg;

        s2Location.co2eKg += locCo2e;
        s2Location.activityQuantity += actQty;
        s2Location.activityUnit = actUnit;
        if (!s2Location.documentIds.includes(docId)) s2Location.documentIds.push(docId);

        s2Market.co2eKg += mktCo2e;
        s2Market.activityQuantity += actQty;
        s2Market.activityUnit = actUnit;
        if (!s2Market.documentIds.includes(docId)) s2Market.documentIds.push(docId);

        // Check if renewable REC or green tariff
        const isRenewable = factorSub.includes('RENEWABLE') || factorSub.includes('SOLAR') || factorSub.includes('WIND') || mktCo2e === 0;
        if (isRenewable) {
          energy.renewableElectricityKwh += actQty;
        } else {
          energy.gridElectricityKwh += actQty;
        }
        energy.totalElectricityKwh += actQty;
      }

      // --- Scope 3 Aggregation ---
      else if (record.scope === 'SCOPE_3') {
        if (factorCat.includes('TRANSPORT') || factorCat.includes('FREIGHT') || actUnit === 'TONNE_KM') {
          s3Upstream.co2eKg += co2eKg;
          s3Upstream.activityQuantity += actQty;
          s3Upstream.activityUnit = actUnit;
          if (!s3Upstream.documentIds.includes(docId)) s3Upstream.documentIds.push(docId);
        } else if (factorCat.includes('PURCHASED_GOODS') || factorCat.includes('MATERIAL') || factorSub.includes('STEEL')) {
          s3PurchasedGoods.co2eKg += co2eKg;
          s3PurchasedGoods.activityQuantity += actQty;
          s3PurchasedGoods.activityUnit = actUnit;
          if (!s3PurchasedGoods.documentIds.includes(docId)) s3PurchasedGoods.documentIds.push(docId);
        } else if (factorCat.includes('TRAVEL')) {
          s3BusinessTravel.co2eKg += co2eKg;
          s3BusinessTravel.activityQuantity += actQty;
          s3BusinessTravel.activityUnit = actUnit;
          if (!s3BusinessTravel.documentIds.includes(docId)) s3BusinessTravel.documentIds.push(docId);
        } else {
          s3Downstream.co2eKg += co2eKg;
          s3Downstream.activityQuantity += actQty;
          s3Downstream.activityUnit = actUnit;
          if (!s3Downstream.documentIds.includes(docId)) s3Downstream.documentIds.push(docId);
        }
      }
    }

    // Set doc counts and tonnages
    [s1Stationary, s1Mobile, s1Fugitive, s2Location, s2Market, s3Upstream, s3Downstream, s3PurchasedGoods, s3BusinessTravel].forEach((m) => {
      m.co2eTonnes = parseFloat((m.co2eKg / 1000).toFixed(4));
      m.sourceDocumentsCount = m.documentIds.length;
    });

    const totalScope1Kg = s1Stationary.co2eKg + s1Mobile.co2eKg + s1Fugitive.co2eKg;
    const totalScope1Tonnes = parseFloat((totalScope1Kg / 1000).toFixed(4));

    const totalScope2LocKg = s2Location.co2eKg;
    const totalScope2LocTonnes = parseFloat((totalScope2LocKg / 1000).toFixed(4));
    const totalScope2MktKg = s2Market.co2eKg;
    const totalScope2MktTonnes = parseFloat((totalScope2MktKg / 1000).toFixed(4));

    const totalScope3Kg = s3Upstream.co2eKg + s3Downstream.co2eKg + s3PurchasedGoods.co2eKg + s3BusinessTravel.co2eKg;
    const totalScope3Tonnes = parseFloat((totalScope3Kg / 1000).toFixed(4));

    // Energy GJ conversion (1 Liter Diesel ≈ 0.038 GJ, 1 m3 Natural Gas ≈ 0.039 GJ, 1 kWh ≈ 0.0036 GJ)
    const dieselLitersTotal = energy.fuelStationaryDieselLiters + energy.fuelMobileDieselLiters;
    const dieselGj = dieselLitersTotal * 0.0386;
    const gasGj = energy.fuelNaturalGasM3 * 0.039;
    const electricityGj = energy.totalElectricityKwh * 0.0036;

    energy.totalFuelEnergyGj = parseFloat((dieselGj + gasGj).toFixed(2));
    energy.totalEnergyConsumptionGj = parseFloat((energy.totalFuelEnergyGj + electricityGj).toFixed(2));

    const totalScope1And2Tonnes = parseFloat((totalScope1Tonnes + totalScope2LocTonnes).toFixed(4));
    const grandTotalTonnes = parseFloat((totalScope1And2Tonnes + totalScope3Tonnes).toFixed(4));

    return {
      financialYear,
      reportingPeriodName: resolvedPeriodName,
      reportingPeriodId: resolvedPeriodId,
      scope1: {
        totalTonnes: totalScope1Tonnes,
        totalKg: parseFloat(totalScope1Kg.toFixed(2)),
        stationaryCombustion: s1Stationary,
        mobileCombustion: s1Mobile,
        fugitiveEmissions: s1Fugitive,
      },
      scope2: {
        totalLocationTonnes: totalScope2LocTonnes,
        totalLocationKg: parseFloat(totalScope2LocKg.toFixed(2)),
        totalMarketTonnes: totalScope2MktTonnes,
        totalMarketKg: parseFloat(totalScope2MktKg.toFixed(2)),
        locationBased: s2Location,
        marketBased: s2Market,
      },
      scope3: {
        totalTonnes: totalScope3Tonnes,
        totalKg: parseFloat(totalScope3Kg.toFixed(2)),
        upstreamTransport: s3Upstream,
        downstreamTransport: s3Downstream,
        purchasedGoods: s3PurchasedGoods,
        businessTravel: s3BusinessTravel,
      },
      totalScope1And2Tonnes,
      grandTotalTonnes,
      energy,
      provenance: provenanceList,
    };
  }
}
