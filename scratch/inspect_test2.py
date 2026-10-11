import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

# Get extracted data for TEST 2 document cmtcqm976007i1k1g7jqlmfl1
cur.execute('SELECT "fieldsJson" FROM extracted_data WHERE "documentId" = \'cmtcqm976007i1k1g7jqlmfl1\'')
row = cur.fetchone()
if row:
    print("FIELDS:", json.dumps(row[0], indent=2))

# Get calculated emission for TEST 2
cur.execute('SELECT * FROM calculated_emissions WHERE "documentId" = \'cmtcqm976007i1k1g7jqlmfl1\'')
cols = [desc[0] for desc in cur.description]
ce = cur.fetchone()
if ce:
    print("CALCULATED EMISSION:", dict(zip(cols, ce)))

conn.close()
