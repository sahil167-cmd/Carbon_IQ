import psycopg2
import json

DB_URL = "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev"
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

print("--- 1. Check kb_documents ---")
cur.execute("SELECT id, \"organizationId\", filename, \"documentType\", status, \"pageCount\", \"chunkCount\" FROM (SELECT kd.*, count(kc.id) as \"chunkCount\" FROM kb_documents kd LEFT JOIN kb_chunks kc ON kc.\"documentId\" = kd.id GROUP BY kd.id) sub LIMIT 10;")
try:
    for row in cur.fetchall():
        print(row)
except Exception as e:
    print("kb_documents query error:", e)

print("\n--- 2. Check documents table ---")
cur.execute("SELECT d.id, d.\"organizationId\", d.\"fileName\", d.status, d.\"categoryId\", dc.name, d.\"createdAt\" FROM documents d LEFT JOIN document_categories dc ON dc.id = d.\"categoryId\" LIMIT 15;")
for row in cur.fetchall():
    print(row)

print("\n--- 3. Search for 'Tata' in documents, extracted_data, and kb_chunks ---")
cur.execute("SELECT id, \"fileName\", \"manualData\" FROM documents WHERE \"fileName\" ILIKE '%tata%' OR \"manualData\"::text ILIKE '%tata%';")
for row in cur.fetchall():
    print("Document match:", row)

cur.execute("SELECT id, \"documentId\", \"fieldsJson\" FROM extracted_data WHERE \"fieldsJson\"::text ILIKE '%tata%' LIMIT 5;")
for row in cur.fetchall():
    print("ExtractedData match:", row[0], row[1], json.dumps(row[2], indent=2))

cur.execute("SELECT id, \"documentId\", \"chunkText\", \"pageNumber\" FROM kb_chunks WHERE \"chunkText\" ILIKE '%tata%' LIMIT 5;")
for row in cur.fetchall():
    print("KbChunk match:", row[0], row[1], row[3], row[2][:200])

cur.close()
conn.close()
