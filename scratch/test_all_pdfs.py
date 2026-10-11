import os
import re

pdfs = [f for f in os.listdir('.') if f.endswith('.pdf')]
print(f"Found {len(pdfs)} PDFs in root:")

for pdf in sorted(pdfs):
    with open(pdf, 'rb') as f:
        data = f.read()
    bufferStr = data.decode('latin1', errors='ignore')
    
    # 1. TJ matches
    tjMatches = re.findall(r'\[(.*?)\]\s*TJ', bufferStr, re.DOTALL)
    lines = []
    if tjMatches:
        for tj in tjMatches:
            items = re.findall(r'<([0-9a-fA-F]+)>|\((.*?)\)', tj)
            tj_text = ""
            for hex_val, lit_val in items:
                if hex_val:
                    try:
                        dec = bytes.fromhex(hex_val).decode('utf-8', errors='ignore')
                        tj_text += dec
                    except:
                        pass
                elif lit_val:
                    cleaned = re.sub(r'\\([()\\])', r'\1', lit_val)
                    tj_text += cleaned
            if tj_text.strip():
                lines.append(tj_text.strip())
    
    # 2. Standalone Tj matches (e.g. (text) Tj or <hex> Tj)
    tjSingleMatches = re.findall(r'(?:<([0-9a-fA-F]+)>|\((.*?)\))\s*Tj', bufferStr)
    for hex_val, lit_val in tjSingleMatches:
        if hex_val:
            try:
                dec = bytes.fromhex(hex_val).decode('utf-8', errors='ignore')
                if dec.strip(): lines.append(dec.strip())
            except:
                pass
        elif lit_val:
            cleaned = re.sub(r'\\([()\\])', r'\1', lit_val)
            if cleaned.strip(): lines.append(cleaned.strip())

    text = " \n ".join(lines)
    print(f"\n==================== {pdf} ({len(text)} chars) ====================")
    print(text[:300].replace('\n', ' '))
