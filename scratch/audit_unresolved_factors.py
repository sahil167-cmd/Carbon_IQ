import psycopg2
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

cur.execute("""
    SELECT id, category, "subCategory", region, "sourceSet", version, year, "factorValue", unit, citation
    FROM emission_factors
    WHERE citation ILIKE '%REFERENCE_REQUIRES_VERIFICATION%'
    ORDER BY category, "subCategory"
""")
unresolved = cur.fetchall()
print(f"Total Unresolved Factors Found: {len(unresolved)}\n")

for r in unresolved:
    print(f"ID: {r[0]} | Cat: {r[1]} | SubCat: {r[2]} | Region: {r[3]} | Set: {r[4]} | Val: {r[7]} {r[8]}")

conn.close()
