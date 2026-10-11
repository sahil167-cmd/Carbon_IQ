import urllib.request
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

url = "http://localhost:8000/rag/query"
payload = {
    "message": 'TATA POWER DISTRIBUTION LTD list me numbers provided by this company"',
    "organization_id": "cmssknvps000119nwrhreznyy",
    "user_id": "test_user",
    "database_url": "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev?schema=public",
    "mistral_api_key": os.getenv("MISTRAL_API_KEY", os.getenv("LLM_API_KEY", ""))
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode("utf-8"))
        print("HTTP Status:", response.status)
        print("Success:", data.get("success"))
        print("Query Type:", data.get("query_type"))
        print("--- Answer ---")
        print(data.get("answer"))
except Exception as e:
    print("HTTP Request Error:", e)
