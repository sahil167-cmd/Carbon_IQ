"""
ML Forecast Node — LangGraph
Retrieves canonical 6-month operational projections, confidence bounds,
and scope driver decompositions from the live CarbonIQ ML Engine.

CRITICAL: This node calls get_canonical_forecast() which runs the EXACT SAME
model training pipeline as the /predict endpoint used by the Dashboard.
This guarantees RAG and Dashboard always produce identical forecast numbers.
"""
import logging
from typing import Dict, Any
from ..state import AgentState

logger = logging.getLogger("ml-service.rag_graph.forecast")


def _month_label(period_str: str) -> str:
    """Convert '2026-09' to 'September 2026'."""
    try:
        import pandas as pd
        return pd.Timestamp(period_str + "-01").strftime("%B %Y")
    except Exception:
        return period_str


def query_forecast_engine(state: AgentState) -> Dict[str, Any]:
    """Node: Query ML Forecasting Engine for canonical projections and drivers."""
    org_id = state["organization_id"]
    db_url = state["database_url"]

    try:
        from model_predictor import get_canonical_forecast

        canonical = get_canonical_forecast(org_id, db_url, horizon=6)

        if canonical.get("status") == "success" and canonical.get("forecast"):
            first_f = canonical["forecast"][0]
            model_info = canonical.get("model", {})
            cur_base = model_info.get("current_recurring_baseline_kg", 0.0)
            pred_kg = first_f["predicted_kg_co2e"]
            delta_kg = round(pred_kg - cur_base, 2) if cur_base > 0 else 0.0
            pct_change = round((delta_kg / cur_base) * 100.0, 2) if cur_base > 0 else 0.0

            # Dynamic period label from actual data, not hardcoded
            target_period_label = _month_label(first_f["period"])

            forecast_evidence = {
                "forecast_available": True,
                "target_period": target_period_label,
                "predicted_total_kg": pred_kg,
                "predicted_total_tonnes": first_f["predicted_tonnes"],
                "current_recurring_baseline_kg": cur_base,
                "current_recurring_baseline_tonnes": round(cur_base / 1000.0, 2),
                "growth_rate_pct": pct_change,
                "projected_change_kg": delta_kg,
                "confidence_interval_80": {
                    "lower_kg": first_f["lower_80_kg"],
                    "upper_kg": first_f["upper_80_kg"],
                },
                "confidence_interval_95": {
                    "lower_kg": first_f.get("lower_95_kg", round(pred_kg * 0.90, 2)),
                    "upper_kg": first_f.get("upper_95_kg", round(pred_kg * 1.10, 2)),
                },
                "methodology": model_info.get("name", "Driver-Informed Short-History Forecast"),
                "model_type": model_info.get("model_type", model_info.get("name", "Unknown")),
                "reliability": model_info.get("reliability", "Limited"),
                "history_periods_count": model_info.get("history_periods", 0),
                "scope_breakdown": {
                    "scope1_kg": first_f["scope1_kg"],
                    "scope2_kg": first_f["scope2_kg"],
                    "scope3_kg": first_f["scope3_kg"],
                },
                "drivers": canonical.get("drivers", []),
                "horizon_6_months": canonical.get("forecast", []),
                "pipeline": canonical.get("diagnostics", {}).get("pipeline", "FULL_TOURNAMENT"),
                "raw_canonical": canonical,
            }
            return {"forecast_evidence": forecast_evidence}

        else:
            diag = canonical.get("diagnostics", {})
            user_msg = diag.get("user_message", "Forecasting is currently unavailable for this organization.")
            forecast_evidence = {
                "forecast_available": False,
                "safe_user_reason": user_msg,
                "error_code": diag.get("error_code", "FORECAST_UNAVAILABLE"),
                "raw_canonical": canonical,
            }
            return {"forecast_evidence": forecast_evidence}

    except Exception as err:
        logger.error(f"[query_forecast_engine] Uncaught failure in forecast node: {err}")
        return {
            "forecast_evidence": {
                "forecast_available": False,
                "safe_user_reason": "The CarbonIQ Forecast Engine could not be reached at this moment.",
                "error_code": "FORECAST_NODE_ERROR",
            }
        }
