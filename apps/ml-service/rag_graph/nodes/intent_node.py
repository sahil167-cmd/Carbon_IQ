"""
Intent Extraction Node — LangGraph
General domain intent recognition & conversational entity parsing using Mistral LLM with fast fallback.
"""
import re
import json
import logging
from typing import Dict, Any, List, Optional
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from ..state import AgentState

logger = logging.getLogger("ml-service.rag_graph.intent")

INTENT_SYSTEM_PROMPT = """You are CarbonIQ's Neural Query Intent Classifier.
Classify the user's carbon accounting question into domain, operation, required data sources, and extracted entities.

DOMAINS & OPERATIONS:
1. DOMAIN: ORGANIZATION_EMISSIONS
   - TOTAL_EMISSIONS: Overall carbon footprint, total emissions, ledger totals.
   - SCOPE_EMISSIONS: Scope 1, Scope 2, Scope 3 totals, percentages, or scope comparisons.
   - CATEGORY_EMISSIONS: Specific category (diesel combustion, electricity, natural gas, freight, steel, etc.).
   - SUPPLIER_EMISSIONS: Top emitting suppliers, vendor breakdowns.
   - LOWEST_EMISSION_PERIOD: Period/month with minimum carbon emissions.
   - HIGHEST_EMISSION_PERIOD: Period/month with peak/maximum carbon emissions.
   - PERIOD_COMPARISON: Comparing specific reporting periods (e.g. July vs August).
   - EMISSION_DRIVER_ANALYSIS: Explaining historical increase, drivers, activity breakdown.

2. DOMAIN: DOCUMENT_KNOWLEDGE
   - DOCUMENT_LOOKUP: Listing documents, showing invoices, finding files.
   - DOCUMENT_CONTENT: Extracting numbers/details from uploaded invoices, bills, airwaybills, BOLs, PDFs.
   - DOCUMENT_COUNT: Number of documents/invoices uploaded.

3. DOMAIN: FORECAST_ANALYTICS
   - FORECAST: Projections, next month emissions, future trajectory.
   - FORECAST_EXPLANATION: Why forecast is increasing/decreasing, forecast drivers.
   - ANOMALY_DETECTION: Identifying spikes, abnormal months, one-off leaks.

4. DOMAIN: FINANCIAL_CARBON_ANALYTICS
   - CARBON_TAX: Carbon tax exposure, shadow pricing in INR, USD, EUR, GBP, EU ETS.
   - MACC: Marginal abatement cost curves, energy efficiency ROI.
   - CARBON_REDUCTION: Decarbonization roadmap, reduction strategies, SBTi.

5. DOMAIN: GENERAL_SUSTAINABILITY
   - GENERAL_CARBON_KNOWLEDGE: Standards definitions (Scope 1/2/3, market vs location Scope 2, Scope 3 categories 1-15, GLEC, GHG Protocol).

6. DOMAIN: CONVERSATIONAL / OUT_OF_DOMAIN
   - GREETING: Hello, hi, help.
   - OUT_OF_DOMAIN: Sports, cooking, general non-sustainability questions.

OUTPUT STRICT JSON ONLY:
{
  "domain": "ORGANIZATION_EMISSIONS" | "DOCUMENT_KNOWLEDGE" | "FORECAST_ANALYTICS" | "FINANCIAL_CARBON_ANALYTICS" | "GENERAL_SUSTAINABILITY" | "CONVERSATIONAL" | "OUT_OF_DOMAIN",
  "operation": string,
  "scope_filter": "SCOPE_1" | "SCOPE_2" | "SCOPE_3" | "ALL" | null,
  "category_filter": string | null,
  "month_filter": string | null,
  "doc_query": string | null,
  "requires_sql": boolean,
  "requires_forecast": boolean,
  "requires_vector": boolean,
  "confidence": number,
  "rewritten_query": string
}"""


