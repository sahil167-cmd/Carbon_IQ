import { BrsrSectionA, BrsrSectionB, BrsrSectionC, BrsrCompletenessResult } from './brsr.types';

/**
 * BRSRCompletenessService
 * Evaluates the statutory completeness of a BRSR draft report across
 * Section A (General Disclosures), Section B (Management & Process),
 * and Section C (Principle-Wise Performance).
 */
export class BRSRCompletenessService {
  /**
   * Run full completeness audit on a BRSR report payload.
   */
  evaluateCompleteness(params: {
    sectionA?: Partial<BrsrSectionA> | null;
    sectionB?: Partial<BrsrSectionB> | null;
    sectionC?: Partial<BrsrSectionC> | null;
  }): BrsrCompletenessResult {
    const missingRequired: string[] = [];

    // --- 1. Section A Evaluation (22 key statutory items) ---
    const secA = params.sectionA || {};
    const secAMissing: string[] = [];
    let secATotal = 0;
    let secACompleted = 0;

    const checkField = (val: any, name: string, list: string[]) => {
      secATotal++;
      if (val !== undefined && val !== null && val !== '' && (typeof val !== 'object' || Object.keys(val).length > 0)) {
        secACompleted++;
      } else {
        list.push(name);
        missingRequired.push(`Section A: ${name}`);
      }
    };

    checkField(secA.entityDetails?.name, 'Entity Legal Name', secAMissing);
    checkField(secA.entityDetails?.cin, 'Corporate Identity Number (CIN)', secAMissing);
    checkField(secA.entityDetails?.registeredOfficeAddress, 'Registered Office Address', secAMissing);
    checkField(secA.entityDetails?.corporateAddress, 'Corporate Office Address', secAMissing);
    checkField(secA.entityDetails?.email, 'Contact Email', secAMissing);
    checkField(secA.entityDetails?.telephone, 'Telephone Number', secAMissing);
    checkField(secA.entityDetails?.website, 'Website URL', secAMissing);
    checkField(secA.entityDetails?.financialYear, 'Reporting Financial Year', secAMissing);
    checkField(secA.entityDetails?.reportingBoundary, 'Reporting Boundary (Standalone/Consolidated)', secAMissing);
    checkField(secA.entityDetails?.contactPersonName, 'BRSR Contact Person Name', secAMissing);
    checkField(secA.businessActivities && secA.businessActivities.length > 0, 'Business Activities (Accounting for 90% turnover)', secAMissing);
    checkField(secA.productsSold && secA.productsSold.length > 0, 'Products & Services Sold with NIC Codes', secAMissing);
    checkField(secA.operations?.nationalPlants !== undefined, 'National Plants & Office Locations', secAMissing);
    checkField(secA.markets?.locationsCount !== undefined, 'Markets Served & Export Contribution', secAMissing);
    checkField(secA.employees?.permanentEmployees?.total !== undefined, 'Employee Count (Permanent Employees)', secAMissing);
    checkField(secA.employees?.permanentWorkers?.total !== undefined, 'Worker Count (Permanent Workers)', secAMissing);
    checkField(secA.employees?.boardOfDirectors?.femaleCount !== undefined, 'Women Representation in Board of Directors', secAMissing);
    checkField(secA.employees?.keyManagementPersonnel?.femaleCount !== undefined, 'Women Representation in KMP', secAMissing);
    checkField(secA.csrApplicability?.isApplicable !== undefined, 'CSR Applicability (Section 135 Companies Act)', secAMissing);
    checkField(secA.materialIssues && secA.materialIssues.length > 0, 'Overview of Material ESG Issues', secAMissing);

    // --- 2. Section B Evaluation (12 policy & governance questions) ---
    const secB = params.sectionB || {};
    const secBMissing: string[] = [];
    let secBTotal = 0;
    let secBCompleted = 0;

    const checkSecB = (val: any, name: string) => {
      secBTotal++;
      if (val !== undefined && val !== null && val !== '') {
        secBCompleted++;
      } else {
        secBMissing.push(name);
        missingRequired.push(`Section B: ${name}`);
      }
    };

    checkSecB(secB.policyCoverage?.p1Ethics !== undefined, 'NGRBC Principle 1 Ethics Policy Coverage');
    checkSecB(secB.policyCoverage?.p2Sustainability !== undefined, 'NGRBC Principle 2 Sustainability Policy Coverage');
    checkSecB(secB.policyCoverage?.p3Employees !== undefined, 'NGRBC Principle 3 Employee Well-being Policy Coverage');
    checkSecB(secB.policyCoverage?.p4Stakeholders !== undefined, 'NGRBC Principle 4 Stakeholder Engagement Policy Coverage');
    checkSecB(secB.policyCoverage?.p5HumanRights !== undefined, 'NGRBC Principle 5 Human Rights Policy Coverage');
    checkSecB(secB.policyCoverage?.p6Environment !== undefined, 'NGRBC Principle 6 Environmental Protection Policy Coverage');
    checkSecB(secB.policyCoverage?.p7PublicPolicy !== undefined, 'NGRBC Principle 7 Public Policy Policy Coverage');
    checkSecB(secB.policyCoverage?.p8InclusiveGrowth !== undefined, 'NGRBC Principle 8 Inclusive Growth Policy Coverage');
    checkSecB(secB.policyCoverage?.p9ConsumerValue !== undefined, 'NGRBC Principle 9 Consumer Value Policy Coverage');
    checkSecB(secB.boardApproved !== undefined, 'Board Approval of Sustainability Policies');
    checkSecB(secB.directorStatement, 'Statement by Director on ESG Challenges & Targets');
    checkSecB(secB.highestResponsibleAuthority?.name, 'Highest Authority Responsible for BRSR Oversight');

    // --- 3. Section C Evaluation (Principle 1-9 Disclosures + Carbon Ledger) ---
    const secC = params.sectionC || {};
    const secCMissing: string[] = [];
    let secCTotal = 0;
    let secCCompleted = 0;

    const checkSecC = (val: any, name: string) => {
      secCTotal++;
      if (val !== undefined && val !== null && val !== '') {
        secCCompleted++;
      } else {
        secCMissing.push(name);
        missingRequired.push(`Section C: ${name}`);
      }
    };

    // Principle 6: Environmental & CarbonIQ Grounding
    const carbon = secC.p6Environmental?.carbonMetrics;
    const hasScope1 = (carbon?.scope1?.totalTonnes ?? 0) > 0;
    const hasScope2 = (carbon?.scope2?.totalLocationTonnes ?? 0) > 0;
    const hasScope3 = (carbon?.scope3?.totalTonnes ?? 0) > 0;
    const recordsCount = carbon?.provenance?.length || 0;

    checkSecC(hasScope1, 'Principle 6: Scope 1 Direct GHG Emissions (Verified Ledger)');
    checkSecC(hasScope2, 'Principle 6: Scope 2 Grid Electricity Emissions (Dual Reporting)');
    checkSecC(hasScope3, 'Principle 6: Scope 3 Value Chain Freight / Material Emissions');
    checkSecC((carbon?.energy?.totalEnergyConsumptionGj ?? 0) > 0, 'Principle 6: Energy Consumption (Electricity & Fuel in GJ)');

    // Non-carbon Principle Disclosures
    checkSecC(secC.p1EthicsDetails, 'Principle 1: Anti-Corruption & Ethical Training Coverage');
    checkSecC(secC.p2SustainableSourcingPct !== undefined, 'Principle 2: Sustainable Sourcing Percentage');
    checkSecC(secC.p3HealthSafetyCoveragePct !== undefined, 'Principle 3: Health & Safety OHSMS Coverage');
    checkSecC(secC.p5HumanRightsTrainingPct !== undefined, 'Principle 5: Human Rights Training & Minimum Wages');
    checkSecC(secC.p8SocialImpactAssessmentsSummary, 'Principle 8: CSR Community & Social Impact Assessments');
    checkSecC(secC.p9ConsumerGrievanceMechanism, 'Principle 9: Consumer Feedback & Cyber Security Redressal');

    // Total score calculation
    const grandTotal = secATotal + secBTotal + secCTotal;
    const grandCompleted = secACompleted + secBCompleted + secCCompleted;
    const overallScore = grandTotal > 0 ? parseFloat(((grandCompleted / grandTotal) * 100).toFixed(1)) : 0;

    const status: BrsrCompletenessResult['status'] =
      overallScore === 100
        ? 'COMPLETE'
        : overallScore >= 70 && hasScope1 && hasScope2
        ? 'READY_FOR_REVIEW'
        : 'INCOMPLETE';

    return {
      overallScore,
      status,
      sections: {
        sectionA: {
          total: secATotal,
          completed: secACompleted,
          missingFields: secAMissing,
        },
        sectionB: {
          total: secBTotal,
          completed: secBCompleted,
          missingFields: secBMissing,
        },
        sectionC: {
          total: secCTotal,
          completed: secCCompleted,
          missingFields: secCMissing,
        },
        carbonIQ: {
          isGrounded: recordsCount > 0,
          recordsCount,
          scope1: hasScope1,
          scope2: hasScope2,
          scope3: hasScope3,
        },
      },
      missingRequiredItems: missingRequired,
    };
  }
}
