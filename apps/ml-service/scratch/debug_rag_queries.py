import os
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_graph.graph import execute_rag_pipeline

DB_URL = "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev?schema=public"
API_KEY = os.getenv("LLM_API_KEY", os.getenv("MISTRAL_API_KEY", ""))

test_org = "cmrxd9lfe0009zgaohg6tl3f7"
print(f"Testing with target organization: {test_org}")

test_queries = [
    "what will be my price in indian rupees",
    "what is my carbon tax liability under EU ETS in INR and EUR?",
    "Based on my verified emissions ledger, give me a prioritized 4-step decarbonization plan with estimated emission reduction potential in tonnes CO₂e and expected payback timeframes.",
]

for q in test_queries:
    print("=" * 80)
    print(f"QUERY: {q}")
    try:
        res = execute_rag_pipeline(
            message=q,
            organization_id=test_org,
            user_id="test_user",
            database_url=DB_URL,
            mistral_api_key=API_KEY,
        )
        print(f"INTENT: {res.get('intent', {}).get('operation')} (currency={res.get('intent', {}).get('category_filter')})")
        print(f"QUERY_TYPE: {res.get('query_type')}")
        print("--- ANSWER ---")
        print(res.get("answer"))
    except Exception as e:
        print("ERROR:", e)
