import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

doc_id = 'cmtblf36t0004rwoutearpad1'
calc_id = 'cmtblf3ty000yrwouxpqgsqkg'
factor_id = 'cmrxg0uvd000a102uhf8jf87a'

print("=== 1. DOCUMENT RECORD ===")
cur.execute('SELECT * FROM documents WHERE id = %s', (doc_id,))
doc = cur.fetchone()
cols = [desc[0] for desc in cur.description]
print(json.dumps(dict(zip(cols, [str(v) if v is not None else None for v in doc])), indent=2))

print("\n=== 2. EXTRACTED DATA RECORD ===")
cur.execute('SELECT * FROM extracted_data WHERE "documentId" = %s', (doc_id,))
for row in cur.fetchall():
    cols = [desc[0] for desc in cur.description]
    print(json.dumps(dict(zip(cols, [v if not isinstance(v, (str, int, float, bool, dict, list)) and v is not None else v for v in row])), indent=2, default=str))

print("\n=== 3. CALCULATED EMISSIONS RECORD ===")
cur.execute('SELECT * FROM calculated_emissions WHERE id = %s', (calc_id,))
row = cur.fetchone()
cols = [desc[0] for desc in cur.description]
print(json.dumps(dict(zip(cols, [str(v) if v is not None else None for v in row])), indent=2))

print("\n=== 4. CALCULATION LOGS RECORD ===")
cur.execute('SELECT * FROM calculation_logs WHERE "calculatedEmissionsId" = %s', (calc_id,))
for row in cur.fetchall():
    cols = [desc[0] for desc in cur.description]
    print(json.dumps(dict(zip(cols, [v if not isinstance(v, (str, int, float, bool, dict, list)) and v is not None else v for v in row])), indent=2, default=str))

print("\n=== 5. EMISSION FACTOR RECORD ===")
cur.execute('SELECT * FROM emission_factors WHERE id = %s', (factor_id,))
row = cur.fetchone()
cols = [desc[0] for desc in cur.description]
print(json.dumps(dict(zip(cols, [str(v) if v is not None else None for v in row])), indent=2))

conn.close()
