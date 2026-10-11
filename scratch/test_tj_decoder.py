import re

with open('scope1_stationary_diesel_generator.pdf', 'rb') as f:
    data = f.read()

bufferStr = data.decode('latin1', errors='ignore')

# Decode TJ arrays properly:
# Inside `[ ... ] TJ`, there are hex strings `<...>` or literal strings `(...)` separated by kerning numbers.
# Consecutive text fragments within the SAME TJ array should be concatenated WITHOUT extra spaces (or only space if the text contains space)!
tjMatches = re.findall(r'\[(.*?)\]\s*TJ', bufferStr, re.DOTALL)
print(f"TJ matches found: {len(tjMatches)}")

lines = []
for tj in tjMatches:
    # Find all strings in this TJ: <hex> or (literal)
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

print("\nDecoded Lines from TJ arrays:")
for l in lines:
    print("  ", l)

fullText = "\n".join(lines)
print("\n--- FULL DECODED DOCUMENT TEXT ---")
print(fullText)
