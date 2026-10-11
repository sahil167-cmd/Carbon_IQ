import psycopg2
import json
import hashlib
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

print("==================================================================")
print("SECTION B: GLEC EMISSION FACTORS IN DATABASE")
print("==================================================================")
cur.execute("""
    SELECT id, category, "subCategory", region, "factorValue", unit, "sourceSet", version, year
    FROM emission_factors
    WHERE "sourceSet" ILIKE '%GLEC%' OR "subCategory" ILIKE '%TRUCK%' OR "subCategory" ILIKE '%FREIGHT%'
    ORDER BY "sourceSet", version, "factorValue"
""")
glec_rows = cur.fetchall()
for r in glec_rows:
    print(r)

print("\n==================================================================")
print("SECTION D: SHA-256 HASH VERIFICATION")
print("==================================================================")
cur.execute("""
    SELECT id, "organizationId", "sha256Hash", "fileName", "fileSize", "createdAt"
    FROM document_fingerprints
""")
fp_rows = cur.fetchall()
for fp in fp_rows:
    print("Stored Fingerprint:", fp)

# Check hash of empty string vs actual PDF files
empty_hash = hashlib.sha256(b"").hexdigest()
print(f"SHA-256 of empty buffer (0 bytes): {empty_hash}")

for fname in ['sample_scope1_fleet_diesel.pdf', 'complex_scope3_freight_bol.pdf', 'sample_scope2_electricity_bill.pdf', 'scope3_purchased_goods_steel.pdf']:
    if os.path.exists(fname):
        with open(fname, 'rb') as f:
            data = f.read()
            h = hashlib.sha256(data).hexdigest()
            print(f"File: {fname} | Size: {len(data)} bytes | Actual SHA-256: {h}")

print("\n==================================================================")
print("SECTION E: DOCUMENT SYNTHETIC VS REAL ORIGIN AUDIT")
print("==================================================================")
# Check if scripts generate these PDFs in the repo
cur.execute("""
    SELECT id, "fileName", "mimeType", "fileSize", source, "createdAt"
    FROM documents
    WHERE "fileName" IN ('sample_scope1_fleet_diesel.pdf', 'sample_scope2_electricity_bill.pdf', 'complex_scope3_freight_bol.pdf', 'scope3_purchased_goods_steel.pdf')
""")
docs = cur.fetchall()
for d in docs:
    print("Document Record in DB:", d)

print("\n==================================================================")
print("SECTION L: COMPLETE DATABASE CHAINS (3 FULL PROVENANCE EXAMPLES)")
print("==================================================================")
cur.execute("""
    SELECT 
        ce.id as calc_id,
        d.id as doc_id, d."fileName", d."categoryId",
        ed.id as ext_id, ed."modelVersion", ed.status as ext_status,
        ar.id as act_id, ar."activityType", ar.quantity, ar.unit,
        ef.id as factor_id, ef.category as ef_cat, ef."subCategory" as ef_subcat, ef."factorValue", ef."sourceSet",
        cl.id as log_id, cl."formulaUsed",
        ce.scope, ce."activityValue", ce."activityUnit", ce.co2e, ce."validationStatus"
    FROM calculated_emissions ce
    JOIN documents d ON ce."documentId" = d.id
    LEFT JOIN extracted_data ed ON ed."documentId" = d.id
    LEFT JOIN activity_records ar ON ar."documentId" = d.id
    JOIN emission_factors ef ON ce."emissionFactorId" = ef.id
    LEFT JOIN calculation_logs cl ON cl."calculatedEmissionsId" = ce.id
    ORDER BY ce."createdAt" DESC
    LIMIT 3
""")
chains = cur.fetchall()
for idx, c in enumerate(chains, 1):
    print(f"--- CHAIN #{idx} ---")
    print(f"  CalculatedEmission ID : {c[0]}")
    print(f"  Document ID           : {c[1]} ({c[2]})")
    print(f"  ExtractedData ID      : {c[4]} (Model: {c[5]}, Status: {c[6]})")
    print(f"  ActivityRecord ID     : {c[7]} ({c[8]}: {c[9]} {c[10]})")
    print(f"  EmissionFactor ID     : {c[11]} ({c[12]}:{c[13]} = {c[14]} [{c[15]}])")
    print(f"  CalculationLog ID     : {c[16]}")
    print(f"  Formula Used          : {c[17]}")
    print(f"  Scope & Result        : {c[18]} -> {c[19]} {c[20]} = {c[21]} kgCO2e [{c[22]}]\n")

print("==================================================================")
print("SECTION M: HISTORICAL CALCULATIONS AUDIT")
print("==================================================================")
cur.execute("""
    SELECT count(*), min("createdAt"), max("createdAt"), count(DISTINCT "emissionFactorId")
    FROM calculated_emissions
""")
hist_stats = cur.fetchone()
print(f"Total Historic Calculations in DB: {hist_stats[0]}")
print(f"Date Range: {hist_stats[1]} to {hist_stats[2]}")
print(f"Distinct Factors Used: {hist_stats[3]}")

cur.execute("""
    SELECT count(*)
    FROM calculated_emissions
    WHERE "calculationMethod" = 'DISTANCE_FACTOR' AND "activityUnit" = 'LITERS' AND co2e > 50000
""")
corrupted_legacy_count = cur.fetchone()[0]
print(f"Legacy Corrupted Business Travel/Freight Calculations in DB: {corrupted_legacy_count}")

conn.close()
