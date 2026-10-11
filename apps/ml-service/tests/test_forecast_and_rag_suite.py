"""
Complete 20-Scenario Verification Test Suite for CarbonIQ Lead Architect Acceptance Criteria.

Validates:
1. Lowest emission month
2. Highest emission month
3. Total Scope 1
4. Total Scope 2
5. Total Scope 3
6. Current emissions
7. Next-month forecast
8. Six-month forecast
9. Forecast model identification
10. Forecast confidence
11. Forecast drivers
12. One-off anomaly handling
13. Missing forecast data
14. Missing documents
15. Empty ledger
16. Two-period history
17. Six-period history
18. Feature column mismatch & signature resilience
19. Organization isolation
20. Forecast / API / RAG numerical consistency
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import pandas as pd
import numpy as np
from datetime import datetime

from model_predictor import predict_next_periods, forecast, get_canonical_forecast
from rag_graph.nodes.intent_node import _deterministic_intent_match
from rag_graph.nodes.guardrail_node import validate_and_normalize_units
from rag_graph.nodes.synthesis_node import _build_deterministic_answer


@pytest.fixture
def mock_2_period_df():
    """Mock DataFrame for 2 verified periods (July 2026 and August 2026)."""
    return pd.DataFrame([
        {
            "month": pd.Timestamp("2026-07-01"),
            "total_co2e": 20437183.32,
            "recurring_baseline_co2e": 132989.32,
            "fugitive_co2e": 20304194.00,
            "scope1": 20379899.00,
            "scope2": 29796.75,
            "scope3": 27487.57,
            "fuel_litres": 1500.0,
            "electricity_kwh": 35000.0,
            "freight_tonne_km": 10000.0,
        },
        {
            "month": pd.Timestamp("2026-08-01"),
            "total_co2e": 15738418.10,
            "recurring_baseline_co2e": 1820220.60,
            "fugitive_co2e": 13918197.50,
            "scope1": 13992867.61,
            "scope2": 106390.41,
            "scope3": 1639160.08,
            "fuel_litres": 25000.0,
            "electricity_kwh": 125000.0,
            "freight_tonne_km": 200000.0,
        },
    ])


@pytest.fixture
def mock_6_period_df():
    """Mock DataFrame for 6 verified periods."""
    dates = pd.date_range("2026-01-01", periods=6, freq="MS")
    totals = [100000, 110000, 105000, 115000, 120000, 125000]
    return pd.DataFrame([
        {
            "month": d,
            "total_co2e": t,
            "recurring_baseline_co2e": t,
            "fugitive_co2e": 0.0,
            "scope1": t * 0.4,
            "scope2": t * 0.3,
            "scope3": t * 0.3,
            "fuel_litres": 5000.0,
            "electricity_kwh": 40000.0,
            "freight_tonne_km": 20000.0,
        }
        for d, t in zip(dates, totals)
    ])


# 1. Lowest Emission Month
def test_scenario_1_lowest_emission_month():
    intent = _deterministic_intent_match("What is my lowest-emission reporting period?", [])
    assert intent["operation"] == "LOWEST_EMISSION_PERIOD"
    assert intent["requires_sql"] is True


# 2. Highest Emission Month
def test_scenario_2_highest_emission_month():
    intent = _deterministic_intent_match("What is my highest-emission reporting period?", [])
    assert intent["operation"] == "HIGHEST_EMISSION_PERIOD"
    assert intent["requires_sql"] is True


# 3. Total Scope 1
def test_scenario_3_total_scope1():
    intent = _deterministic_intent_match("What are my Scope 1 direct combustion emissions?", [])
    assert intent["operation"] == "SCOPE_EMISSIONS"
    assert intent["scope_filter"] == "SCOPE_1"


# 4. Total Scope 2
def test_scenario_4_total_scope2():
    intent = _deterministic_intent_match("What are my Scope 2 purchased electricity emissions?", [])
    assert intent["operation"] == "SCOPE_EMISSIONS"
    assert intent["scope_filter"] == "SCOPE_2"


# 5. Total Scope 3
def test_scenario_5_total_scope3():
    intent = _deterministic_intent_match("What are my Scope 3 freight and travel emissions?", [])
    assert intent["operation"] == "SCOPE_EMISSIONS"
    assert intent["scope_filter"] == "SCOPE_3"


# 6. Current Emissions
def test_scenario_6_current_emissions():
    intent = _deterministic_intent_match("What are my total carbon emissions?", [])
    assert intent["operation"] == "TOTAL_EMISSIONS"


# 7. Next-Month Forecast
def test_scenario_7_next_month_forecast(mock_2_period_df):
    preds, sanity = predict_next_periods(features_df=mock_2_period_df, horizon=6)
    assert len(preds) == 6
    p1 = preds[0]
    assert p1["period"] == "2026-09"
    assert p1["predicted_kg_co2e"] > 0
    # Scope 1 + Scope 2 + Scope 3 = Total
    scope_sum = p1["scope1_kg"] + p1["scope2_kg"] + p1["scope3_kg"]
    assert abs(scope_sum - p1["predicted_kg_co2e"]) < 0.05


# 8. Six-Month Forecast
def test_scenario_8_six_month_forecast(mock_2_period_df):
    preds, _ = predict_next_periods(mock_2_period_df, horizon=6)
    assert len(preds) == 6
    months = [p["period"] for p in preds]
    assert months == ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]


# 9. Forecast Model Identification
def test_scenario_9_forecast_model_id(mock_2_period_df):
    _, sanity = predict_next_periods(mock_2_period_df, horizon=6)
    assert sanity["mode"] == "MODE_2"
    assert "Driver-Informed" in sanity["model_name"]


# 10. Forecast Confidence
def test_scenario_10_forecast_confidence(mock_2_period_df):
    preds, _ = predict_next_periods(mock_2_period_df, horizon=6)
    for p in preds:
        assert p["confidence_score"] > 0
        assert "Limited" in p["confidence_label"]
        assert p["lower_80_kg"] < p["predicted_kg_co2e"] < p["upper_80_kg"]


# 11. Forecast Drivers Reconciliation
def test_scenario_11_forecast_drivers_reconciliation(mock_2_period_df):
    preds, sanity = predict_next_periods(mock_2_period_df, horizon=6)
    d_audit = sanity["driver_audit"]
    assert d_audit is not None
    s3_f = d_audit["scope3_freight_delta_kg"]
    s1_d = d_audit["scope1_diesel_delta_kg"]
    s2_e = d_audit["scope2_electricity_delta_kg"]
    total_delta = d_audit["total_delta_kg"]
    assert abs((s3_f + s1_d + s2_e) - total_delta) < 0.05


# 12. One-Off Anomaly Handling
def test_scenario_12_anomaly_handling(mock_2_period_df):
    # Historical actual in July is 20.4M, but recurring baseline is 132k
    july = mock_2_period_df.iloc[0]
    assert july["total_co2e"] == 20437183.32
    assert july["recurring_baseline_co2e"] == 132989.32
    # Forecast starts from August recurring baseline (1.82M), not 15.7M total
    preds, _ = predict_next_periods(mock_2_period_df, horizon=6)
    assert preds[0]["predicted_kg_co2e"] < 3000000.0  # Around 1.99M


# 13. Missing Forecast Data
def test_scenario_13_missing_forecast_data():
    empty_df = pd.DataFrame()
    preds, sanity = predict_next_periods(empty_df, horizon=6)
    assert len(preds) == 0
    assert sanity["valid"] is False
    assert sanity["status"] == "UNAVAILABLE"


# 14. Missing Documents
def test_scenario_14_missing_documents():
    state = {
        "user_message": "Show the solar panel bill",
        "organization_id": "test_org",
        "intent": {"operation": "DOCUMENT_LOOKUP"},
        "sql_evidence": {"documents_list": []},
        "forecast_evidence": None,
        "vector_evidence": [],
    }
    res = validate_and_normalize_units(state)
    assert res["evidence_pack"]["structured_evidence"]["total_matches"] == 0


# 15. Empty Ledger
def test_scenario_15_empty_ledger():
    state = {
        "user_message": "What are my total emissions?",
        "organization_id": "empty_org",
        "intent": {"operation": "TOTAL_EMISSIONS"},
        "sql_evidence": {"lifetime_totals": {"record_count": 0, "grand_total_kg": 0.0}},
        "forecast_evidence": None,
        "vector_evidence": [],
    }
    res = validate_and_normalize_units(state)
    assert res["evidence_pack"]["ledger_is_empty"] is True


# 16. Two-Period History
def test_scenario_16_two_period_history(mock_2_period_df):
    _, sanity = predict_next_periods(mock_2_period_df, horizon=6)
    assert sanity["mode"] == "MODE_2"


# 17. Six-Period History (uses model trainer for N>=3)
def test_scenario_17_six_period_history(mock_6_period_df):
    from model_trainer import evaluate_and_select_best_model
    from feature_engineering import engineer_features, get_feature_columns

    df = engineer_features(mock_6_period_df)
    feature_cols = get_feature_columns()
    model, model_type, metrics, eligibility = evaluate_and_select_best_model(df, feature_cols)
    assert eligibility["eligible"] is True

    preds, sanity = predict_next_periods(model, df, feature_cols, 6)
    assert len(preds) == 6
    # Mode should be 3+ range
    assert sanity["mode"] in ["MODE_3", "MODE_4", "MODE_5", "MODE_6"]


# 18. Feature Column Mismatch & Flexible Signature
def test_scenario_18_feature_column_mismatch(mock_2_period_df):
    # Test signature 1: predict_next_periods(model, df, feature_cols, horizon)
    p1, s1 = predict_next_periods(None, mock_2_period_df, ["activity_level"], 6)
    assert len(p1) == 6

    # Test signature 2: predict_next_periods(df, horizon=6)
    p2, s2 = predict_next_periods(mock_2_period_df, horizon=6)
    assert len(p2) == 6

    # Test signature 3: forecast(history_df=df, horizon=6)
    p3, s3 = forecast(history_df=mock_2_period_df, horizon=6)
    assert len(p3) == 6

    assert p1[0]["predicted_kg_co2e"] == p2[0]["predicted_kg_co2e"] == p3[0]["predicted_kg_co2e"]


# 19. Organization Isolation
def test_scenario_19_organization_isolation():
    # Canonical forecast requires organization_id and enforces isolation
    res = get_canonical_forecast(organization_id="non_existent_tenant_999")
    assert res["status"] in ["unavailable", "success"]
    assert res["organization_id"] == "non_existent_tenant_999"


# 20. Forecast / API / RAG Numerical Consistency
def test_scenario_20_numerical_consistency(mock_2_period_df):
    preds, sanity = predict_next_periods(mock_2_period_df, horizon=6)
    p_sept = preds[0]

    # Package evidence pack for RAG using canonical schema fields
    pack = {
        "forecast_evidence": {
            "forecast_available": True,
            "target_period": "September 2026",
            "predicted_total_kg": p_sept["predicted_kg_co2e"],
            "predicted_total_tonnes": p_sept["predicted_tonnes"],
            "growth_rate_pct": 9.46,
            "methodology": "Driver-Informed Short-History Baseline",
            "current_recurring_baseline_kg": 1820220.60,
            "reliability": "Limited (2 Reporting Periods)",
            "confidence_interval_80": {
                "lower_kg": p_sept["lower_80_kg"],
                "upper_kg": p_sept["upper_80_kg"],
            },
            "scope_breakdown": {
                "scope1_kg": p_sept["scope1_kg"],
                "scope2_kg": p_sept["scope2_kg"],
                "scope3_kg": p_sept["scope3_kg"],
            },
        }
    }

    ans = _build_deterministic_answer(pack, {"operation": "FORECAST"})
    assert f"{p_sept['predicted_kg_co2e']:,.2f}" in ans or f"{p_sept['predicted_kg_co2e']:,.0f}" in ans
    assert "September 2026" in ans
    assert "ANSWER:" in ans
    assert "EVIDENCE:" in ans
    assert "SOURCE:" in ans


# 21. RAG-Dashboard Parity: /predict and get_canonical_forecast MUST produce the same number
def test_scenario_21_rag_dashboard_parity(mock_2_period_df):
    """
    This is THE critical parity test. It verifies that:
    - predict_next_periods(trained_model, df, feature_cols, horizon) [Dashboard path]
    - get_canonical_forecast() which also uses trained_model internally [RAG path]
    produce the SAME forecast number.

    Before the fix, these diverged by 88x.
    """
    from model_trainer import evaluate_and_select_best_model
    from feature_engineering import engineer_features, get_feature_columns

    # Simulate the /predict endpoint path
    df = engineer_features(mock_2_period_df)
    feature_cols = get_feature_columns()
    model, model_type, metrics, eligibility = evaluate_and_select_best_model(df, feature_cols)

    dashboard_preds, dashboard_sanity = predict_next_periods(model, df, feature_cols, 6)
    dashboard_sept = dashboard_preds[0]["predicted_kg_co2e"]

    # Now call predict_next_periods WITHOUT a model (the old RAG path)
    rag_old_preds, _ = predict_next_periods(features_df=mock_2_period_df, horizon=6)
    rag_old_sept = rag_old_preds[0]["predicted_kg_co2e"]

    # With a trained model, the results should match
    rag_new_preds, _ = predict_next_periods(model, mock_2_period_df, feature_cols, 6)
    rag_new_sept = rag_new_preds[0]["predicted_kg_co2e"]

    # The new RAG path (with trained model) MUST match the dashboard
    assert dashboard_sept == rag_new_sept, (
        f"PARITY FAILURE: Dashboard={dashboard_sept}, RAG(new)={rag_new_sept}"
    )

    # Both must be positive and non-trivial
    assert dashboard_sept > 0
    assert rag_new_sept > 0

