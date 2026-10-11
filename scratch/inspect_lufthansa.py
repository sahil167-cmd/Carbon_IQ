import psycopg2
import psycopg2.extras

conn = psycopg2.connect("postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev")
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

print("=== DOCUMENTS MATCHING LUFTHANSA OR AIR ===")
cur.execute("""
    SELECT d.id, d."fileName", d."organizationId", d.status, d."s3Key", ed."fieldsJson", d."createdAt"
    FROM documents d
    LEFT JOIN extracted_data ed ON ed."documentId" = d.id
    WHERE d."fileName" ILIKE '%lufthansa%' OR d."fileName" ILIKE '%air%' OR ed."fieldsJson"::text ILIKE '%lufthansa%'
""")
rows = cur.fetchall()
print("Found docs:", len(rows))
for r in rows:
    print(r['fileName'], "Org:", r['organizationId'], "Status:", r['status'], "Fields:", str(r['fieldsJson'])[:150])

print("\n=== ALL DOCUMENTS RECENTLY UPLOADED ===")
cur.execute('SELECT d.id, d."fileName", d."organizationId", d.status, d."createdAt" FROM documents d ORDER BY d."createdAt" DESC LIMIT 10')
for r in cur.fetchall():
    print(r['fileName'], "Org:", r['organizationId'], "Status:", r['status'], "Created:", r['createdAt'])

print("\n=== KB_CHUNKS MATCHING LUFTHANSA ===")
cur.execute('SELECT kc.id, kc."documentId", kc."organizationId", kd.filename, kc."chunkText" FROM kb_chunks kc JOIN kb_documents kd ON kc."documentId" = kd.id WHERE kc."chunkText" ILIKE \'%lufthansa%\'')
chunks = cur.fetchall()
print("Found chunks with Lufthansa:", len(chunks))
for c in chunks:
    print(c['filename'], "Org:", c['organizationId'], c['chunkText'][:150])

cur.close()
conn.close()
