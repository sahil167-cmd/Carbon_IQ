import os
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_graph.graph import execute_rag_pipeline

DB_URL = "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev?schema=public"
API_KEY = os.getenv("LLM_API_KEY", os.getenv("MISTRAL_API_KEY", ""))
test_org = "cmssknvps000119nwrhreznyy"

test_cases = [
    "TATA POWER DISTRIBUTION LTD list me numbers provided by this company\"",
    "What are the numbers on my ConEdison electricity bill?",
    "Tell me about the numbers on my Vattenfall green power invoice",
    "What numbers were extracted from my Maersk bill of lading?",
    "List the details from my CAT power diesel statement",
]

for q in test_cases:
    print("=" * 80)
    print(f"QUERY: {q}")
    res = execute_rag_pipeline(
        message=q,
        organization_id=test_org,
        user_id="test_user",
        database_url=DB_URL,
        mistral_api_key=API_KEY,
    )
    print("INTENT:", res.get("intent", {}).get("operation"), "(doc_query:", res.get("intent", {}).get("doc_query"), ")")
    print("--- ANSWER ---")
    print(res.get("answer"))
