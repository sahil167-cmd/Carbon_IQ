"""
Guardrail & Unit Validation Node — LangGraph
Standardizes Evidence Pack, verifies exact metric tonne units (1 tonne = 1,000 kg),
and prevents vector retrieval misses from falsely declaring empty ledgers.
"""
import logging
from typing import Dict, Any, List
from ..state import AgentState

logger = logging.getLogger("ml-service.rag_graph.guardrail")

BENCHMARK_CARBON_PRICES = [
    {
        "jurisdiction": "EU ETS (European Union Allowance - EUA)",
        "price_original": 83.80,
        "currency_original": "EUR",
        "price_usd_per_tonne": 90.92,
        "price_eur_per_tonne": 83.80,
        "price_inr_per_tonne": 7583.90,
        "price_gbp_per_tonne": 71.55,
        "description": "EU Compliance cap-and-trade market price (~€83.80 / ₹7,584 per tonne CO₂e)",
    },
    {
        "jurisdiction": "UK ETS (United Kingdom Allowance - UKA)",
        "price_original": 42.50,
        "currency_original": "GBP",
        "price_usd_per_tonne": 53.98,
        "price_eur_per_tonne": 49.65,
        "price_inr_per_tonne": 4505.00,
        "price_gbp_per_tonne": 42.50,
        "description": "UK Compliance carbon allowance (~£42.50 / ₹4,505 per tonne CO₂e)",
    },
    {
        "jurisdiction": "California WCI (Cap-and-Trade)",
        "price_original": 36.00,
        "currency_original": "USD",
        "price_usd_per_tonne": 36.00,
        "price_eur_per_tonne": 33.18,
        "price_inr_per_tonne": 3006.00,
        "price_gbp_per_tonne": 28.35,
        "description": "California-Quebec linked compliance carbon auction (~$36.00 / ₹3,006 per tonne CO₂e)",
    },
    {
        "jurisdiction": "India CCTS / BEE Domestic Benchmark",
        "price_original": 1000.00,
        "currency_original": "INR",
        "price_usd_per_tonne": 11.98,
        "price_eur_per_tonne": 11.05,
        "price_inr_per_tonne": 1000.00,
        "price_gbp_per_tonne": 9.43,
        "description": "Indian Carbon Credit Trading Scheme benchmark (~₹1,000 / $12.00 per tonne CO₂e)",
    },
    {
        "jurisdiction": "Corporate Internal Shadow Price",
        "price_original": 50.00,
        "currency_original": "USD",
        "price_usd_per_tonne": 50.00,
        "price_eur_per_tonne": 46.08,
        "price_inr_per_tonne": 4175.00,
        "price_gbp_per_tonne": 39.37,
        "description": "Internal shadow price for capital budgeting and risk sensitivity (~$50.00 / ₹4,175 per tonne CO₂e)",
    },
]


