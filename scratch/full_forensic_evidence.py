import psycopg2
import json
import hashlib
import sys
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect('postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev')
cur = conn.cursor()

print("==================================================================")
print("1. EMISSION FACTOR FORENSIC AUDIT (SAMPLE PRODUCTION FACTORS)")
print("==================================================================")
activities = ['DIESEL', 'GRID', 'US_GRID', 'NATURAL_GAS', 'ROAD_HEAVY_TRUCK', 'STEEL']
for act in activities:
    cur.execute("""
        SELECT id, category, "subCategory", region, "factorValue", unit, "sourceSet", version, 
               year, "gwpBasis", methodology, citation
        FROM emission_factors
        WHERE "subCategory" ILIKE %s OR category ILIKE %s
        ORDER BY year DESC, version DESC
        LIMIT 1
    """, (f"%{act}%", f"%{act}%"))
    row = cur.fetchone()
    if row:
        print(f"Activity: {act}")
        print(f"  ID: {row[0]}")
        print(f"  Category/SubCategory: {row[1]} / {row[2]}")
        print(f"  Geography: {row[3]}")
        print(f"  Factor Value: {row[4]} {row[5]}")
        print(f"  Source: {row[6]} (v{row[7]}, Year: {row[8]})")
        print(f"  GWP Basis: {row[9]}")
        print(f"  Methodology: {row[10]}")
        print(f"  Citation: {row[11]}\n")

print("==================================================================")
print("2. DASHBOARD VERIFIED LEDGER ISOLATION CHECK")
print("==================================================================")
cur.execute("""
    SELECT "validationStatus", count(*), sum(co2e) as total_co2e
    FROM calculated_emissions
    GROUP BY "validationStatus"
""")
for r in cur.fetchall():
    print(f"Status: {r[0]} | Count: {r[1]} | Total CO2e: {r[2]}")

print("\n==================================================================")
print("3. RAG PGVECTOR INDEXING & TENANT ISOLATION CHECK")
print("==================================================================")
cur.execute("""
    SELECT count(*), count(DISTINCT "documentId"), count(DISTINCT "organizationId")
    FROM kb_chunks
""")
kb_stats = cur.fetchone()
print(f"Total KB Chunks: {kb_stats[0]} | Distinct Documents: {kb_stats[1]} | Distinct Orgs: {kb_stats[2]}")

print("\n==================================================================")
print("4. ML FORECASTING DB INTEGRATION CHECK")
print("==================================================================")
cur.execute("""
    SELECT count(*), count(DISTINCT "organizationId"), count(DISTINCT "siteId")
    FROM ml_predictions
""")
pred_stats = cur.fetchone()
print(f"Total ML Predictions: {pred_stats[0]} | Orgs: {pred_stats[1]} | Sites: {pred_stats[2]}")

if pred_stats[0] > 0:
    cur.execute("""
        SELECT id, "organizationId", "siteId", scope, "targetMonth", "predictedCo2e", "confidenceLower", "confidenceUpper", "modelName"
        FROM ml_predictions
        LIMIT 2
    """)
    for p in cur.fetchall():
        print(f"Prediction Record: {p}")

conn.close()
