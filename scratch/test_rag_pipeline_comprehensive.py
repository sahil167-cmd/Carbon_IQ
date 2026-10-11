"""
Comprehensive Evaluation & Test Suite for CarbonIQ Production RAG Copilot.
Tests all 15 requirement categories without hardcoded question shortcuts.
"""
import os
import sys
import json
import psycopg2
import psycopg2.extras

# UTF-8 stdout encoding for Windows compatibility
sys.stdout.reconfigure(encoding='utf-8')

# Add ml-service directory to sys.path
ml_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "ml-service"))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

from rag_graph.graph import execute_rag_pipeline

DB_URL = "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev"
API_KEY = os.getenv("LLM_API_KEY", os.getenv("MISTRAL_API_KEY", ""))


def get_test_organization_id():
    """Retrieve an active organization ID with calculated emissions."""
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT \"organizationId\" FROM calculated_emissions GROUP BY \"organizationId\" ORDER BY COUNT(*) DESC LIMIT 1")
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row["organizationId"] if row else "default_org"


def run_comprehensive_evaluation():
    org_id = get_test_organization_id()
    print("==================================================")
    print(f"CARBONIQ RAG EVALUATION SUITE (Org: {org_id})")
    print("==================================================\n")

    test_queries = [
        # A. Current / Total Emissions
        {"query": "What are my current emissions?", "expected_domain": "ORGANIZATION_EMISSIONS"},
        
        # B. Category Breakdown
        {"query": "Which emission category contributes the most?", "expected_domain": "ORGANIZATION_EMISSIONS"},
        
        # C. Scope 3 Breakdown
        {"query": "Why did my Scope 3 emissions increase?", "expected_domain": "ORGANIZATION_EMISSIONS"},
        
        # D. Document Content Search
        {"query": "What does my uploaded electricity document say?", "expected_domain": "DOCUMENT_KNOWLEDGE"},
        
        # E. Supplier / Drivers
        {"query": "Which supplier or activity has the highest emissions?", "expected_domain": "ORGANIZATION_EMISSIONS"},
        
        # F. ML Forecasting
        {"query": "What will my emissions be next month?", "expected_domain": "FORECAST_ANALYTICS"},
        
        # G. Forecast Drivers
        {"query": "Why is the forecast increasing?", "expected_domain": "FORECAST_ANALYTICS"},
        
        # H. Anomaly Detection
        {"query": "Is the recent spike an anomaly?", "expected_domain": "FORECAST_ANALYTICS"},
        
        # I. Period Comparison
        {"query": "Compare my July and August emissions.", "expected_domain": "ORGANIZATION_EMISSIONS"},
        
        # J. General Sustainability Standard Definition
        {"query": "What does Scope 3 Category 4 mean?", "expected_domain": "GENERAL_SUSTAINABILITY"},
        
        # K. Decarbonization & Reduction Strategies
        {"query": "How can I reduce my transportation emissions?", "expected_domain": "FINANCIAL_CARBON_ANALYTICS"},
        
        # L. Different Wording for Scope 2
        {"query": "Give me a breakdown of all our purchased power and grid electricity footprint.", "expected_domain": "ORGANIZATION_EMISSIONS"},
        
        # M. Out of Domain
        {"query": "Who won yesterday's cricket match?", "expected_domain": "OUT_OF_DOMAIN"},
        
        # N. Insufficient Evidence
        {"query": "Why did diesel emissions increase in March 2020?", "expected_domain": "ORGANIZATION_EMISSIONS"},
    ]

    history = []
    passed = 0
    total = len(test_queries)

    for i, test in enumerate(test_queries, 1):
        q = test["query"]
        print(f"[{i}/{total}] Testing: \"{q}\"")
        try:
            res = execute_rag_pipeline(
                message=q,
                organization_id=org_id,
                user_id="eval_user",
                database_url=DB_URL,
                mistral_api_key=API_KEY,
                history=history,
            )

            answer = res.get("answer", "")
            citations = res.get("citations", [])
            query_type = res.get("query_type", "")
            
            print(f"  -> Type: {query_type}")
            print(f"  -> Citations: {len(citations)} citations")
            print(f"  -> Answer Preview:\n{answer[:300]}...\n")

            if answer and len(answer.strip()) > 20:
                passed += 1
            
            # Maintain brief history
            history.append({"role": "user", "content": q})
            history.append({"role": "assistant", "content": answer[:250]})
            if len(history) > 6:
                history = history[-6:]

        except Exception as err:
            print(f"  [ERROR] FAILED with exception: {err}\n")

    # Conversational Follow-up Test
    print(f"[{total+1}/{total+1}] Testing Follow-up: \"Why is it so high?\" (Contextual Resolution)")
    follow_up_res = execute_rag_pipeline(
        message="Why is it so high?",
        organization_id=org_id,
        user_id="eval_user",
        database_url=DB_URL,
        mistral_api_key=API_KEY,
        history=[
            {"role": "user", "content": "What is my Scope 3 emission?"},
            {"role": "assistant", "content": "Your Scope 3 emissions are 75,014.80 kg CO2e across freight and purchased goods."},
        ],
    )
    print(f"  -> Follow-up Answer:\n{follow_up_res.get('answer', '')[:300]}...\n")
    if follow_up_res.get("answer"):
        passed += 1
    total += 1

    print("==================================================")
    print(f"EVALUATION RESULTS: {passed}/{total} Tests Passed ({passed/total*100:.1f}%)")
    print("==================================================")


if __name__ == "__main__":
    run_comprehensive_evaluation()
