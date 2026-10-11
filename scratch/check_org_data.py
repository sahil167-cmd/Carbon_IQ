import psycopg2
conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()
# Get sites and periods for the first org
cur.execute('''SELECT s.id, s.name, s."organizationId" FROM sites s 
               JOIN users u ON s."organizationId" = u."organizationId" 
               WHERE u.email = 'borhadesahil167@gmail.com' LIMIT 5''')
print("SITES:", cur.fetchall())

cur.execute('''SELECT rp.id, rp.name, rp.status, rp."organizationId" FROM reporting_periods rp 
               JOIN users u ON rp."organizationId" = u."organizationId" 
               WHERE u.email = 'borhadesahil167@gmail.com' LIMIT 5''')
print("PERIODS:", cur.fetchall())

# Also get the password hash to understand format
cur.execute("SELECT id, email, \"passwordHash\" FROM users WHERE email = 'borhadesahil167@gmail.com'")
row = cur.fetchone()
print(f"USER: {row[0]}, {row[1]}, hash_prefix={row[2][:20] if row[2] else 'NULL'}")
conn.close()
