"""
CarbonIQ LangGraph Workflow Engine
Compiles Intent -> (SQL / ML Forecast / Vector) -> Guardrail -> Synthesis Graph.
"""
import logging
from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes.intent_node import extract_intent
from .nodes.sql_ledger_node import query_sql_ledger
from .nodes.forecast_node import query_forecast_engine
from .nodes.vector_node import query_vector_store
from .nodes.guardrail_node import validate_and_normalize_units
from .nodes.synthesis_node import synthesize_response

logger = logging.getLogger("ml-service.rag_graph.workflow")


def retrieve_all_tools(state: AgentState) -> dict:
    """Executes SQL, Forecast, and Vector retrievals in unified parallel pass."""
    intent = state.get("intent") or {}
    lower_msg = state["user_message"].lower()
    updates = {}

    # 1. SQL Ledger Retrieval (if needed or standard accounting)
    if intent.get("requires_sql", True) and intent.get("domain") != "OUT_OF_DOMAIN":
        sql_res = query_sql_ledger(state)
        updates.update(sql_res)
    else:
        updates["sql_evidence"] = None

    # 2. ML Forecast Retrieval (if requested or relevant)
    forecast_keywords = [
        "forecast", "predict", "projection", "next month", "future emission",
        "september", "october", "november", "december", "january", "february",
        "next quarter", "upcoming", "projected", "trend", "spike", "anomaly"
    ]
    needs_forecast = (
        intent.get("requires_forecast")
        or intent.get("domain") == "FORECAST_ANALYTICS"
        or intent.get("operation") in ["FORECAST", "FORECAST_EXPLANATION", "ANOMALY_DETECTION"]
        or any(kw in lower_msg for kw in forecast_keywords)
    )
    if needs_forecast and intent.get("domain") != "OUT_OF_DOMAIN":
        forecast_res = query_forecast_engine(state)
        updates.update(forecast_res)
    else:
        updates["forecast_evidence"] = None

    # 3. Vector Search Retrieval (if document search, general question, or mixed query)
    doc_keywords = ["document", "invoice", "bill", "pdf", "file", "uploaded", "receipt", "airwaybill", "bol", "tariff", "vendor", "supplier", "statement", "report"]
    needs_vector = (
        intent.get("requires_vector", False)
        or intent.get("domain") in ["DOCUMENT_KNOWLEDGE", "GENERAL_SUSTAINABILITY"]
        or any(kw in lower_msg for kw in doc_keywords)
    )
    if needs_vector and intent.get("domain") != "OUT_OF_DOMAIN":
        vec_res = query_vector_store(state)
        updates.update(vec_res)
    else:
        updates["vector_evidence"] = []

    return updates


def build_carbon_rag_graph():
    """Build and compile the LangGraph workflow."""
    workflow = StateGraph(AgentState)

    # Add Nodes
    workflow.add_node("extract_intent", extract_intent)
    workflow.add_node("retrieve_evidence", retrieve_all_tools)
    workflow.add_node("guardrail_validation", validate_and_normalize_units)
    workflow.add_node("synthesize_answer", synthesize_response)

    # Set Entry Point
    workflow.set_entry_point("extract_intent")

    # Add Edges
    workflow.add_edge("extract_intent", "retrieve_evidence")
    workflow.add_edge("retrieve_evidence", "guardrail_validation")
    workflow.add_edge("guardrail_validation", "synthesize_answer")
    workflow.add_edge("synthesize_answer", END)

    # Compile Graph
    app = workflow.compile()
    logger.info("CarbonIQ LangGraph RAG workflow compiled successfully")
    return app


# Singleton compiled graph instance
carbon_rag_app = build_carbon_rag_graph()


def run_rag_query(
    message: str,
    organization_id: str,
    user_id: str = "default_user",
    database_url: str = None,
    mistral_api_key: str = None,
    history: list = None,
) -> dict:
    """Entrypoint function to run a query through the LangGraph state machine."""
    import os
    db_url = database_url or os.getenv("DATABASE_URL", "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev?schema=public")
    api_key = mistral_api_key or os.getenv("LLM_API_KEY") or os.getenv("MISTRAL_API_KEY") or ""

    initial_state: AgentState = {
        "user_message": message,
        "organization_id": organization_id,
        "user_id": user_id,
        "database_url": db_url,
        "mistral_api_key": api_key,
        "conversation_history": history or [],
        "intent": None,
        "sql_evidence": None,
        "forecast_evidence": None,
        "vector_evidence": [],
        "validated_evidence": None,
        "evidence_pack": None,
        "unit_conversions": {},
        "final_answer": "",
        "citations": [],
        "query_type": "",
        "debug_trace": {},
        "errors": [],
    }

    final_state = carbon_rag_app.invoke(initial_state)

    return {
        "answer": final_state.get("final_answer", ""),
        "citations": final_state.get("citations", []),
        "query_type": final_state.get("query_type", "ORGANIZATION_EMISSIONS:CURRENT_TOTAL"),
        "intent": final_state.get("intent", {}),
        "validated_evidence": final_state.get("validated_evidence", {}),
        "evidence_pack": final_state.get("evidence_pack", {}),
        "debug_trace": final_state.get("debug_trace", {}),
        "execution_trace": ["extract_intent", "retrieve_evidence", "guardrail_validation", "synthesize_answer"],
    }


execute_rag_pipeline = run_rag_query
