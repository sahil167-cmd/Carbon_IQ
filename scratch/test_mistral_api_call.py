import os
import requests
from dotenv import load_dotenv

load_dotenv('.env')

key = os.environ.get('LLM_API_KEY') or os.environ.get('MISTRAL_API_KEY')
print(f"API Key present: {bool(key)}, Length: {len(key) if key else 0}")

headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "mistral-small-latest",
    "messages": [
        {"role": "user", "content": "Hello, confirm OCR service status."}
    ],
    "max_tokens": 20
}

try:
    res = requests.post("https://api.mistral.ai/v1/chat/completions", headers=headers, json=payload, timeout=10)
    print(f"Mistral API Status Code: {res.status_code}")
    if res.ok:
        data = res.json()
        print(f"Mistral Response Content: {data['choices'][0]['message']['content']}")
    else:
        print(f"Mistral API Error Body: {res.text}")
except Exception as e:
    print(f"Connection Error: {e}")
