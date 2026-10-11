import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

cur.execute('SELECT * FROM activity_type_mappings WHERE "categoryCode" = \'PURCHASED_GOODS\'')
cols = [desc[0] for desc in cur.description]
mapping = dict(zip(cols, cur.fetchone()))
print("MAPPING FOR PURCHASED_GOODS:", json.dumps(mapping, indent=2, default=str))

# Check emission_factors in category PURCHASED_GOODS
cur.execute('SELECT id, category, "subCategory", region, "factorValue", unit, "sourceSet" FROM emission_factors WHERE category = \'PURCHASED_GOODS\'')
factors = cur.fetchall()
f_cols = [desc[0] for desc in cur.description]
print(f"\nFactors in PURCHASED_GOODS ({len(factors)}):")
for f in factors:
    print(" ", dict(zip(f_cols, f)))

conn.close()
