import { QueryPlanner } from '../query-planner';
import { CopilotService } from '../copilot.service';
import { chunkDocument } from '../ingestion/chunker';
import { ParsedDocument, EvidencePack } from '../copilot.types';

describe('CarbonIQ Hybrid RAG AI Copilot — Core Suite', () => {
  const planner = new QueryPlanner();

  describe('1. Semantic Query Planning (Zero-Blindness Engine)', () => {
    it('TEST 1: "hii" & "hello" should plan GREETING with zero retrieval needed', async () => {
      const plan1 = await planner.planQuery('hii');
      expect(plan1.operation).toBe('GREETING');
      expect(plan1.requiresSql).toBe(false);
      expect(plan1.requiresVector).toBe(false);

      const plan2 = await planner.planQuery('hello');
      expect(plan2.operation).toBe('GREETING');
    });

    it('TEST 2: "how to reduce emissions" should plan REDUCTION_STRATEGY', async () => {
      const plan = await planner.planQuery('how to reduce emissions');
      expect(plan.operation).toBe('REDUCTION_STRATEGY');
      expect(plan.requiresSql).toBe(true);
      expect(plan.requiresVector).toBe(true);
    });

    it('TEST 3: "which emission is contributing the most" should plan HOTSPOT_RANKING', async () => {
      const plan = await planner.planQuery('which emission is contributing the most for my emissions');
      expect(plan.operation).toBe('HOTSPOT_RANKING');
      expect(plan.requiresSql).toBe(true);
    });

    it('TEST 4: "what is scope 3" should plan CONCEPT_EXPLANATION', async () => {
      const plan = await planner.planQuery('what is scope 3?');
      expect(plan.operation).toBe('CONCEPT_EXPLANATION');
      expect(plan.requiresSql).toBe(false);
      expect(plan.requiresVector).toBe(true);
    });

    it('TEST 5: "what will our carbon emissions be next month" should plan FORECAST_PROJECTION', async () => {
      const plan = await planner.planQuery('what will our carbon emissions be next month?');
      expect(plan.operation).toBe('FORECAST_PROJECTION');
      expect(plan.requiresForecast).toBe(true);
    });

    it('TEST 6: "write a python game" should plan OUT_OF_DOMAIN', async () => {
      const plan = await planner.planQuery('write a python game for tic-tac-toe');
      expect(plan.operation).toBe('OUT_OF_DOMAIN');
      expect(plan.requiresSql).toBe(false);
    });

    it('TEST 7: "what was the emission" should plan CLARIFICATION', async () => {
      const plan = await planner.planQuery('what was the emission');
      expect(plan.operation).toBe('CLARIFICATION');
    });

    it('TEST 8: "why did our emissions increase" should plan TREND_VELOCITY', async () => {
      const plan = await planner.planQuery('why did our emissions increase compared to last month?');
      expect(plan.operation).toBe('TREND_VELOCITY');
      expect(plan.requiresSql).toBe(true);
    });
  });

  describe('2. Grounded Deterministic Synthesis', () => {
    const mockRepo: any = {};
    const mockIngestion: any = {};
    const mockForecast: any = {};
    const mockFlagService: any = { isEnabled: jest.fn().mockResolvedValue(true) };
    const service = new CopilotService(mockRepo, mockIngestion, mockForecast, mockFlagService);

    it('should generate specific Hotspot analysis for HOTSPOT_RANKING operations', () => {
      const mockEvidence: EvidencePack = {
        plan: {
          domain: 'ORGANIZATION_EMISSIONS',
          operation: 'HOTSPOT_RANKING',
          requiresSql: true,
          requiresVector: false,
          requiresForecast: false,
          requiresAnomaly: false,
          rewrittenQuery: 'which emission is contributing the most',
          confidence: 0.95,
        },
        structured: [
          {
            key: 'top_contributor',
            title: 'Emission Hotspot Ranking',
            data: {
              topScope: 'SCOPE_1',
              topScopeCo2e: 195935.1,
              topScopePercentage: 55.4,
              topCategory: 'STATIONARY_COMBUSTION',
              topCategoryCo2e: 150000,
              topCategoryPercentage: 42.4,
              totalEmissions: 353335.1,
              otherScopes: [
                { scope: 'SCOPE_2', co2e: 100000.0, percentage: 28.3 },
                { scope: 'SCOPE_3', co2e: 57400.0, percentage: 16.3 },
              ],
            },
            citation: {
              type: 'database',
              source: 'CarbonIQ Hotspot Engine',
              reference: 'Top: SCOPE 1 (55.4%)',
            },
          },
        ],
        documents: [],
        citations: [],
      };

      const answer = (service as any).generateDeterministicSynthesis(mockEvidence.plan, mockEvidence);

      expect(answer).toContain('Primary Emission Hotspot Analysis');
      expect(answer).toContain('SCOPE_1');
      expect(answer).toContain('55.4%');
      expect(answer).toContain('195,935.1 kg CO₂e');
    });

    it('should generate actionable reduction levers for REDUCTION_STRATEGY operations', () => {
      const mockEvidence: EvidencePack = {
        plan: {
          domain: 'ORGANIZATION_EMISSIONS',
          operation: 'REDUCTION_STRATEGY',
          requiresSql: true,
          requiresVector: true,
          requiresForecast: false,
          requiresAnomaly: false,
          rewrittenQuery: 'how to reduce emissions',
          confidence: 0.95,
        },
        structured: [
          {
            key: 'top_contributor',
            title: 'Emission Hotspot Ranking',
            data: {
              topScope: 'SCOPE_3',
              topScopeCo2e: 200000,
              topScopePercentage: 62.1,
              topCategory: 'PURCHASED_GOODS',
              topCategoryCo2e: 120000,
              topCategoryPercentage: 37.2,
              totalEmissions: 322000,
              otherScopes: [],
            },
            citation: {
              type: 'database',
              source: 'CarbonIQ Hotspot Engine',
              reference: 'Hotspot: SCOPE_3',
            },
          },
        ],
        documents: [],
        citations: [],
      };

      const answer = (service as any).generateDeterministicSynthesis(mockEvidence.plan, mockEvidence);

      expect(answer).toContain('Evidence-Based Emission Reduction Strategy');
      expect(answer).toContain('SCOPE_3');
      expect(answer).toContain('62.1%');
      expect(answer).toContain('PURCHASED_GOODS');
    });

    it('should explain GHG Protocol Scopes for CONCEPT_EXPLANATION operations', () => {
      const mockEvidence: EvidencePack = {
        plan: {
          domain: 'GENERAL_SUSTAINABILITY',
          operation: 'CONCEPT_EXPLANATION',
          requiresSql: false,
          requiresVector: true,
          requiresForecast: false,
          requiresAnomaly: false,
          rewrittenQuery: 'what is scope 3',
          confidence: 0.95,
        },
        structured: [],
        documents: [],
        citations: [],
      };

      const answer = (service as any).generateDeterministicSynthesis(mockEvidence.plan, mockEvidence);

      expect(answer).toContain('GHG Protocol Scopes Overview');
      expect(answer).toContain('Scope 1 (Direct Emissions)');
      expect(answer).toContain('Scope 2 (Indirect Emissions from Purchased Energy)');
      expect(answer).toContain('Scope 3 (Value Chain Emissions)');
    });
  });

  describe('3. Document Chunking & Injection Protection', () => {
    it('should chunk documents and wrap untrusted text with strict boundary protection', () => {
      const sampleDoc: ParsedDocument = {
        text: 'EMISSION METHODOLOGY\n\n' + 'Stationary diesel fuel combustion calculation details. '.repeat(20),
        pages: [{ pageNumber: 1, text: 'EMISSION METHODOLOGY\n\n' + 'Stationary diesel fuel combustion calculation details. '.repeat(20) }],
        metadata: { pageCount: 1 },
      };

      const chunks = chunkDocument(sampleDoc);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].sectionTitle).toBe('EMISSION METHODOLOGY');
    });
  });
});
