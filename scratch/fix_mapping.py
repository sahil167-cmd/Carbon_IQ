import psycopg2

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

cur.execute('''
    UPDATE activity_type_mappings
    SET "emissionCategory" = 'UPSTREAM_TRANSPORT'
    WHERE "categoryCode" = 'UPSTREAM_TRANSPORT'
''')
conn.commit()
print("Updated activity_type_mappings for UPSTREAM_TRANSPORT")
conn.close()
