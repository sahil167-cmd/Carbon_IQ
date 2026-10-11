import psycopg2
import json

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

print("=" * 70)
print("  DATABASE LEDGER CONSISTENCY AUDIT (READ-ONLY)")
print("=" * 70)

# 1. Total counts across key tables
tables = ['documents', 'extracted_data', 'activity_records', 'emission_factors', 'calculated_emissions', 'calculation_logs', 'document_fingerprints', 'sites', 'reporting_periods']
counts = {}
for t in tables:
    cur.execute(f'SELECT COUNT(*) FROM "{t}"')
    counts[t] = cur.fetchone()[0]
print("ROW COUNTS:", json.dumps(counts, indent=2))

# 2. Check for orphan calculated_emissions (documentId not in documents)
cur.execute('''
    SELECT COUNT(*) FROM calculated_emissions ce
    LEFT JOIN documents d ON ce."documentId" = d.id
    WHERE d.id IS NULL
''')
orphan_ce = cur.fetchone()[0]
print(f"Orphan calculated_emissions: {orphan_ce}")

# 3. Check for calculated_emissions without factor
cur.execute('''
    SELECT COUNT(*) FROM calculated_emissions ce
    WHERE ce."emissionFactorId" IS NULL AND ce."validationStatus" = 'VERIFIED'
''')
no_factor_verified = cur.fetchone()[0]
print(f"VERIFIED calculated_emissions without factor: {no_factor_verified}")

# 4. Check for calculated_emissions without calculation_logs
cur.execute('''
    SELECT COUNT(*) FROM calculated_emissions ce
    LEFT JOIN calculation_logs cl ON cl."calculatedEmissionsId" = ce.id
    WHERE cl.id IS NULL AND ce."validationStatus" = 'VERIFIED'
''')
no_log_verified = cur.fetchone()[0]
print(f"VERIFIED calculated_emissions without calculation_logs: {no_log_verified}")

# 5. Check duplicate SHA-256 fingerprints in document_fingerprints
cur.execute('SELECT column_name FROM information_schema.columns WHERE table_name = \'document_fingerprints\'')
fp_cols = [r[0] for r in cur.fetchall()]
print(f"document_fingerprints columns: {fp_cols}")

cur.execute('''
    SELECT "sha256Hash", COUNT(*) FROM document_fingerprints
    GROUP BY "sha256Hash"
    HAVING COUNT(*) > 1
''')
dup_fingerprints = cur.fetchall()
print(f"Duplicate SHA-256 entries in fingerprints table: {len(dup_fingerprints)}")

# 6. Check multi-tenant isolation: check if any calculated_emissions have documentId belonging to different organizationId
cur.execute('''
    SELECT COUNT(*) FROM calculated_emissions ce
    JOIN documents d ON ce."documentId" = d.id
    WHERE ce."organizationId" != d."organizationId"
''')
tenant_mismatch = cur.fetchone()[0]
print(f"Tenant isolation mismatches between documents and emissions: {tenant_mismatch}")

conn.close()
print("=" * 70)
