import psycopg2
import psycopg2.extras

conn = psycopg2.connect("postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev")
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

print("=== ALL KB DOCUMENTS ===")
cur.execute('SELECT id, filename, "organizationId" FROM kb_documents LIMIT 20')
for r in cur.fetchall():
    print(r)

print("\n=== SEARCH FOR UTILITY / CONED / ELECTRICITY IN ALL DOCUMENTS ===")
cur.execute('SELECT d.id, d."fileName", d."organizationId", dc.name as cat, ed."fieldsJson" FROM documents d LEFT JOIN document_categories dc ON d."categoryId" = dc.id LEFT JOIN extracted_data ed ON ed."documentId" = d.id WHERE d."fileName" ILIKE \'%coned%\' OR d."fileName" ILIKE \'%util%\' OR d."fileName" ILIKE \'%elect%\' OR d."fileName" ILIKE \'%scope2%\' OR ed."fieldsJson"::text ILIKE \'%coned%\' LIMIT 15')
for r in cur.fetchall():
    print(r['fileName'], "Org:", r['organizationId'], "Cat:", r['cat'], "Fields:", str(r['fieldsJson'])[:200])

print("\n=== SEARCH IN KB_CHUNKS FOR CONEDISON / TATA / MAERSK ===")
for kw in ['coned', 'tata', 'maersk', 'vattenfall', 'meter', 'grid']:
    cur.execute('SELECT COUNT(*) FROM kb_chunks WHERE "chunkText" ILIKE %s', (f'%{kw}%',))
    print(f"Keyword '{kw}' count in kb_chunks:", cur.fetchone()['count'])

cur.close()
conn.close()
