import psycopg2
import psycopg2.extras
import sys

sys.stdout.reconfigure(encoding='utf-8')
conn = psycopg2.connect("postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev")
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

cur.execute("""
    SELECT kc.id, kc."documentId", kc."organizationId", kd.filename, kc."chunkText", (kc.embedding IS NOT NULL) as has_embedding
    FROM kb_chunks kc
    JOIN kb_documents kd ON kc."documentId" = kd.id
    WHERE kc.id = '9639058f-ba03-4d4f-816b-46b7cd20fa9b'
""")
r = cur.fetchone()
print("Has embedding:", r["has_embedding"])
print("Chunk text:\n", r["chunkText"])

cur.close()
conn.close()
