import psycopg2
import json
import hashlib
import sys
sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

print("==================================================================")
print("1. DATABASE EMISSION FACTORS PROVENANCE AUDIT")
print("==================================================================")
cur.execute("""
    SELECT "sourceSet", count(*), 
           min(year) as min_year, max(year) as max_year,
           count(CASE WHEN "gwpBasis" IS NOT NULL THEN 1 END) as with_gwp,
           count(CASE WHEN citation IS NOT NULL THEN 1 END) as with_citation
    FROM emission_factors
    GROUP BY "sourceSet"
    ORDER BY count(*) DESC
""")
for r in cur.fetchall():
    print(r)

print("\n==================================================================")
print("2. PROVENANCE CHAIN AUDIT FOR REAL CALCULATED EMISSION")
print("==================================================================")
cur.execute("""
    SELECT ce.id as calc_id, ce."documentId", ce."emissionFactorId", ce."validationStatus",
           ce.scope, ce."activityValue", ce."activityUnit", ce.co2e,
           cl.id as log_id, cl."formulaUsed", cl."formulaVersion",
           ef.category as ef_cat, ef."subCategory" as ef_subcat, ef."factorValue" as ef_val, ef."sourceSet" as ef_source,
           d."fileName", d.status as doc_status
    FROM calculated_emissions ce
    LEFT JOIN calculation_logs cl ON cl."calculatedEmissionsId" = ce.id
    LEFT JOIN emission_factors ef ON ce."emissionFactorId" = ef.id
    LEFT JOIN documents d ON ce."documentId" = d.id
    ORDER BY ce."createdAt" DESC
    LIMIT 5
""")
for r in cur.fetchall():
    print(r)

print("\n==================================================================")
print("3. DASHBOARD VERIFIED LEDGER ISOLATION AUDIT")
print("==================================================================")
cur.execute("""
    SELECT "validationStatus", count(*), sum(co2e) as total_co2e
    FROM calculated_emissions
    GROUP BY "validationStatus"
""")
for r in cur.fetchall():
    print(r)

print("\n==================================================================")
print("4. DOCUMENT FINGERPRINTS & DUPLICATE DETECTION AUDIT")
print("==================================================================")
cur.execute("""
    SELECT count(*), min("createdAt"), max("createdAt")
    FROM document_fingerprints
""")
print("Document Fingerprints Count:", cur.fetchall())

cur.execute("""
    SELECT count(*), min("createdAt"), max("createdAt")
    FROM activity_records
""")
print("Activity Records Count:", cur.fetchall())

print("\n==================================================================")
print("5. CHECKING FOR BYPASS CALCULATIONS WITHOUT FACTORS")
print("==================================================================")
cur.execute("""
    SELECT id, "documentId", "emissionFactorId", co2e, "validationStatus"
    FROM calculated_emissions
    WHERE "emissionFactorId" IS NULL OR co2e IS NULL OR "activityValue" IS NULL
""")
bypasses = cur.fetchall()
print("Bypass Records Found:", len(bypasses), bypasses)

conn.close()
