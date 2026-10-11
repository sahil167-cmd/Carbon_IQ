import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

# Get the latest document uploaded with name 'scope3_purchased_goods_steel.pdf'
cur.execute('''
    SELECT d.id, d."fileName", d.status, d."organizationId", d."siteId", d."reportingPeriodId", d."categoryId", d."createdAt", d."updatedAt",
           c.name as cat_name, c.code as cat_code, c.scope as cat_scope,
           s.name as site_name, s.country as site_country,
           rp.name as period_name, rp.status as period_status
    FROM documents d
    LEFT JOIN document_categories c ON d."categoryId" = c.id
    LEFT JOIN sites s ON d."siteId" = s.id
    LEFT JOIN reporting_periods rp ON d."reportingPeriodId" = rp.id
    WHERE d."fileName" = 'scope3_purchased_goods_steel.pdf'
    ORDER BY d."createdAt" DESC
    LIMIT 3
''')
docs = cur.fetchall()
doc_cols = [desc[0] for desc in cur.description]

for i, d in enumerate(docs):
    doc_dict = dict(zip(doc_cols, d))
    print(f"\n==================== LATEST DOCUMENT #{i+1} ====================")
    print(json.dumps(doc_dict, indent=2, default=str))
    
    doc_id = doc_dict['id']
    org_id = doc_dict['organizationId']

    # Extracted data
    cur.execute('SELECT id, "modelVersion", "fieldsJson", "status", "createdAt" FROM extracted_data WHERE "documentId" = %s ORDER BY "createdAt" DESC', (doc_id,))
    exts = cur.fetchall()
    ext_cols = [desc[0] for desc in cur.description]
    print(f"  Extracted records ({len(exts)}):")
    for ext in exts:
        ext_dict = dict(zip(ext_cols, ext))
        print("   ", json.dumps(ext_dict, indent=4, default=str))

    # Activity records
    cur.execute('SELECT id, "activityType", quantity, unit, "createdAt" FROM activity_records WHERE "documentId" = %s', (doc_id,))
    acts = cur.fetchall()
    act_cols = [desc[0] for desc in cur.description]
    print(f"  Activity records ({len(acts)}):")
    for act in acts:
        act_dict = dict(zip(act_cols, act))
        print("   ", json.dumps(act_dict, indent=4, default=str))

    # Calculated emissions
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

conn.close()
