import os
import pypdf

pdf_files = [
    "sample_scope2_electricity_bill.pdf",
    "complex_scope2_utility_bill.pdf",
    "official_sample_utility_bill.pdf",
    "scope2_india_manufacturing_grid.pdf",
    "scope1_stationary_diesel_generator.pdf",
    "scope3_air_freight_airwaybill.pdf"
]

for pf in pdf_files:
    full_path = os.path.join(r"c:\Users\Sahil Borhade\Desktop\Carbon_IQ", pf)
    if os.path.exists(full_path):
        print("=" * 80)
        print(f"FILE: {pf}")
        try:
            reader = pypdf.PdfReader(full_path)
            for p_idx, page in enumerate(reader.pages):
                print(f"--- Page {p_idx+1} ---")
                print(page.extract_text())
        except Exception as e:
            print("PDF extract error:", e)
