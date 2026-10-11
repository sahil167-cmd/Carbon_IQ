import psycopg2

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

# Find the org for the test exec user
cur.execute("SELECT id, \"organizationId\" FROM users WHERE email = 'carboniq_test_exec@carboniq.dev'")
user = cur.fetchone()
print(f"User ID: {user[0]}, Org ID: {user[1]}")

cur.execute('SELECT id, name FROM sites WHERE "organizationId" = %s', (user[1],))
sites = cur.fetchall()

if not sites:
    cur.execute('''INSERT INTO sites (id, name, type, status, address, city, country, "organizationId", "createdAt", "updatedAt")
                   VALUES ('cmtby_site_001', 'Test Logistics Hub', 'OFFICE', 'ACTIVE', '1 Carbon St', 'Chicago', 'US', %s, NOW(), NOW())''', (user[1],))
    print("Created site: cmtby_site_001")

cur.execute('SELECT id, name, status FROM reporting_periods WHERE "organizationId" = %s', (user[1],))
periods = cur.fetchall()

if not periods:
    cur.execute('''INSERT INTO reporting_periods (id, name, "startDate", "endDate", status, "organizationId", "createdAt", "updatedAt")
                   VALUES ('cmtby_period_001', 'CY 2026', '2026-01-01', '2026-12-31', 'OPEN', %s, NOW(), NOW())''', (user[1],))
    print("Created period: cmtby_period_001")

conn.commit()
conn.close()
print("Setup complete")