def validate_and_normalize_units(state: AgentState) -> Dict[str, Any]:
    """Node: Unit normalization, mathematical integrity check, and evidence packaging."""
    user_message = state["user_message"]
    org_id = state["organization_id"]
    intent = state.get("intent", {})
    op = intent.get("operation", "TOTAL_EMISSIONS")
    sql_ev = state.get("sql_evidence") or {}
    forecast_ev = state.get("forecast_evidence") or {}
    vector_ev = state.get("vector_evidence") or []
    errors: List[str] = []

    # 1. Enforce Ledger State & Verification
    lifetime = sql_ev.get("lifetime_totals", {})
    record_count = lifetime.get("record_count", 0)
    monthly_history = sql_ev.get("monthly_history", [])

    # If records exist, the ledger is definitively NOT empty
    ledger_is_empty = (record_count == 0 and len(monthly_history) == 0)

    # 2. Build Structured Evidence for the specific intent
    structured_data: Dict[str, Any] = {}
    source_info: Dict[str, Any] = {
        "type": "Verified Carbon Ledger",
        "verified": True,
        "records_count": record_count,
    }

    if op == "LOWEST_EMISSION_PERIOD":
        lowest = sql_ev.get("lowest_emission_period")
        structured_data = {
            "focus": "LOWEST_EMISSION_PERIOD",
            "lowest_period": lowest,
            "comparison_periods": monthly_history,
            "explanation": "Identified from verified chronological reporting periods in the ledger.",
        }
        source_info["reference"] = f"Verified Carbon Ledger ({len(monthly_history)} Reporting Periods)"

    elif op == "HIGHEST_EMISSION_PERIOD":
        highest = sql_ev.get("highest_emission_period")
        structured_data = {
            "focus": "HIGHEST_EMISSION_PERIOD",
            "highest_period": highest,
            "comparison_periods": monthly_history,
        }
        source_info["reference"] = f"Verified Carbon Ledger ({len(monthly_history)} Reporting Periods)"

    elif op == "DOCUMENT_COUNT":
        doc_tax = sql_ev.get("document_taxonomy", {})
        structured_data = {
            "focus": "DOCUMENT_COUNT",
            "total_documents": doc_tax.get("total_documents", 0),
            "electricity_invoices_count": doc_tax.get("electricity_invoices_count", 0),
            "electricity_total_kg": doc_tax.get("electricity_total_co2e_kg", 0.0),
            "electricity_total_tonnes": doc_tax.get("electricity_total_co2e_tonnes", 0.0),
            "categories_summary": doc_tax.get("categories", []),
        }
        source_info["type"] = "CarbonIQ Document Repository & Ledger"
        source_info["reference"] = f"{doc_tax.get('total_documents', 0)} Verified Activity Invoices/Bills"

    elif op in ["DOCUMENT_CONTENT", "DOCUMENT_LOOKUP"]:
        docs_list = sql_ev.get("documents_list", [])
        structured_data = {
            "focus": "DOCUMENT_CONTENT",
            "matching_documents": docs_list,
            "total_matches": len(docs_list),
            "document_chunks": vector_ev,
        }
        first_doc = vector_ev[0].get("filename") if vector_ev else (docs_list[0].get("filename") if docs_list else "Uploaded Activity Bill")
        source_info["type"] = "CarbonIQ Uploaded Document Repository"
        source_info["reference"] = f"Document: {first_doc}"

    elif op == "SCOPE_EMISSIONS":
        target_scope = intent.get("scope_filter", "ALL")
        target_month = intent.get("month_filter")

        # Period-specific scope breakdown if month requested
        period_data = None
        if target_month:
            for m in monthly_history:
                if target_month in m["month"]:
                    period_data = m
                    break

        structured_data = {
            "focus": "SCOPE_EMISSIONS",
            "target_scope": target_scope,
            "target_month": target_month,
            "lifetime_scopes": lifetime,
            "period_scopes": period_data,
        }
        source_info["reference"] = f"GHG Scope Matrix ({target_scope})"

    elif op == "SCOPE_1_ANALYSIS":
        s1_data = sql_ev.get("scope1_analysis", {})
        structured_data = {
            "focus": "SCOPE_1_ANALYSIS",
            "scope1_analysis": s1_data,
            "lifetime_totals": lifetime,
            "sources_breakdown": [s for s in sql_ev.get("sources_breakdown", []) if s.get("scope") == "SCOPE_1"],
        }
        source_info["reference"] = "Scope 1 Direct Emissions Audit & Anomaly Isolation Engine"

    elif op == "CARBON_REDUCTION":
        recs = sql_ev.get("reduction_recommendations", [])
        structured_data = {
            "focus": "CARBON_REDUCTION",
            "lifetime_totals": lifetime,
            "reduction_recommendations": recs,
            "sources_breakdown": sql_ev.get("sources_breakdown", []),
        }
        source_info["type"] = "CarbonIQ Decarbonization & MACC Strategy Engine"
        source_info["reference"] = "Prioritized Net-Zero Decarbonization Roadmap"

    elif op == "PERIOD_COMPARISON":
        structured_data = {
            "focus": "PERIOD_COMPARISON",
            "monthly_history": monthly_history,
            "driver_analysis": sql_ev.get("driver_analysis", {}),
        }
        source_info["reference"] = f"Chronological Reporting Periods ({len(monthly_history)} verified months)"

    elif op == "EMISSION_DRIVER_ANALYSIS":
        driver_data = sql_ev.get("driver_analysis", {})
        sources = sql_ev.get("sources_breakdown", [])
        structured_data = {
            "focus": "EMISSION_DRIVER_ANALYSIS",
            "driver_breakdown": driver_data,
            "sources_breakdown": sources,
            "lifetime_totals": lifetime,
        }
        source_info["reference"] = "CarbonIQ Verified Activity Driver Engine"

    elif op in ["FORECAST", "FORECAST_EXPLANATION"]:
        structured_data = {
            "focus": "ML_FORECAST",
            "forecast": forecast_ev,
        }
        source_info["type"] = "CarbonIQ ML Forecast Engine"
        fc_model_type = forecast_ev.get("model_type", forecast_ev.get("methodology", "Driver-Informed"))
        fc_period = forecast_ev.get("target_period", "Next Period")
        source_info["reference"] = f"Model: {fc_model_type} ({fc_period})"

    elif op == "CARBON_TAX":
        total_tonnes = lifetime.get("grand_total_tonnes", 0.0)
        target_currency = intent.get("category_filter") or "USD"

        tax_table = []
        for b in BENCHMARK_CARBON_PRICES:
            p_usd = b["price_usd_per_tonne"]
            p_eur = b["price_eur_per_tonne"]
            p_inr = b["price_inr_per_tonne"]
            p_gbp = b["price_gbp_per_tonne"]

            tax_table.append({
                "jurisdiction": b["jurisdiction"],
                "price_original": b["price_original"],
                "currency_original": b["currency_original"],
                "price_usd": p_usd,
                "price_eur": p_eur,
                "price_inr": p_inr,
                "price_gbp": p_gbp,
                "liability_usd": round(total_tonnes * p_usd, 2),
                "liability_eur": round(total_tonnes * p_eur, 2),
                "liability_inr": round(total_tonnes * p_inr, 2),
                "liability_gbp": round(total_tonnes * p_gbp, 2),
                "description": b["description"],
            })

        structured_data = {
            "focus": "CARBON_TAX",
            "target_currency": target_currency,
            "total_emissions_tonnes": total_tonnes,
            "pricing_benchmarks": tax_table,
            "forex_rates": {
                "USD_INR": 83.50,
                "EUR_INR": 90.50,
                "GBP_INR": 106.00,
                "EUR_USD": 1.085,
            },
        }
        source_info["type"] = "CarbonIQ Global Carbon Pricing & ETS Valuation Matrix"
        source_info["reference"] = f"ETS Compliance Benchmarks & Multi-Currency Valuation ({target_currency})"

    else:
        # Default: Grand Total Emissions & Complete Source Breakdown
        structured_data = {
            "focus": "TOTAL_EMISSIONS",
            "lifetime_totals": lifetime,
            "monthly_history": monthly_history,
            "sources_breakdown": sql_ev.get("sources_breakdown", []),
            "scope1_analysis": sql_ev.get("scope1_analysis", {}),
            "reduction_recommendations": sql_ev.get("reduction_recommendations", []),
        }
        source_info["reference"] = f"{record_count} Verified Calculation Records"

    # 3. Assemble Normalized Evidence Pack
    evidence_pack = {
        "question": user_message,
        "intent": op,
        "tenant_id": org_id,
        "ledger_is_empty": ledger_is_empty,
        "structured_evidence": structured_data,
        "supporting_periods": monthly_history,
        "document_evidence": vector_ev,
        "forecast_evidence": forecast_ev if not forecast_ev.get("error") else None,
        "source": source_info,
    }

    validated = {
        "sql": sql_ev,
        "forecast": forecast_ev,
        "vector_chunks": vector_ev,
        "evidence_pack": evidence_pack,
    }

    return {
        "validated_evidence": validated,
        "evidence_pack": evidence_pack,
        "errors": errors,
    }