def _extract_month_from_text(text: str) -> Optional[str]:
    """Extract month normalized to YYYY-MM."""
    text_lower = text.lower()
    months = [
        ("january", "2026-01"), ("february", "2026-02"), ("march", "2026-03"),
        ("april", "2026-04"), ("may", "2026-05"), ("june", "2026-06"),
        ("july", "2026-07"), ("august", "2026-08"), ("september", "2026-09"),
        ("october", "2026-10"), ("november", "2026-11"), ("december", "2026-12"),
    ]
    for name, code in months:
        if name in text_lower or name[:3] in text_lower:
            return code
    m = re.search(r'202\d-\d{2}', text)
    if m:
        return m.group(0)
    return None


def resolve_conversational_references(message: str, history: List[Dict[str, str]]) -> str:
    """Resolve pronouns ONLY when query is an incomplete follow-up fragment."""
    lower = message.lower().strip()
    if not history or len(history) < 1:
        return message

    # Only resolve if the query is a genuine pronoun reference and is a short follow-up (< 6 words)
    words = lower.split()
    pronouns = ["why is it", "why are they", "how about it", "what about it", "why so high", "tell me more about it"]
    is_short_fragment = len(words) <= 5 and any(p in lower for p in pronouns)

    if is_short_fragment:
        prev_user_msgs = [h.get("content", "") for h in history if h.get("role") in ["user", "human"]]
        if prev_user_msgs:
            last_query = prev_user_msgs[-1]
            return f"{message} (Referring to topic: {last_query})"

    return message


def _fast_deterministic_routing(message: str) -> Optional[Dict[str, Any]]:
    """Fast routing for common clear patterns without needing LLM latency."""
    lower = message.lower().strip()

    # Out-of-domain rejection
    out_of_domain_topics = ["weather", "cricket", "football", "recipe", "movie", "song", "who won", "president", "capital of"]
    if any(topic in lower for topic in out_of_domain_topics) and not any(kw in lower for kw in ["carbon", "emission", "energy", "fuel", "scope", "document", "invoice", "bill"]):
        return {
            "domain": "OUT_OF_DOMAIN",
            "operation": "OUT_OF_DOMAIN",
            "scope_filter": None,
            "category_filter": None,
            "month_filter": None,
            "doc_query": None,
            "requires_sql": False,
            "requires_forecast": False,
            "requires_vector": False,
            "confidence": 0.99,
            "rewritten_query": message,
        }

    # Latest / uploaded documents query
    if any(w in lower for w in ["latest uploaded", "last uploaded", "latest documents", "latest 2 uploaded", "last 2 uploaded", "recent uploaded", "show my documents", "list my documents", "my uploaded files"]):
        return {
            "domain": "DOCUMENT_KNOWLEDGE",
            "operation": "DOCUMENT_LOOKUP",
            "scope_filter": "ALL",
            "category_filter": None,
            "month_filter": None,
            "doc_query": "latest uploaded documents",
            "requires_sql": True,
            "requires_forecast": False,
            "requires_vector": True,
            "confidence": 0.99,
            "rewritten_query": message,
        }

    # Decarbonization / Carbon reduction queries
    if any(w in lower for w in ["how to reduce", "reduce my emission", "reduction strategy", "decarbonization", "lower emission", "mitigate emission"]):
        scope = "ALL"
        if "scope 1" in lower or "scope1" in lower:
            scope = "SCOPE_1"
        elif "scope 2" in lower or "scope2" in lower:
            scope = "SCOPE_2"
        elif "scope 3" in lower or "scope3" in lower:
            scope = "SCOPE_3"

        return {
            "domain": "FINANCIAL_CARBON_ANALYTICS",
            "operation": "CARBON_REDUCTION",
            "scope_filter": scope,
            "category_filter": None,
            "month_filter": None,
            "doc_query": None,
            "requires_sql": True,
            "requires_forecast": False,
            "requires_vector": True,
            "confidence": 0.99,
            "rewritten_query": message,
        }

    # Forecast queries
    if any(w in lower for w in ["forecast", "predicted", "predicting", "projection", "next month emission", "future emission"]):
        return {
            "domain": "FORECAST_ANALYTICS",
            "operation": "FORECAST_EXPLANATION" if "why" in lower else "FORECAST",
            "scope_filter": "ALL",
            "category_filter": None,
            "month_filter": _extract_month_from_text(lower) or "2026-09",
            "doc_query": None,
            "requires_sql": True,
            "requires_forecast": True,
            "requires_vector": False,
            "confidence": 0.98,
            "rewritten_query": message,
        }

    # Lowest emission period
    if any(w in lower for w in ["lowest emission", "lowest-emission", "lowest month", "minimum emission", "least carbon", "cleanest month"]):
        return {
            "domain": "ORGANIZATION_EMISSIONS",
            "operation": "LOWEST_EMISSION_PERIOD",
            "scope_filter": "ALL",
            "category_filter": None,
            "month_filter": None,
            "doc_query": None,
            "requires_sql": True,
            "requires_forecast": False,
            "requires_vector": False,
            "confidence": 0.99,
            "rewritten_query": message,
        }

    # Highest emission period
    if any(w in lower for w in ["highest emission", "highest-emission", "highest month", "peak emission", "maximum carbon", "dirtiest month"]):
        return {
            "domain": "ORGANIZATION_EMISSIONS",
            "operation": "HIGHEST_EMISSION_PERIOD",
            "scope_filter": "ALL",
            "category_filter": None,
            "month_filter": None,
            "doc_query": None,
            "requires_sql": True,
            "requires_forecast": False,
            "requires_vector": False,
            "confidence": 0.99,
            "rewritten_query": message,
        }

    # Document Count
    if any(w in lower for w in ["how many documents", "count of documents", "how many invoices", "how many bills", "number of invoices"]):
        return {
            "domain": "DOCUMENT_KNOWLEDGE",
            "operation": "DOCUMENT_COUNT",
            "scope_filter": "ALL",
            "category_filter": None,
            "month_filter": _extract_month_from_text(lower),
            "doc_query": None,
            "requires_sql": True,
            "requires_forecast": False,
            "requires_vector": False,
            "confidence": 0.99,
            "rewritten_query": message,
        }

    return None


