import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

print("=" * 80)
print("  DIAGNOSTIC TRACE FOR scope3_purchased_goods_steel.pdf")
print("=" * 80)

# 1. Find all documents with fileName = 'scope3_purchased_goods_steel.pdf'
cur.execute('''
    SELECT d.id, d."fileName", d.status, d."organizationId", d."siteId", d."reportingPeriodId", d."categoryId", d."createdAt", d."updatedAt",
           c.name as cat_name, c.code as cat_code, c.scope as cat_scope
    FROM documents d
    LEFT JOIN document_categories c ON d."categoryId" = c.id
    WHERE d."fileName" = 'scope3_purchased_goods_steel.pdf'
    ORDER BY d."createdAt" DESC
''')
docs = cur.fetchall()
doc_cols = [desc[0] for desc in cur.description]

print(f"Total documents found matching 'scope3_purchased_goods_steel.pdf': {len(docs)}")
for i, d in enumerate(docs):
    doc_dict = dict(zip(doc_cols, d))
    print(f"\n--- Document #{i+1} ---")
    print(json.dumps(doc_dict, indent=2, default=str))
    
    doc_id = doc_dict['id']
    
    # 2. Find extracted_data
    cur.execute('SELECT id, "modelVersion", "fieldsJson", "status", "createdAt" FROM extracted_data WHERE "documentId" = %s ORDER BY "createdAt" DESC', (doc_id,))
    exts = cur.fetchall()
    ext_cols = [desc[0] for desc in cur.description]
    print(f"  Extracted records ({len(exts)}):")
    for ext in exts:
        ext_dict = dict(zip(ext_cols, ext))
        print("   ", json.dumps(ext_dict, indent=4, default=str))

    # 3. Find activity_records
    cur.execute('SELECT id, "activityType", quantity, unit, "createdAt" FROM activity_records WHERE "documentId" = %s', (doc_id,))
    acts = cur.fetchall()
    act_cols = [desc[0] for desc in cur.description]
    print(f"  Activity records ({len(acts)}):")
    for act in acts:
        act_dict = dict(zip(act_cols, act))
        print("   ", json.dumps(act_dict, indent=4, default=str))

    # 4. Find calculated_emissions
    cur.execute('''
        SELECT ce.id, ce.scope, ce.co2e, ce."activityValue", ce."activityUnit", ce."calculationMethod", ce."validationStatus", ce."emissionFactorId", ce."createdAt"
        FROM calculated_emissions ce
        WHERE ce."documentId" = %s
    ''', (doc_id,))
    ces = cur.fetchall()
    ce_cols = [desc[0] for desc in cur.description]
    print(f"  Calculated emissions ({len(ces)}):")
    for ce in ces:
        ce_dict = dict(zip(ce_cols, ce))
        print("   ", json.dumps(ce_dict, indent=4, default=str))

    # 5. Find calculation_logs
    cur.execute('''
        SELECT cl.id, cl."formulaUsed", cl."factorVersion", cl."calculatedEmissionsId", cl."createdAt"
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
