import OpenAI from 'openai';
import { QueryPlan, QueryDomain, QueryOperation } from './copilot.types';
import { env } from '../../config/env.schema';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('QueryPlanner');

/**
 * QueryPlanner — Converts arbitrary natural language user queries + conversation history
 * into an actionable, structured QueryPlan specifying required data operations and filters.
 */
export class QueryPlanner {
  private openai: OpenAI | null = null;

  private getOpenAI(): OpenAI | null {
    if (!this.openai) {
      const key = env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
      if (!key || key.includes('REPLACE_') || key.includes('YOUR_') || key.length < 15) {
        return null;
      }
      this.openai = new OpenAI({
        apiKey: key,
        baseURL: env.LLM_BASE_URL || 'https://api.openai.com/v1',
        timeout: 3500,
        maxRetries: 0,
      });
    }
    return this.openai;
  }

  /**
   * Plan a query by leveraging LLM query planning with a deep semantic fallback engine.
   */
  async planQuery(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<QueryPlan> {
    const raw = message.trim();

    // 1. Check quick conversational shortcuts
    if (/^(hi|hii|hiii|hello|hey|heyy|howdy|greetings|good\s+(morning|afternoon|evening|day)|yo)\b[!.,?]*$/i.test(raw) ||
        /^(thanks|thank\s+you|thx|cheers|bye|goodbye)\b[!.,?]*$/i.test(raw) ||
        raw.toLowerCase() === 'help' || raw.toLowerCase() === 'who are you') {
      return {
        domain: 'CONVERSATIONAL',
        operation: 'GREETING',
        requiresSql: false,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.99,
      };
    }

    // 2. Try LLM Planning if API is configured
    const client = this.getOpenAI();
    if (client) {
      try {
        const plan = await this.planWithLLM(client, raw, conversationHistory);
        if (plan) return plan;
      } catch (err: any) {
        logger.warn({ error: err.message }, 'LLM query planning failed, falling back to semantic engine');
      }
    }

    // 3. Fallback to resilient semantic query planner
    return this.semanticPlan(raw, conversationHistory);
  }

  /**
   * Plan using LLM Structured Output
   */
  private async planWithLLM(
    client: OpenAI,
    message: string,
    history: Array<{ role: string; content: string }>,
  ): Promise<QueryPlan | null> {
    const systemPrompt = `You are CarbonIQ's Query Planning Engine.
Your task is to analyze the user's natural language question and recent conversation history, and output a structured JSON execution plan.

DOMAINS:
- ORGANIZATION_EMISSIONS: Questions about the user's actual emissions data, numbers, scopes, categories, trends, periods.
- DOCUMENT_KNOWLEDGE: Questions asking about uploaded documents, invoices, bills, reports, document counts, file metadata.
- FINANCIAL_CARBON_ANALYTICS: Financial impact of carbon, carbon tax exposure, monetary savings, MACC abatement ROI.
- GENERAL_SUSTAINABILITY: Conceptual questions (e.g., "What is Scope 3?", "Explain GHG protocol").
- FORECAST_ANALYTICS: Forecasts, next month targets, projections.
- OUT_OF_DOMAIN: Questions unrelated to carbon/sustainability (e.g. coding, games, recipes).
- AMBIGUOUS: Too vague to answer without clarification (e.g. "What was it?", "Show data").

OPERATIONS:
- CURRENT_TOTAL (current/latest total footprint)
- PERIOD_EMISSIONS (emissions for a specific month e.g. August, July)
- SCOPE_BREAKDOWN (Scope 1, 2, or 3 metrics)
- CATEGORY_BREAKDOWN (e.g. transportation, electricity, purchased goods, diesel)
- TREND_VELOCITY (are emissions increasing, velocity, trajectory)
- PERIOD_COMPARISON (compare July and August)
- HIGHEST_MONTH (which month had peak emissions)
- HOTSPOT_RANKING (which emission/scope is highest/contributes most)
- SUPPLIER_ANALYSIS (supplier/vendor emissions)
- METHODOLOGY_AUDIT (emission factor, calculation method used)
- REDUCTION_STRATEGY (how to reduce, decarbonization plan)
- FORECAST_PROJECTION (next month prediction)
- ANOMALY_OUTLIER (unusual spike, anomaly)
- DOCUMENT_SEARCH (search uploaded PDF/DOCX content)
- DOCUMENT_STATISTICS (total uploaded documents, document counts, list files)
- FINANCIAL_CARBON_COST (carbon tax liability, shadow carbon price, financial risk)
- CARBON_OPTIMIZATION_ROI (monetary savings, decarbonization ROI, MACC curve)
- INTENSITY_ANALYSIS (carbon intensity per revenue, per employee, per sqm, benchmarking)
- YOY_COMPARISON (year-over-year or month-over-month emission trend comparison)
- COMPLIANCE_STATUS (regulatory readiness for ISO 14064, BRSR, CDP, GHG Protocol)
- CARBON_PRICING (carbon tax exposure, EU ETS price, shadow carbon pricing)
- EMISSION_FACTOR_AUDIT (which emission factors are used, source traceability, factor coverage)
- CONCEPT_EXPLANATION (explain GHG standard or term)
- OUT_OF_DOMAIN
- CLARIFICATION

OUTPUT STRICT JSON matching:
{
  "domain": string,
  "operation": string,
  "scopeFilter": "SCOPE_1" | "SCOPE_2" | "SCOPE_3" | "ALL" | null,
  "categoryFilter": string | null,
  "monthFilter": string | null,
  "comparisonMonths": [string, string] | null,
  "requiresSql": boolean,
  "requiresVector": boolean,
  "requiresForecast": boolean,
  "requiresAnomaly": boolean,
  "rewrittenQuery": string,
  "confidence": number
}`;

    const recentHistory = history.slice(-4).map((h) => `${h.role}: ${h.content}`).join('\n');
    const userPrompt = `HISTORY:\n${recentHistory || 'No previous history'}\n\nUSER QUESTION: "${message}"\n\nReturn JSON QueryPlan:`;

    let targetModel = env.LLM_MODEL || 'gpt-4o';
    if (targetModel.includes('gemini-1.') || targetModel.includes('gemini-2.') || targetModel === 'gemini-1.5-flash') {
      targetModel = 'gemini-3.8-flash';
    }

    const res = await client.chat.completions.create({
      model: targetModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const content = res.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      domain: parsed.domain || 'ORGANIZATION_EMISSIONS',
      operation: parsed.operation || 'CURRENT_TOTAL',
      scopeFilter: parsed.scopeFilter || undefined,
      categoryFilter: parsed.categoryFilter || undefined,
      monthFilter: parsed.monthFilter || undefined,
      comparisonMonths: parsed.comparisonMonths || undefined,
      requiresSql: parsed.requiresSql ?? true,
      requiresVector: parsed.requiresVector ?? false,
      requiresForecast: parsed.requiresForecast ?? false,
      requiresAnomaly: parsed.requiresAnomaly ?? false,
      rewrittenQuery: parsed.rewrittenQuery || message,
      confidence: parsed.confidence || 0.9,
    };
  }

  /**
   * Resilient Semantic Query Planner
   */
  private semanticPlan(
    message: string,
    history: Array<{ role: string; content: string }>,
  ): QueryPlan {
    const raw = message.trim();
    const text = raw.toLowerCase();

    // Out-of-Domain Checks
    const isOutOfDomain =
      /\b(write|create|generate|play|code|implement|solve)\s+(a\s+)?(python|java|javascript|c\+\+|rust|php|sql|game|snake|tetris|poem|song|story|joke|riddle|homework|essay|math\s+problem)\b/i.test(text) ||
      /\b(recipe|weather\s+in|stock\s+price|horoscope|crypto|bitcoin|translate\s+to|capital\s+of)\b/i.test(text);

    if (isOutOfDomain && !text.includes('carbon') && !text.includes('emission') && !text.includes('sustainability')) {
      return {
        domain: 'OUT_OF_DOMAIN',
        operation: 'OUT_OF_DOMAIN',
        requiresSql: false,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.98,
      };
    }

    // Ambiguous queries
    if (/^(what\s+was\s+the\s+emission|show\s+me\s+data|tell\s+me|calculate|what\s+is\s+it)\??$/i.test(raw) || raw.length <= 4) {
      return {
        domain: 'AMBIGUOUS',
        operation: 'CLARIFICATION',
        requiresSql: false,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.9,
      };
    }

    // Resolve Month References
    const monthsMap: Record<string, string> = {
      january: '01', feb: '02', february: '02', mar: '03', march: '03',
      apr: '04', april: '04', may: '05', jun: '06', june: '06',
      jul: '07', july: '07', aug: '08', august: '08', sep: '09',
      september: '09', oct: '10', october: '10', nov: '11', november: '11',
      dec: '12', december: '12',
    };

    let detectedMonth: string | undefined;
    for (const [mName, mNum] of Object.entries(monthsMap)) {
      if (new RegExp(`\\b${mName}\\b`, 'i').test(text)) {
        detectedMonth = `2026-${mNum}`;
        break;
      }
    }

    // Detect Scopes (Ignore if asking across all scopes or total footprint)
    let detectedScope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3' | undefined;
    if (text.includes('scope 1, 2') || text.includes('scope 1 and 2') || text.includes('scope 1, 2 and 3') ||
        text.includes('all scopes') || text.includes('across scope') || text.includes('total carbon footprint') ||
        text.includes('total footprint') || text.includes('total emissions')) {
      detectedScope = undefined;
    } else if (/\bscope\s*1\b/i.test(text)) {
      detectedScope = 'SCOPE_1';
    } else if (/\bscope\s*2\b/i.test(text)) {
      detectedScope = 'SCOPE_2';
    } else if (/\bscope\s*3\b/i.test(text)) {
      detectedScope = 'SCOPE_3';
    }

    // Detect Categories/Keywords
    let detectedCategory: string | undefined;
    if (text.includes('transport') || text.includes('freight') || text.includes('flight') || text.includes('travel') || text.includes('shipping') || text.includes('logistics')) {
      detectedCategory = 'TRANSPORT';
    } else if (text.includes('electric') || text.includes('power') || text.includes('kwh') || text.includes('utility')) {
      detectedCategory = 'ELECTRICITY';
    } else if (text.includes('purchased') || text.includes('goods') || text.includes('steel') || text.includes('material')) {
      detectedCategory = 'PURCHASED_GOODS';
    } else if (text.includes('diesel') || text.includes('fuel') || text.includes('combustion') || text.includes('gas')) {
      detectedCategory = 'FUEL';
    } else if (text.includes('waste') || text.includes('landfill')) {
      detectedCategory = 'WASTE';
    }

    // 1. Document Statistics & Metadata (total/count/list/status/how many)
    if (text.includes('total uploaded documents') || text.includes('how many documents') ||
        text.includes('document count') || text.includes('list my documents') || text.includes('show uploaded files') ||
        (text.includes('document') && (text.includes('total') || text.includes('how many') || text.includes('count') || text.includes('list') || text.includes('status')))) {
      return {
        domain: 'DOCUMENT_KNOWLEDGE',
        operation: 'DOCUMENT_STATISTICS',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.96,
      };
    }

    // 2. Specific Document Search (by filename, vendor, BOL, invoice, or content search)
    const isVendorQuery = ["tata power", "tata steel", "tata", "conedison", "coned", "vattenfall", "cat power", "caterpillar", "atmos", "atmos energy", "maersk", "lufthansa"].some((v) => text.includes(v));
    const isDocQuery =
      isVendorQuery ||
      text.includes('.pdf') || text.includes('.docx') || text.includes('.csv') ||
      text.includes('uploaded document') || text.includes('uploaded report') || text.includes('invoice') ||
      text.includes('bill') || text.includes('numbers provided by') || text.includes('list me numbers') ||
      text.includes('numbers on my') || text.includes('values on my') || text.includes('extracted from') ||
      text.includes('bol') || text.includes('find the freight') || text.includes('find the emission') ||
      text.includes('supporting document') || text.includes('documents support') || text.includes('support our scope') ||
      (text.includes('document') && (text.includes('say') || text.includes('find') || text.includes('search')));

    if (isDocQuery) {
      return {
        domain: 'DOCUMENT_KNOWLEDGE',
        operation: 'DOCUMENT_SEARCH',
        categoryFilter: detectedCategory,
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.99,
      };
    }

    // 3. General Conceptual Sustainability & Methodology Terms
    if (text.includes('spend-based') || text.includes('activity-based') || text.includes('eeio') ||
        text.includes('market-based') || text.includes('location-based') ||
        text.includes('15 scope 3 categories') || text.includes('ghg protocol') || text.includes('difference between') ||
        (text.startsWith('what is scope') && !text.includes('my') && !text.includes('our'))) {
      return {
        domain: 'GENERAL_SUSTAINABILITY',
        operation: 'CONCEPT_EXPLANATION',
        scopeFilter: detectedScope,
        requiresSql: false,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.96,
      };
    }

    // 3. Carbon Optimization & Decarbonization ROI (MACC & Financial Levers)
    if (text.includes('roi') || text.includes('macc') || text.includes('abatement cost') ||
        text.includes('save money') || text.includes('cost savings') || text.includes('optimize money') ||
        text.includes('optimise money') || text.includes('monetary savings') || text.includes('marginal abatement') ||
        text.includes('solar ppa') || text.includes('net-profitable') || text.includes('opex') || text.includes('cost savings per kwh')) {
      return {
        domain: 'FINANCIAL_CARBON_ANALYTICS',
        operation: 'CARBON_OPTIMIZATION_ROI',
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.95,
      };
    }

    // 4. Financial Carbon Pricing & Tax Exposure
    if (text.includes('carbon tax') || text.includes('carbon price') || text.includes('cost of our emissions') ||
        text.includes('financial cost') || text.includes('tax liability') || text.includes('shadow price') ||
        text.includes('financial impact') || text.includes('tax exposure') || text.includes('how much money') ||
        text.includes('cost of carbon')) {
      return {
        domain: 'FINANCIAL_CARBON_ANALYTICS',
        operation: 'FINANCIAL_CARBON_COST',
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.94,
      };
    }

    // 4b. Carbon Intensity Analysis
    if (text.includes('intensity') || text.includes('per employee') || text.includes('per fte') ||
        text.includes('per revenue') || text.includes('per sqm') || text.includes('per square') ||
        text.includes('benchmark') || text.includes('per unit') || text.includes('carbon efficiency') ||
        text.includes('emission rate') || text.includes('normaliz')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'INTENSITY_ANALYSIS',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.94,
      };
    }

    // 4c. Year-over-Year / Month-over-Month Comparison
    if (text.includes('year over year') || text.includes('year-over-year') || text.includes('yoy') ||
        text.includes('month over month') || text.includes('month-over-month') || text.includes('mom') ||
        text.includes('compared to last year') || text.includes('same month last year') ||
        text.includes('are our emissions increasing') || text.includes('emission trend') ||
        text.includes('going up or down') || text.includes('getting better') || text.includes('getting worse') ||
        text.includes('changed over time') || text.includes('progress over time')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'YOY_COMPARISON',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.94,
      };
    }

    // 4d. Compliance Readiness Assessment
    if (text.includes('compliance') || text.includes('compliant') || text.includes('iso 14064') ||
        text.includes('brsr') || text.includes('cdp') || text.includes('gri') || text.includes('tcfd') ||
        text.includes('regulatory') || text.includes('reporting standard') || text.includes('data completeness') ||
        text.includes('audit ready') || text.includes('readiness') || text.includes('are we ready') ||
        text.includes('report ready') || text.includes('ready to report')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'COMPLIANCE_STATUS',
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.95,
      };
    }

