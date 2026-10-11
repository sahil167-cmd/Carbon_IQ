import psycopg2

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()
cur.execute("SELECT id, category, \"subCategory\", region, \"factorValue\", unit, \"sourceSet\" FROM emission_factors WHERE category ILIKE '%TRANSPORT%' OR category ILIKE '%FREIGHT%'")
for r in cur.fetchall():
    print(r)
conn.close()