def extract_intent(state: AgentState) -> Dict[str, Any]:
    """Node: Parse user message into typed Intent dynamically."""
    message = state["user_message"]
    history = state.get("conversation_history", [])
    api_key = state.get("mistral_api_key") or os.getenv("LLM_API_KEY") or os.getenv("MISTRAL_API_KEY") or ""

    resolved_query = resolve_conversational_references(message, history)

    # 1. Check fast deterministic heuristics
    fast_match = _fast_deterministic_routing(resolved_query)
    if fast_match:
        logger.info(f"[Intent Classifier] Fast router match: {fast_match['operation']}")
        return {"intent": fast_match}

    # 2. Dynamic Mistral LLM Intent Classification
    intent = {
        "domain": "ORGANIZATION_EMISSIONS",
        "operation": "TOTAL_EMISSIONS",
        "scope_filter": "ALL",
        "category_filter": None,
        "month_filter": _extract_month_from_text(resolved_query),
        "doc_query": None,
        "requires_sql": True,
        "requires_forecast": False,
        "requires_vector": True,
        "confidence": 0.90,
        "rewritten_query": resolved_query,
    }

    try:
        llm = ChatMistralAI(
            model="mistral-small-latest",
            api_key=api_key,
            temperature=0.0,
        )
        res = llm.invoke([
            SystemMessage(content=INTENT_SYSTEM_PROMPT),
            HumanMessage(content=f"USER QUERY: \"{resolved_query}\"\n\nProduce strict JSON:"),
        ])
        content = res.content
        if content:
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            parsed = json.loads(content)
            intent.update(parsed)
            logger.info(f"[Intent Classifier] Mistral classified: {intent.get('operation')} ({intent.get('domain')})")
    except Exception as err:
        logger.warning(f"Mistral intent extraction fallback: {err}")

    # Safety: Ensure vector search is always enabled for document domains or general questions
    if intent.get("domain") in ["DOCUMENT_KNOWLEDGE", "GENERAL_SUSTAINABILITY"] or "document" in resolved_query.lower() or "bill" in resolved_query.lower() or "invoice" in resolved_query.lower() or "report" in resolved_query.lower():
        intent["requires_vector"] = True

    return {"intent": intent}
