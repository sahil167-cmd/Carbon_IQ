import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

cur.execute('SELECT count(*) FROM emission_factors')
total = cur.fetchone()[0]
print(f"Total Emission Factors in DB: {total}")

cur.execute('''
    SELECT category, "subCategory", unit, "sourceSet", count(*)
    FROM emission_factors
    GROUP BY category, "subCategory", unit, "sourceSet"
    ORDER BY category, "subCategory"
''')
rows = cur.fetchall()
print("\nEmission Factor Summary (category, subCategory, unit, sourceSet, count):")
for r in rows:
    print(f"  {r[0]:<25} | {r[1]:<25} | {r[2]:<15} | {r[3]:<15} | count: {r[4]}")

cur.execute('SELECT DISTINCT "sourceSet" FROM emission_factors')
sources = cur.fetchall()
print(f"\nDistinct sourceSets: {[s[0] for s in sources]}")

conn.close()
