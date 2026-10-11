import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

print("=" * 80)
print("  DIAGNOSTIC TRACE FOR sample_scope3_freight_bol.pdf")
print("=" * 80)

# 1. Find all documents with fileName matching 'sample_scope3_freight_bol.pdf' or '%freight_bol.pdf'
cur.execute('''
    SELECT d.id, d."fileName", d.status, d."organizationId", d."siteId", d."reportingPeriodId", d."categoryId", d."createdAt", d."updatedAt",
           c.name as cat_name, c.code as cat_code, c.scope as cat_scope
    FROM documents d
    LEFT JOIN document_categories c ON d."categoryId" = c.id
    WHERE d."fileName" ILIKE '%freight_bol.pdf' OR d."fileName" ILIKE '%sample_scope3%'
    ORDER BY d."createdAt" DESC
''')
docs = cur.fetchall()
doc_cols = [desc[0] for desc in cur.description]

print(f"Total documents found matching query: {len(docs)}")
for i, d in enumerate(docs):
    doc_dict = dict(zip(doc_cols, d))
    print(f"\n==================== DOCUMENT #{i+1}: {doc_dict['fileName']} (ID: {doc_dict['id']}) ====================")
    print(json.dumps(doc_dict, indent=2, default=str))
    
    doc_id = doc_dict['id']

    # 2. Extracted Data
    cur.execute('SELECT id, "modelVersion", "fieldsJson", "status", "createdAt" FROM extracted_data WHERE "documentId" = %s ORDER BY "createdAt" DESC', (doc_id,))
    exts = cur.fetchall()
    ext_cols = [desc[0] for desc in cur.description]
    print(f"  Extracted records ({len(exts)}):")
    for ext in exts:
        ext_dict = dict(zip(ext_cols, ext))
        print("   ", json.dumps(ext_dict, indent=4, default=str))

    # 3. Activity Records
    cur.execute('SELECT * FROM activity_records WHERE "documentId" = %s', (doc_id,))
    acts = cur.fetchall()
    act_cols = [desc[0] for desc in cur.description]
    print(f"  Activity records ({len(acts)}):")
    for act in acts:
        act_dict = dict(zip(act_cols, act))
        print("   ", json.dumps(act_dict, indent=4, default=str))

    # 4. Calculated Emissions
    cur.execute('''
        SELECT ce.*, ef.category as ef_category, ef."subCategory" as ef_subCategory, ef."factorValue" as ef_factorValue, ef.unit as ef_unit, ef."sourceSet" as ef_sourceSet, ef.citation as ef_citation
        FROM calculated_emissions ce
        LEFT JOIN emission_factors ef ON ce."emissionFactorId" = ef.id
        WHERE ce."documentId" = %s
    ''', (doc_id,))
    ces = cur.fetchall()
    ce_cols = [desc[0] for desc in cur.description]
    print(f"  Calculated emissions ({len(ces)}):")
    for ce in ces:
        ce_dict = dict(zip(ce_cols, ce))
        print("   ", json.dumps(ce_dict, indent=4, default=str))

    # 5. Calculation Logs
    cur.execute('''
        SELECT cl.*
        FROM calculation_logs cl
        JOIN calculated_emissions ce ON cl."calculatedEmissionsId" = ce.id
        WHERE ce."documentId" = %s
    ''', (doc_id,))
    cls = cur.fetchall()
    cl_cols = [desc[0] for desc in cur.description]
    print(f"  Calculation logs ({len(cls)}):")
    for cl in cls:
        cl_dict = dict(zip(cl_cols, cl))
        print("   ", json.dumps(cl_dict, indent=4, default=str))

conn.close()
