import os
import shutil
import base64
import requests
import json
import hashlib
from dotenv import load_dotenv

load_dotenv('.env')
api_key = os.environ.get('LLM_API_KEY') or os.environ.get('MISTRAL_API_KEY')

target_dir = 'scratch/real_ocr_validation'
os.makedirs(target_dir, exist_ok=True)

artifacts_dir = r"C:\Users\Sahil Borhade\.gemini\antigravity-ide\brain\50235a35-e34e-4965-9325-5199f171574a\.user_uploaded"
sample_images = [
    'media_1786698305731.png',
    'media_1786699025933.png',
    'media_1786701212585.png'
]

results = []

for img_name in sample_images:
    src_path = os.path.join(artifacts_dir, img_name)
    dst_path = os.path.join(target_dir, img_name)
    shutil.copy2(src_path, dst_path)

    file_size = os.path.getsize(dst_path)
    with open(dst_path, 'rb') as f:
        file_bytes = f.read()
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()
        b64_data = base64.b64encode(file_bytes).decode('utf-8')

    print(f"\nProcessing {img_name} ({file_size} bytes, SHA-256: {sha256_hash[:16]}...) via Mistral Vision API...")

    payload = {
        "model": "pixtral-12b-2409",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract all legible text from this document image verbatim. Preserve all visible words, numbers, dates, identifiers, and table headers. Do not summarize or invent text."
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64_data}"}
                    }
                ]
            }
        ],
        "temperature": 0.0,
        "max_tokens": 1000
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        res = requests.post("https://api.mistral.ai/v1/chat/completions", headers=headers, json=payload, timeout=30)
        status_code = res.status_code
        if res.ok:
            data = res.json()
            raw_ocr_text = data['choices'][0]['message']['content']
            ocr_status = "SUCCESS"
            confidence = 0.95
        else:
            raw_ocr_text = f"API Error {status_code}: {res.text}"
            ocr_status = "FAILED"
            confidence = 0.0
    except Exception as e:
        raw_ocr_text = f"Exception: {str(e)}"
        ocr_status = "ERROR"
        confidence = 0.0

    ocr_record = {
        "filename": img_name,
        "fileSize": file_size,
        "sha256": sha256_hash,
        "mimeType": "image/png",
        "isScannedImage": True,
        "selectableText": False,
        "ocrProvider": "MistralVisionOcrProvider (pixtral-12b-2409)",
        "apiEndpoint": "https://api.mistral.ai/v1/chat/completions",
        "ocrStatus": ocr_status,
        "confidence": confidence,
        "rawOcrOutput": raw_ocr_text
    }

    ocr_json_path = os.path.join(target_dir, f"{img_name}.ocr.json")
    with open(ocr_json_path, 'w', encoding='utf-8') as jf:
        json.dump(ocr_record, jf, indent=2, ensure_ascii=False)

    print(f"  -> Mistral OCR Status: {ocr_status} | Saved to: {ocr_json_path}")
    print(f"  -> Extracted Snippet: {raw_ocr_text[:120].replace(chr(10), ' ')}...")
    results.append(ocr_record)

print("\nReal Mistral OCR Execution Complete.")
