import psycopg2
import sys
sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

cur.execute("""
    SELECT 
        ce.id as calc_id,
        d.id as doc_id, d."fileName",
        ef.id as factor_id, ef."sourceSet", ef."factorValue", ef.unit,
        cl.id as log_id, cl."formulaUsed",
        ce.scope, ce."activityValue", ce."activityUnit", ce.co2e, ce."validationStatus"
    FROM calculated_emissions ce
    JOIN documents d ON ce."documentId" = d.id
    JOIN emission_factors ef ON ce."emissionFactorId" = ef.id
    LEFT JOIN calculation_logs cl ON cl."calculatedEmissionsId" = ce.id
    ORDER BY ce."createdAt" DESC
    LIMIT 3
""")
for idx, r in enumerate(cur.fetchall(), 1):
    print(f"CHAIN #{idx}:")
    print(f"  CalculatedEmission ID : {r[0]}")
    print(f"  Document ID           : {r[1]} ({r[2]})")
    print(f"  EmissionFactor ID     : {r[3]} ({r[4]}: {r[5]} {r[6]})")
    print(f"  CalculationLog ID     : {r[7]}")
    print(f"  Formula Used          : {r[8]}")
    print(f"  Result                : {r[9]} -> {r[10]} {r[11]} = {r[12]} kgCO2e [{r[13]}]\n")

conn.close()