    // 4e. Carbon Pricing Exposure
    if (text.includes('carbon pric') || text.includes('eu ets') || text.includes('carbon market') ||
        text.includes('emission trading') || text.includes('cap and trade') || text.includes('cap-and-trade') ||
        text.includes('carbon credit') || text.includes('carbon offset') || text.includes('carbon liability') ||
        text.includes('sbti') || text.includes('science based target') || text.includes('net zero') ||
        text.includes('1.5 degree') || text.includes('1.5°') || text.includes('paris agreement') ||
        text.includes('how much would we pay')) {
      return {
        domain: 'FINANCIAL_CARBON_ANALYTICS',
        operation: 'CARBON_PRICING',
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.94,
      };
    }

    // 4f. Emission Factor Audit
    if (text.includes('emission factor') || text.includes('how many factors') || text.includes('factor library') ||
        text.includes('which factors') || text.includes('factor source') || text.includes('defra') ||
        text.includes('epa') || text.includes('glec') || text.includes('ipcc') || text.includes('factor audit') ||
        text.includes('factor coverage') || text.includes('factor database')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'EMISSION_FACTOR_AUDIT',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.94,
      };
    }

    // 5. Forecast Inquiries & Scenario Analysis
    if (text.includes('forecast') || text.includes('predict') || text.includes('next month') ||
        text.includes('future') || text.includes('projection') || text.includes('target') ||
        text.includes('will my emissions be') || text.includes('bend our') || text.includes('trajectory projected') ||
        text.includes('baseline drivers')) {
      return {
        domain: 'FORECAST_ANALYTICS',
        operation: 'FORECAST_PROJECTION',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: true,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.95,
      };
    }

    // 6. Anomaly & Outlier Inquiries
    if (text.includes('anomaly') || text.includes('anomalies') || text.includes('unusual') ||
        text.includes('spike') || text.includes('abnormal') || text.includes('unexpected')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'ANOMALY_OUTLIER',
        monthFilter: detectedMonth,
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: true,
        rewrittenQuery: raw,
        confidence: 0.92,
      };
    }

    // 7. Peak / Highest Month Inquiries
    if (text.includes('highest month') || text.includes('peak month') || text.includes('most emissions in a month') ||
        text.includes('when were emissions highest') || text.includes('which month had the highest')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'HIGHEST_MONTH',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.95,
      };
    }


    // 9. Hotspot / Top Contributor Ranking & Priority
    if (text.includes('most contributing') || text.includes('contributing the most') || text.includes('largest contributor') ||
        text.includes('highest emission') || text.includes('biggest source') || text.includes('top emitter') ||
        text.includes('main contributor') || text.includes('largest emission source') || text.includes('largest source') ||
        text.includes('highest scope') || text.includes('largest scope') || text.includes('largest category') ||
        text.includes('contributes most') || text.includes('which scope is highest') || text.includes('which category contributes most') ||
        text.includes('highest percentage') || text.includes('contributes the highest') || text.includes('single largest')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'HOTSPOT_RANKING',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.95,
      };
    }

    // 10. Methodology & Calculation Audit Inquiries
    if (text.includes('calculation method') || text.includes('emission factor') || text.includes('factor was used') ||
        text.includes('formula was used') || text.includes('formula used') || text.includes('audit trail') ||
        text.includes('how was it calculated') || text.includes('mathematical audit') || text.includes('standard (ipcc')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'METHODOLOGY_AUDIT',
        categoryFilter: detectedCategory,
        scopeFilter: detectedScope,
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.93,
      };
    }

    // 7. Reduction & Decarbonization Strategy
    if (text.includes('how to reduce') || text.includes('how can i reduce') || text.includes('how do we reduce') ||
        text.includes('what can i do to reduce') || text.includes('what should i reduce first') ||
        text.includes('reduction plan') || text.includes('decarbonization') || text.includes('cut emissions') ||
        text.includes('cut our emissions') || text.includes('how do we cut') ||
        text.includes('lower emissions') || text.includes('reduction opportunity') || text.includes('recommendations based on my emissions') ||
        text.includes('give me recommendations')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'REDUCTION_STRATEGY',
        scopeFilter: detectedScope,
        categoryFilter: detectedCategory,
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.93,
      };
    }

    // 6. Methodology & Emission Factor Inquiries
    if (text.includes('calculation method') || text.includes('emission factor') || text.includes('factor was used') ||
        text.includes('formula was used') || text.includes('formula used') || text.includes('audit trail') || text.includes('how was it calculated')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'METHODOLOGY_AUDIT',
        categoryFilter: detectedCategory,
        scopeFilter: detectedScope,
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.9,
      };
    }

    // 9. Trend & Velocity Inquiries (Prioritized before basic scope/category filters)
    if (text.includes('why did') || text.includes('why was') || text.includes('trend') ||
        text.includes('increasing') || text.includes('decreasing') || text.includes('growing') ||
        text.includes('velocity') || text.includes('trajectory') || text.includes('increase') || text.includes('increased')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'TREND_VELOCITY',
        scopeFilter: detectedScope,
        monthFilter: detectedMonth,
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.92,
      };
    }

    // 8. Period-to-Period Comparison Inquiries
    if ((text.includes('compare') || text.includes('vs') || text.includes('versus')) &&
        (text.includes('july') || text.includes('august') || text.includes('month') || text.includes('year'))) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'PERIOD_COMPARISON',
        comparisonMonths: ['2026-07', '2026-08'],
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.92,
      };
    }

    // 10. General Conceptual Sustainability Questions
    if ((text.startsWith('what is scope') || text.startsWith('define scope') || text.startsWith('explain scope') ||
         text.includes('15 scope 3 categories') || text.includes('what are scope 3 categories') ||
         text.includes('ghg protocol') || text.includes('glec') || text.includes('sbti') ||
         text.includes('spend-based') || text.includes('activity-based') || text.includes('location-based vs market-based')) &&
        !text.includes('my') && !text.includes('our') && !text.includes('recorded')) {
      return {
        domain: 'GENERAL_SUSTAINABILITY',
        operation: 'CONCEPT_EXPLANATION',
        scopeFilter: detectedScope,
        requiresSql: false,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.95,
      };
    }

    // 11. Document Statistics & Metadata
    if (text.includes('total uploaded documents') || text.includes('how many documents') ||
        text.includes('document count') || text.includes('list my documents') ||
        text.includes('show uploaded files') || text.includes('uploaded docs') ||
        text.includes('list documents') || text.includes('all documents') ||
        text === 'total documents' || text === 'documents') {
      return {
        domain: 'DOCUMENT_KNOWLEDGE',
        operation: 'DOCUMENT_STATISTICS',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.96,
      };
    }

    // 14. Specific Document Search
    if (text.includes('uploaded document') || text.includes('uploaded report') || text.includes('invoice') ||
        text.includes('bol') || text.includes('pdf say') || text.includes('find the emission-related information in my uploaded document') ||
        text.includes('documents support this') || text.includes('what does my uploaded document say')) {
      return {
        domain: 'DOCUMENT_KNOWLEDGE',
        operation: 'DOCUMENT_SEARCH',
        requiresSql: true,
        requiresVector: true,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.92,
      };
    }

    // 12. Specific Scope Breakdown Inquiry (e.g. "What are my Scope 3 emissions?")
    if (detectedScope) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'SCOPE_BREAKDOWN',
        scopeFilter: detectedScope,
        monthFilter: detectedMonth,
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.93,
      };
    }

    // 13. Specific Category Inquiry (e.g. "How much did transportation contribute?")
    if (detectedCategory) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'CATEGORY_BREAKDOWN',
        categoryFilter: detectedCategory,
        monthFilter: detectedMonth,
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.92,
      };
    }

    // 14. Specific Month / Time Period Emissions (e.g. "What was our carbon footprint in August?", "How much carbon did we emit this month?")
    if (detectedMonth || text.includes('this month') || text.includes('last month') || text.includes('in august') || text.includes('in july')) {
      return {
        domain: 'ORGANIZATION_EMISSIONS',
        operation: 'PERIOD_EMISSIONS',
        monthFilter: detectedMonth || 'latest',
        requiresSql: true,
        requiresVector: false,
        requiresForecast: false,
        requiresAnomaly: false,
        rewrittenQuery: raw,
        confidence: 0.93,
      };
    }

    // 15. General Total Emissions / Current Footprint (e.g. "What are my current emissions?", "Show me our latest emissions", "How much have we emitted?")
    return {
      domain: 'ORGANIZATION_EMISSIONS',
      operation: 'CURRENT_TOTAL',
      scopeFilter: 'ALL',
      requiresSql: true,
      requiresVector: false,
      requiresForecast: false,
      requiresAnomaly: false,
      rewrittenQuery: raw,
      confidence: 0.85,
    };
  }
}
