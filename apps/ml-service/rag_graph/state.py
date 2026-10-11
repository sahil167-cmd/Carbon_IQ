"""
Typed State Definitions for CarbonIQ Python LangGraph Dual-Path RAG Engine.
Strict separation of Deterministic Structured Evidence vs Unstructured Document Retrieval.
"""
from typing import Dict, Any, List, Optional, TypedDict
from pydantic import BaseModel, Field


class Citation(BaseModel):
    type: str = "database"  # 'database' | 'document' | 'ml_forecast'
    source: str
    reference: str
    value: Optional[str] = None
    page: Optional[int] = None
    documentId: Optional[str] = None
    filename: Optional[str] = None


class QueryIntent(BaseModel):
    domain: str = "ORGANIZATION_EMISSIONS"
    operation: str = "CURRENT_TOTAL"
    scope_filter: Optional[str] = None  # 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3' | 'ALL'
    category_filter: Optional[str] = None
    month_filter: Optional[str] = None
    comparison_months: Optional[List[str]] = None
    doc_query: Optional[str] = None
    requires_sql: bool = True
    requires_forecast: bool = False
    requires_vector: bool = False
    confidence: float = 0.95
    rewritten_query: str = ""


class EvidencePack(BaseModel):
    question: str
    intent: str
    tenant_id: str
    ledger_is_empty: bool = False
    structured_evidence: Optional[Dict[str, Any]] = None
    supporting_periods: Optional[List[Dict[str, Any]]] = None
    document_evidence: Optional[List[Dict[str, Any]]] = None
    forecast_evidence: Optional[Dict[str, Any]] = None
    source: Optional[Dict[str, Any]] = None


class AgentState(TypedDict):
    # Inputs
    user_message: str
    organization_id: str
    user_id: str
    database_url: str
    mistral_api_key: str
    conversation_history: List[Dict[str, str]]

    # Step 1: Extracted Intent & Entities
    intent: Optional[Dict[str, Any]]

    # Step 2: Retrieved Evidence Packs
    sql_evidence: Optional[Dict[str, Any]]
    forecast_evidence: Optional[Dict[str, Any]]
    vector_evidence: List[Dict[str, Any]]

    # Step 3: Guardrail & Unit-Checked Evidence
    validated_evidence: Optional[Dict[str, Any]]
    evidence_pack: Optional[Dict[str, Any]]
    unit_conversions: Dict[str, Any]

    # Step 4: Final Synthesis & Audit Citations
    final_answer: str
    citations: List[Dict[str, Any]]
    query_type: str
    debug_trace: Dict[str, Any]
    errors: List[str]
