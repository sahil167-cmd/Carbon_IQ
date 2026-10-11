import os
import re

pdf_path = 'scope1_stationary_diesel_generator.pdf'
if not os.path.exists(pdf_path):
    pdf_path = os.path.join('scratch', 'scope1_stationary_diesel_generator.pdf')

print(f"Checking {pdf_path}: exists={os.path.exists(pdf_path)}")

with open(pdf_path, 'rb') as f:
    data = f.read()

bufferStr = data.decode('latin1', errors='ignore')
print("File length:", len(data))

textMatches = re.findall(r'\(([^()\\]|\\[\s\S])*\)', bufferStr)
chunks = []
if textMatches:
    for m in textMatches:
        cleaned = re.sub(r'\\([()\\])', r'\1', m).strip()
        if len(cleaned) > 0 and all(32 <= ord(c) <= 126 or c in '\r\n\t ' for c in cleaned):
            chunks.append(cleaned)

print(f"Chunks found: {len(chunks)}")
print("Sample extracted text:")
fullText = " ".join(chunks)
print(fullText)

# Also let's search for all ASCII text in data
ascii_text = re.findall(r'[A-Za-z0-9 ,.:;!@#$%^&*()_+\-=\[\]{}|\'\"/<>?\n\r\t]{4,}', bufferStr)
print("\n--- ALL ASCII SEQUENCES IN FILE ---")
print("\n".join(ascii_text[:50]))
