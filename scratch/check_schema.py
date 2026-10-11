import psycopg2
conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()
cur.execute("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'sites' ORDER BY ordinal_position")
for r in cur.fetchall():
    print(r)

# Check existing site for reference
cur.execute("SELECT * FROM sites LIMIT 1")
cols = [desc[0] for desc in cur.description]
row = cur.fetchone()
if row:
    for c, v in zip(cols, row):
        print(f"  {c}: {v}")

# Also check reporting_periods columns
print("\n--- reporting_periods ---")
cur.execute("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'reporting_periods' ORDER BY ordinal_position")
for r in cur.fetchall():
    print(r)
conn.close()
