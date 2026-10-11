import psycopg2
import json

DB_URL = "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev"
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

print("--- 1. All documents in DB ---")
cur.execute("SELECT id, \"organizationId\", \"fileName\", \"s3Key\", status, \"manualData\" FROM documents ORDER BY \"createdAt\" DESC LIMIT 20;")
docs = cur.fetchall()
for d in docs:
    print(d[0], d[1], d[2], d[3], d[4])

print("\n--- 2. All extracted_data in DB ---")
cur.execute("SELECT id, \"documentId\", \"fieldsJson\" FROM extracted_data LIMIT 10;")
ed = cur.fetchall()
for e in ed:
    print(f"Doc: {e[1]}")
    print(json.dumps(e[2], indent=2)[:300])
    print("-" * 40)

print("\n--- 3. All kb_documents in DB ---")
cur.execute("SELECT * FROM kb_documents LIMIT 10;")
kb_docs = cur.fetchall()
print(f"Total kb_documents: {len(kb_docs)}")
for kd in kb_docs:
    print(kd)

print("\n--- 4. All kb_chunks in DB ---")
cur.execute("SELECT count(*) FROM kb_chunks;")
print(f"Total kb_chunks count: {cur.fetchone()[0]}")

cur.execute("SELECT id, \"documentId\", \"chunkText\" FROM kb_chunks LIMIT 5;")
chunks = cur.fetchall()
for c in chunks:
    print(c[0], c[1], c[2][:150])

cur.close()
conn.close()
