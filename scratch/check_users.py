import psycopg2

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()
cur.execute('SELECT email, role, "organizationId" FROM users LIMIT 5')
for r in cur.fetchall():
    print(r)
conn.close()
