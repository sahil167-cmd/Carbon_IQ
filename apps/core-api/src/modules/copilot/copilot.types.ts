/**
 * CarbonIQ Hybrid Copilot — Enhanced Type Definitions & Query Plan Schemas
 */

import { ScopeType } from '@prisma/client';

// ── Query Domain & Operations ────────────────────────────────────────────────

export type QueryDomain =
  | 'ORGANIZATION_EMISSIONS'
  | 'DOCUMENT_KNOWLEDGE'
  | 'GENERAL_SUSTAINABILITY'
  | 'FORECAST_ANALYTICS'
  | 'FINANCIAL_CARBON_ANALYTICS'
  | 'CONVERSATIONAL'
  | 'OUT_OF_DOMAIN'
  | 'AMBIGUOUS';

export type QueryOperation =
  | 'CURRENT_TOTAL'
  | 'PERIOD_EMISSIONS'
  | 'SCOPE_BREAKDOWN'
  | 'CATEGORY_BREAKDOWN'
  | 'TREND_VELOCITY'
  | 'PERIOD_COMPARISON'
  | 'HIGHEST_MONTH'
  | 'HOTSPOT_RANKING'
  | 'SUPPLIER_ANALYSIS'
  | 'METHODOLOGY_AUDIT'
  | 'REDUCTION_STRATEGY'
  | 'FORECAST_PROJECTION'
  | 'ANOMALY_OUTLIER'
  | 'DOCUMENT_SEARCH'
  | 'DOCUMENT_STATISTICS'
  | 'FINANCIAL_CARBON_COST'
  | 'CARBON_OPTIMIZATION_ROI'
  | 'INTENSITY_ANALYSIS'
  | 'YOY_COMPARISON'
  | 'COMPLIANCE_STATUS'
  | 'CARBON_PRICING'
  | 'EMISSION_FACTOR_AUDIT'
  | 'CONCEPT_EXPLANATION'
  | 'GREETING'
  | 'OUT_OF_DOMAIN'
  | 'CLARIFICATION';

export interface QueryPlan {
  domain: QueryDomain;
  operation: QueryOperation;
  scopeFilter?: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3' | 'ALL';
  categoryFilter?: string;              // e.g. 'TRANSPORT', 'ELECTRICITY', 'PURCHASED_GOODS', 'DIESEL', 'STEEL'
  monthFilter?: string;                 // e.g. '2026-08', '2026-07', 'latest', 'previous'
  comparisonMonths?: [string, string];  // e.g. ['2026-07', '2026-08']
  requiresSql: boolean;
  requiresVector: boolean;
  requiresForecast: boolean;
  requiresAnomaly: boolean;
  rewrittenQuery: string;
  confidence: number;
}

// ── Citations ────────────────────────────────────────────────────────────────

export interface DatabaseCitation {
  type: 'database';
  source: string;       // e.g., "CarbonIQ Emission Ledger", "Calculation Audit Log"
  reference: string;    // e.g., "August 2026", "Scope 2 — Electricity"
  value?: string;       // e.g., "94,208 kg CO₂e"
}

export interface DocumentCitation {
  type: 'document';
  documentId: string;
  filename: string;
  page?: number;
  section?: string;
  chunkId?: string;
  score?: number;
}

export type Citation = DatabaseCitation | DocumentCitation;

// ── Evidence Pack ────────────────────────────────────────────────────────────

export interface StructuredEvidenceItem {
  key: string;
  title: string;
  data: Record<string, unknown>;
  citation: DatabaseCitation;
}

export interface DocumentEvidenceChunk {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkText: string;
  page?: number;
  section?: string;
  score: number;
  citation: DocumentCitation;
}

export interface EvidencePack {
  plan: QueryPlan;
  structured: StructuredEvidenceItem[];
  documents: DocumentEvidenceChunk[];
  forecast?: Record<string, unknown>;
  anomalies?: Record<string, unknown>;
  computedSummary?: {
    headline: string;
    totalCo2e?: number;
    difference?: number;
    percentageChange?: number;
    topEntity?: string;
    metrics?: Record<string, any>;
  };
  citations: Citation[];
}

// ── API Payloads ─────────────────────────────────────────────────────────────

export interface CopilotQueryRequest {
  sessionId?: string;
  message: string;
}

export interface CopilotDebugTelemetry {
  queryPlan: QueryPlan;
  structuredCount: number;
  documentChunksCount: number;
  citationsCount: number;
  latencyMs: number;
}

export interface CopilotQueryResponse {
  sessionId: string;
  messageId: string;
  answer: string;
  citations: Citation[];
  queryType: string;
  debug?: CopilotDebugTelemetry;
}

export interface CopilotSessionDTO {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface CopilotMessageDTO {
  id: string;
  role: string;
  content: string;
  citations: Citation[] | null;
  createdAt: string;
}

export interface StarterQuestion {
  question: string;
  category: string;
  icon: string;
  badge?: string;
}

// ── Ingestion & Parser Types ─────────────────────────────────────────────────

export interface ParsedDocument {
  text: string;
  pages: { pageNumber: number; text: string }[];
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
}

export interface DocumentChunk {
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  pageNumber?: number;
  sectionTitle?: string;
}

export interface IngestionResult {
  documentId: string;
  filename: string;
  status: 'READY' | 'FAILED';
  chunksCreated: number;
  totalTokens: number;
  errorMessage?: string;
}

// ── Structured Analytics Formats ─────────────────────────────────────────────

export interface MonthlyEmissionRecord {
  month: string;       // YYYY-MM
  monthDate: Date;
  totalCo2e: number;
  scope1: number;
  scope2: number;
  scope3: number;
  docCount: number;
}

export interface ScopeBreakdownItem {
  scope: string;
  totalCo2e: number;
  percentage: number;
}

export interface CategoryBreakdownItem {
  category: string;
  method: string;
  scope: string;
  totalCo2e: number;
  percentage: number;
  docCount: number;
}
