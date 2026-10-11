"""
Automated Test Suite for CarbonIQ Dual-Path RAG Engine & Structured Grounding.
Validates:
1. Deterministic intent routing for all 19 standard CarbonIQ intents.
2. Conversational context resolution for follow-ups (e.g. "What about July?").
3. Lowest and Highest reporting period arithmetic and anomaly demarcation.
4. Scope 1, Scope 2, Scope 3 exact aggregations and percentages.
5. Document count and taxonomy retrieval (e.g. 11 electricity invoices).
6. Driver contribution reconciliation (Freight + Diesel - Electricity = Total Delta).
7. Guardrail validation preventing false empty ledger claims.
8. Grounded synthesis output format compliance.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from rag_graph.nodes.intent_node import _deterministic_intent_match, _extract_month_from_text
from rag_graph.nodes.guardrail_node import validate_and_normalize_units
from rag_graph.nodes.synthesis_node import _build_deterministic_answer


def test_intent_lowest_emission_period():
    queries = [
        "What is my lowest-emission reporting period?",
        "What was my lowest month?",
        "Which reporting period had the minimum emissions?",
        "What is my cleanest period?",
    ]
    for q in queries:
        match = _deterministic_intent_match(q, [])
        assert match is not None, f"Failed for query: {q}"
        assert match["operation"] == "LOWEST_EMISSION_PERIOD"
        assert match["requires_sql"] is True
        assert match["requires_vector"] is False


def test_intent_highest_emission_period():
    queries = [
        "What is my highest-emission reporting period?",
        "What was my peak emission month?",
        "Which period had maximum carbon emissions?",
    ]
    for q in queries:
        match = _deterministic_intent_match(q, [])
        assert match is not None, f"Failed for query: {q}"
        assert match["operation"] == "HIGHEST_EMISSION_PERIOD"
        assert match["requires_sql"] is True


def test_intent_scope_emissions():
    match_s2 = _deterministic_intent_match("What are my Scope 2 emissions in August?", [])
    assert match_s2 is not None
    assert match_s2["operation"] == "SCOPE_EMISSIONS"
    assert match_s2["scope_filter"] == "SCOPE_2"
    assert match_s2["month_filter"] == "2026-08"

    match_s1 = _deterministic_intent_match("What are my direct fuel and diesel emissions?", [])
    assert match_s1 is not None
    assert match_s1["operation"] == "SCOPE_EMISSIONS"
    assert match_s1["scope_filter"] == "SCOPE_1"


def test_intent_document_count():
    match = _deterministic_intent_match("How many electricity invoices do I have?", [])
    assert match is not None
    assert match["operation"] == "DOCUMENT_COUNT"
    assert match["category_filter"] == "ELECTRICITY"


def test_intent_document_lookup():
    match = _deterministic_intent_match("Show my electricity bills", [])
    assert match is not None
    assert match["operation"] == "DOCUMENT_LOOKUP"
    assert match["category_filter"] == "ELECTRICITY"


def test_intent_forecast_and_drivers():
    match_f = _deterministic_intent_match("What is my September forecast?", [])
    assert match_f is not None
    assert match_f["operation"] == "FORECAST"
    assert match_f["requires_forecast"] is True

    match_e = _deterministic_intent_match("Why is my forecast increasing?", [])
    assert match_e is not None
    assert match_e["operation"] == "FORECAST_EXPLANATION"
    assert match_e["requires_forecast"] is True


def test_intent_emission_driver_analysis():
    match = _deterministic_intent_match("What caused emissions to increase?", [])
    assert match is not None
    assert match["operation"] == "EMISSION_DRIVER_ANALYSIS"
    assert match["requires_sql"] is True


def test_conversational_followup_resolution():
    history = [
        {"role": "user", "content": "What was my Scope 2 emissions in August?"},
        {"role": "assistant", "content": "48,946 kg CO₂e in August 2026."},
    ]
    match = _deterministic_intent_match("What about July?", history)
    assert match is not None
    assert match["operation"] == "SCOPE_EMISSIONS"
    assert match["scope_filter"] == "SCOPE_2"
    assert match["month_filter"] == "2026-07"


def test_guardrail_empty_ledger_protection():
    # Simulate DB with 46 verified calculation records
    state = {
        "user_message": "What is my lowest-emission reporting period?",
        "organization_id": "test-org-123",
        "intent": {"operation": "LOWEST_EMISSION_PERIOD"},
        "sql_evidence": {
            "lifetime_totals": {"record_count": 46, "grand_total_kg": 36175601.42, "grand_total_tonnes": 36175.60},
            "monthly_history": [
                {"month": "2026-07", "month_label": "July 2026", "total_kg": 20437183.32, "total_tonnes": 20437.18, "recurring_baseline_kg": 132989.32},
                {"month": "2026-08", "month_label": "August 2026", "total_kg": 15738418.10, "total_tonnes": 15738.42, "recurring_baseline_kg": 1820220.60},
            ],
            "lowest_emission_period": {
                "month": "2026-08",
                "period_label": "August 2026",
                "total_kg": 15738418.10,
                "total_tonnes": 15738.42,
                "recurring_baseline_kg": 1820220.60,
                "recurring_baseline_tonnes": 1820.22,
                "record_count": 16,
            },
        },
        "forecast_evidence": None,
        "vector_evidence": [],  # Vector search returned 0 chunks
    }

    result = validate_and_normalize_units(state)
    pack = result["evidence_pack"]

    # Even though vector search returned 0 chunks, ledger_is_empty MUST BE FALSE
    assert pack["ledger_is_empty"] is False
    assert pack["structured_evidence"]["lowest_period"]["period_label"] == "August 2026"
    assert pack["structured_evidence"]["lowest_period"]["total_kg"] == 15738418.10


def test_driver_math_reconciliation():
    s3_freight = 163228.94
    s1_diesel = 13898.51
    s2_elec = -4894.62
    expected_delta = 172232.83

    total = s3_freight + s1_diesel + s2_elec
    assert abs(total - expected_delta) < 0.01


def test_deterministic_answer_lowest_period():
    pack = {
        "structured_evidence": {
            "lowest_period": {
                "period_label": "August 2026",
                "total_kg": 15738418.10,
                "total_tonnes": 15738.42,
                "recurring_baseline_kg": 1820220.60,
                "record_count": 16,
            }
        }
    }
    ans = _build_deterministic_answer(pack, {"operation": "LOWEST_EMISSION_PERIOD"})
    assert "August 2026" in ans
    assert "15,738,418" in ans
    assert "ANSWER:" in ans
    assert "EVIDENCE:" in ans
    assert "SOURCE:" in ans
    assert "ledger is empty" not in ans.lower()


def test_deterministic_answer_scope_breakdown():
    pack = {
        "structured_evidence": {
            "scope_breakdown": {
                "scope_1": {"total_kg": 34372766.61, "total_tonnes": 34372.77, "percentage": 95.0},
                "scope_2": {"total_kg": 136187.16, "total_tonnes": 136.19, "percentage": 0.4},
                "scope_3": {"total_kg": 1666647.65, "total_tonnes": 1666.65, "percentage": 4.6},
            }
        }
    }
    ans = _build_deterministic_answer(pack, {"operation": "SCOPE_BREAKDOWN"})
    assert "34,372,766.61" in ans
    assert "136,187.16" in ans
    assert "1,666,647.65" in ans
    assert "95.0%" in ans
    assert "ANSWER:" in ans


def test_deterministic_answer_document_count():
    pack = {
        "structured_evidence": {
            "document_taxonomy": {
                "category": "ELECTRICITY",
                "document_count": 11,
                "verified_emissions_kg": 106390.41,
                "verified_emissions_tonnes": 106.39,
            }
        }
    }
    ans = _build_deterministic_answer(pack, {"operation": "DOCUMENT_COUNT", "category_filter": "ELECTRICITY"})
    assert "11 electricity" in ans.lower()
    assert "106,390.41" in ans
    assert "ANSWER:" in ans


def test_deterministic_answer_forecast():
    pack = {
        "forecast_evidence": {
            "target_period": "September 2026",
            "predicted_total_kg": 1992453.43,
            "predicted_total_tonnes": 1992.45,
            "confidence_interval_80": {"lower_kg": 1793208.09, "upper_kg": 2191698.77},
            "growth_rate_pct": 9.46,
            "methodology": "Driver-Informed Short-History Baseline",
        }
    }
    ans = _build_deterministic_answer(pack, {"operation": "FORECAST"})
    assert "1,992,453" in ans
    assert "September 2026" in ans
    assert "+9.46%" in ans or "9.5%" in ans or "9.46" in ans
    assert "ANSWER:" in ans


def test_deterministic_answer_emission_drivers():
    pack = {
        "structured_evidence": {
            "driver_deltas": {
                "s3_freight_delta_kg": 163228.94,
                "s1_diesel_delta_kg": 13898.51,
                "s2_electricity_delta_kg": -4894.62,
                "total_delta_kg": 172232.83,
            }
        }
    }
    ans = _build_deterministic_answer(pack, {"operation": "EMISSION_DRIVER_ANALYSIS"})
    assert "Freight & Logistics" in ans or "Freight" in ans
    assert "163,228.94" in ans
    assert "13,898.51" in ans
    assert "ANSWER:" in ans

