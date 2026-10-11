import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

print("=================================================================")
print("1. SEARCHING FOR 21,000 / 2.6878 / 56443.8 CALCULATION RECORD")
print("=================================================================")

cur.execute("""
    SELECT 
        ce.id, ce."organizationId", ce."siteId", ce."reportingPeriodId", ce."documentId",
        ce."emissionFactorId", ce.scope, ce.co2e, ce."activityValue", ce."activityUnit",
        ce."calculationMethod", ce."formulaUsed", ce."createdAt",
        d."fileName", d."categoryId", dc.name as cat_name, dc.code as cat_code,
        ef.category as ef_cat, ef."subCategory" as ef_subcat, ef."factorValue" as ef_val,
        ef.unit as ef_unit, ef."sourceSet" as ef_source, ef.version as ef_ver
    FROM calculated_emissions ce
    LEFT JOIN documents d ON ce."documentId" = d.id
    LEFT JOIN document_categories dc ON d."categoryId" = dc.id
    LEFT JOIN emission_factors ef ON ce."emissionFactorId" = ef.id
    WHERE ce."activityValue" = 21000 OR ce.co2e = 56443.8 OR ce."calculationMethod" LIKE '%DISTANCE%' OR ce.co2e BETWEEN 56440 AND 56450
""")
rows = cur.fetchall()
print(f"Found {len(rows)} matching calculated_emissions records:")
for r in rows:
    print(r)

print("\n=================================================================")
print("2. SEARCHING FOR FACTOR 2.6878 IN emission_factors TABLE")
print("=================================================================")
cur.execute("""
    SELECT id, category, "subCategory", region, "factorValue", unit, "sourceSet", version, "createdBy", "createdAt"
    FROM emission_factors
    WHERE "factorValue" BETWEEN 2.6877 AND 2.6879 OR "factorValue" = 2.6878 OR "subCategory" LIKE '%DIESEL%' OR "category" LIKE '%TRAVEL%'
""")
ef_rows = cur.fetchall()
print(f"Found {len(ef_rows)} factor matches:")
for ef in ef_rows:
    print(ef)

print("\n=================================================================")
print("3. EXAMINING ALL CALCULATED EMISSIONS RECORDS IN DB")
print("=================================================================")
cur.execute("""
    SELECT ce.id, ce."documentId", d."fileName", dc.code, ce.scope, ce."activityValue", ce."activityUnit", ce.co2e, ce."calculationMethod", ef."factorValue", ef."sourceSet", ef."subCategory"
    FROM calculated_emissions ce
    LEFT JOIN documents d ON ce."documentId" = d.id
    LEFT JOIN document_categories dc ON d."categoryId" = dc.id
    LEFT JOIN emission_factors ef ON ce."emissionFactorId" = ef.id
    LIMIT 25
""")
for r in cur.fetchall():
    print(r)

print("\n=================================================================")
print("4. ALL DISTINCT EMISSION FACTOR SOURCES & CATEGORIES")
print("=================================================================")
cur.execute("""
    SELECT "sourceSet", category, count(*), min("factorValue"), max("factorValue")
    FROM emission_factors
    GROUP BY "sourceSet", category
    ORDER BY "sourceSet", category
""")
for r in cur.fetchall():
    print(r)

print("\n=================================================================")
print("5. EXAMINING DOCUMENTS AND EXTRACTED DATA")
print("=================================================================")
cur.execute("""
    SELECT d.id, d."fileName", d.status, ed."fieldsJson", ed."modelVersion", ed.status as ext_status
    FROM documents d
    LEFT JOIN extracted_data ed ON d.id = ed."documentId"
    WHERE d."fileName" LIKE '%travel%' OR d."fileName" LIKE '%diesel%' OR d."fileName" LIKE '%fleet%' OR d."fileName" LIKE '%bol%'
    LIMIT 10
""")
for r in cur.fetchall():
    print(r)

conn.close()
