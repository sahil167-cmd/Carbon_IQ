import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

cur.execute('SELECT * FROM activity_type_mappings WHERE "categoryCode" = \'BUSINESS_TRAVEL\'')
cols = [desc[0] for desc in cur.description]
rows = cur.fetchall()
for r in rows:
    print("BUSINESS_TRAVEL MAPPING:", dict(zip(cols, r)))

# Also check all activity_type_mappings
cur.execute('SELECT * FROM activity_type_mappings')
all_cols = [desc[0] for desc in cur.description]
all_rows = cur.fetchall()
print("\nALL ACTIVITY TYPE MAPPINGS:")
for r in all_rows:
    print(" ", dict(zip(all_cols, r)))

conn.close()
