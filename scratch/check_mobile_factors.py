import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

cur.execute('''
    SELECT id, category, "subCategory", "factorValue", unit, "sourceSet", citation
    FROM emission_factors
    WHERE category = \'MOBILE_COMBUSTION\'
''')
rows = cur.fetchall()
cols = [desc[0] for desc in cur.description]
print("MOBILE_COMBUSTION FACTORS:")
for r in rows:
    print(json.dumps(dict(zip(cols, r)), indent=2, default=str))

conn.close()
