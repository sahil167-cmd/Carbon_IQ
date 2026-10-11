import os
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_graph.graph import execute_rag_pipeline

DB_URL = "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev?schema=public"
API_KEY = os.getenv("LLM_API_KEY", os.getenv("MISTRAL_API_KEY", ""))

test_org = "cmssknvps000119nwrhreznyy"

queries = [
    "TATA POWER DISTRIBUTION LTD list me numbers provided by this company",
    "What are the numbers on my Tata Power electricity bill?",
    "Show me the details of my ConEdison electricity bill",
    "List the details from my uploaded Maersk bill of lading",
]

for q in queries:
    print("=" * 80)
    print(f"QUERY: {q}")
    res = execute_rag_pipeline(
        message=q,
        organization_id=test_org,
        user_id="test_user",
        database_url=DB_URL,
        mistral_api_key=API_KEY,
    )
    print("INTENT:", res.get("intent"))
    print("VECTOR EVIDENCE COUNT:", len(res.get("vector_evidence", [])))
    print("--- ANSWER ---")
    print(res.get("answer"))
