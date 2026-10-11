import psycopg2

DB_URL = "postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev"
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

cur.execute("SELECT id, \"organizationId\", \"chunkText\" FROM kb_chunks WHERE \"chunkText\" ILIKE '%tata%' LIMIT 5;")
rows = cur.fetchall()
print(f"Total Tata chunks in kb_chunks: {len(rows)}")
for r in rows:
    print("Chunk:", r[0], "Org:", r[1])
    print(r[2][:250])
    print("-" * 50)

cur.execute("SELECT id, \"organizationId\", \"fileName\" FROM documents WHERE \"fileName\" ILIKE '%india%' OR \"fileName\" ILIKE '%tata%' LIMIT 5;")
for r in cur.fetchall():
    print("Doc:", r)

cur.close()
conn.close()
