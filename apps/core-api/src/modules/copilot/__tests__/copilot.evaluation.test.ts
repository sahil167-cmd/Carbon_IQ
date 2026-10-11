import { QueryPlanner } from '../query-planner';

describe('CarbonIQ Sustainability AI Copilot — Comprehensive 50+ Evaluation Dataset', () => {
  let planner: QueryPlanner;

  beforeAll(() => {
    planner = new QueryPlanner();
  });

  // ===========================================================================
  // 1. Current Emissions Variations
  // ===========================================================================
  describe('1. Current & Total Emission Questions', () => {
    const questions = [
      'What are my current emissions?',
      'What is our current carbon footprint?',
      'How much have we emitted?',
      'What is our latest emission value?',
      'Show me current CO2e.',
      'How much CO2e have we generated?',
      'What is our total carbon footprint across Scope 1, 2 and 3?',
      'Show our latest footprint.',
    ];

    test.each(questions)('should plan current total emissions for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('CURRENT_TOTAL');
      expect(plan.requiresSql).toBe(true);
    });
  });

  // ===========================================================================
  // 2. Specific Time & Month Variations
  // ===========================================================================
  describe('2. Time & Month Specific Questions', () => {
    test('should detect August month for: "What was our carbon footprint in August?"', async () => {
      const plan = await planner.planQuery('What was our carbon footprint in August?');
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('PERIOD_EMISSIONS');
      expect(plan.monthFilter).toBe('2026-08');
      expect(plan.requiresSql).toBe(true);
    });

    test('should detect July month for: "How much did we emit in July?"', async () => {
      const plan = await planner.planQuery('How much did we emit in July?');
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('PERIOD_EMISSIONS');
      expect(plan.monthFilter).toBe('2026-07');
    });

    test('should plan latest period for: "How much carbon did we emit this month?"', async () => {
      const plan = await planner.planQuery('How much carbon did we emit this month?');
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('PERIOD_EMISSIONS');
    });

    test('should plan peak month for: "Which month had the highest emissions?"', async () => {
      const plan = await planner.planQuery('Which month had the highest emissions?');
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('HIGHEST_MONTH');
      expect(plan.requiresSql).toBe(true);
    });

    test('should plan period comparison for: "Compare July and August emissions."', async () => {
      const plan = await planner.planQuery('Compare July and August emissions.');
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('PERIOD_COMPARISON');
      expect(plan.requiresSql).toBe(true);
    });
  });

  // ===========================================================================
  // 3. Scope Questions
  // ===========================================================================
  describe('3. Scope-Specific Questions', () => {
    const scope3Questions = [
      'What are my Scope 3 emissions?',
      'How much Scope 3 did we generate?',
      'What are our Scope 3 emissions for the current reporting period?',
      'Show me Scope 3 breakdown.',
    ];

    test.each(scope3Questions)('should route to SCOPE_BREAKDOWN for Scope 3: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('SCOPE_BREAKDOWN');
      expect(plan.scopeFilter).toBe('SCOPE_3');
      expect(plan.requiresSql).toBe(true);
    });

    test('should route to SCOPE_BREAKDOWN for Scope 1: "What are our Scope 1 emissions?"', async () => {
      const plan = await planner.planQuery('What are our Scope 1 emissions?');
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('SCOPE_BREAKDOWN');
      expect(plan.scopeFilter).toBe('SCOPE_1');
    });

    test('should route to SCOPE_BREAKDOWN for Scope 2: "How much Scope 2 did we generate?"', async () => {
      const plan = await planner.planQuery('How much Scope 2 did we generate?');
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('SCOPE_BREAKDOWN');
      expect(plan.scopeFilter).toBe('SCOPE_2');
    });
  });

  // ===========================================================================
  // 4. Category & Activity Questions
  // ===========================================================================
  describe('4. Category & Activity Questions', () => {
    const transportQuestions = [
      'How much did transportation contribute?',
      'What were our freight emissions?',
      'Show logistics carbon footprint.',
    ];

    test.each(transportQuestions)('should plan CATEGORY_BREAKDOWN with TRANSPORT: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('CATEGORY_BREAKDOWN');
      expect(plan.categoryFilter).toBe('TRANSPORT');
      expect(plan.requiresSql).toBe(true);
    });

    test('should plan CATEGORY_BREAKDOWN for electricity: "How much did electricity contribute?"', async () => {
      const plan = await planner.planQuery('How much did electricity contribute?');
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('CATEGORY_BREAKDOWN');
      expect(plan.categoryFilter).toBe('ELECTRICITY');
    });
  });

  // ===========================================================================
  // 5. Hotspots & Rankings
  // ===========================================================================
  describe('5. Hotspot & Ranking Questions', () => {
    const hotspotQuestions = [
      'Which emission is the most contributing for my emissions?',
      'Which emission is contributing the most to our footprint?',
      'What is our largest emission source?',
      'Which category contributes most?',
      'Which scope is highest?',
      'What is our biggest source of carbon?',
    ];

    test.each(hotspotQuestions)('should plan HOTSPOT_RANKING for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('HOTSPOT_RANKING');
      expect(plan.requiresSql).toBe(true);
    });
  });

  // ===========================================================================
  // 6. Trend & Velocity
  // ===========================================================================
  describe('6. Trend & Velocity Questions', () => {
    const trendQuestions = [
      'Are our emissions increasing?',
      'What is our emission trend?',
      'Why did our emissions increase?',
      'Why did our Scope 3 emissions increase last month?',
      'How much did Scope 3 increase?',
      'Which Scope has increased the most?',
    ];

    test.each(trendQuestions)('should plan TREND_VELOCITY for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('TREND_VELOCITY');
      expect(plan.requiresSql).toBe(true);
    });
  });

  // ===========================================================================
  // 7. Decarbonization & Recommendations
  // ===========================================================================
  describe('7. Recommendation & Strategy Questions', () => {
    const recoQuestions = [
      'How to reduce emissions?',
      'How can I reduce our carbon emissions?',
      'What should I reduce first?',
      'Give me recommendations based on my emissions.',
      'What can I do to reduce my Scope 3 emissions?',
      'How do we cut our emissions?',
    ];

    test.each(recoQuestions)('should plan REDUCTION_STRATEGY for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('REDUCTION_STRATEGY');
      expect(plan.requiresSql).toBe(true);
      expect(plan.requiresVector).toBe(true);
    });
  });

  // ===========================================================================
  // 8. Methodology & Factor Audit
  // ===========================================================================
  describe('8. Methodology & Calculation Audit Questions', () => {
    const auditQuestions = [
      'What calculation method was used?',
      'What emission factor was used?',
      'Which emission factor was applied?',
      'Show calculation formula used.',
    ];

    test.each(auditQuestions)('should plan METHODOLOGY_AUDIT for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('ORGANIZATION_EMISSIONS');
      expect(plan.operation).toBe('METHODOLOGY_AUDIT');
      expect(plan.requiresSql).toBe(true);
    });
  });

  // ===========================================================================
  // 9. Forecasting & Predictions
  // ===========================================================================
  describe('9. Forecasting & Prediction Questions', () => {
    const forecastQuestions = [
      'What will our emissions be next month?',
      'What is the forecast?',
      'Will emissions increase next month?',
      'What is our projected target?',
    ];

    test.each(forecastQuestions)('should plan FORECAST_PROJECTION for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('FORECAST_ANALYTICS');
      expect(plan.operation).toBe('FORECAST_PROJECTION');
      expect(plan.requiresForecast).toBe(true);
    });
  });

  // ===========================================================================
  // 10. General Sustainability Concepts
  // ===========================================================================
  describe('10. General Sustainability Concepts', () => {
    const conceptQuestions = [
      'What is Scope 3 under the GHG Protocol?',
      'What are the 15 Scope 3 categories?',
      'What is spend-based calculation?',
      'What is activity-based calculation?',
      'What is market-based Scope 2?',
    ];

    test.each(conceptQuestions)('should plan CONCEPT_EXPLANATION for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('GENERAL_SUSTAINABILITY');
      expect(plan.operation).toBe('CONCEPT_EXPLANATION');
      expect(plan.requiresVector).toBe(true);
    });
  });

  // ===========================================================================
  // 11. Uploaded Document Queries & Statistics
  // ===========================================================================
  describe('11. Uploaded Document Queries', () => {
    const docQuestions = [
      'What does my uploaded document say about emissions?',
      'Find the emission-related information in my uploaded document.',
      'What does my uploaded report say?',
    ];

    test.each(docQuestions)('should plan DOCUMENT_SEARCH for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('DOCUMENT_KNOWLEDGE');
      expect(plan.operation).toBe('DOCUMENT_SEARCH');
      expect(plan.requiresVector).toBe(true);
    });
    const docStatQuestions = [
      'total uploaded documents',
      'how many documents did we upload',
      'document count',
      'list my documents',
      'show uploaded files',
    ];

    test.each(docStatQuestions)('should plan DOCUMENT_STATISTICS for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('DOCUMENT_KNOWLEDGE');
      expect(plan.operation).toBe('DOCUMENT_STATISTICS');
      expect(plan.requiresSql).toBe(true);
    });
  });

  // ===========================================================================
  // 12. Financial Carbon & Optimization Questions
  // ===========================================================================
  describe('12. Financial Carbon & Optimization Questions', () => {
    const financialQuestions = [
      'What is our carbon tax exposure?',
      'What is the financial cost of our emissions?',
      'What is our carbon price liability at $80/tonne?',
      'How much money does our carbon cost?',
    ];

    test.each(financialQuestions)('should plan FINANCIAL_CARBON_COST for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('FINANCIAL_CARBON_ANALYTICS');
      expect(plan.operation).toBe('FINANCIAL_CARBON_COST');
      expect(plan.requiresSql).toBe(true);
    });

    const optimizationQuestions = [
      'How can we optimize money & cut Scope 3 emissions?',
      'What is our decarbonization ROI?',
      'How to save money with carbon reduction?',
      'Show our MACC abatement cost curve.',
    ];

    test.each(optimizationQuestions)('should plan CARBON_OPTIMIZATION_ROI for: "%s"', async (q) => {
      const plan = await planner.planQuery(q);
      expect(plan.domain).toBe('FINANCIAL_CARBON_ANALYTICS');
      expect(plan.operation).toBe('CARBON_OPTIMIZATION_ROI');
      expect(plan.requiresSql).toBe(true);
    });
  });

  describe('13. Conversational, Ambiguous & Out-of-Domain Boundaries', () => {
    test('should route "hii" to GREETING without DB retrieval', async () => {
      const plan = await planner.planQuery('hii');
      expect(plan.domain).toBe('CONVERSATIONAL');
      expect(plan.operation).toBe('GREETING');
      expect(plan.requiresSql).toBe(false);
    });

    test('should route "write a python program" to OUT_OF_DOMAIN', async () => {
      const plan = await planner.planQuery('write a python program');
      expect(plan.domain).toBe('OUT_OF_DOMAIN');
      expect(plan.operation).toBe('OUT_OF_DOMAIN');
      expect(plan.requiresSql).toBe(false);
    });

    test('should route "what was the emission" to CLARIFICATION', async () => {
      const plan = await planner.planQuery('what was the emission');
      expect(plan.domain).toBe('AMBIGUOUS');
      expect(plan.operation).toBe('CLARIFICATION');
      expect(plan.requiresSql).toBe(false);
    });
  });
});
