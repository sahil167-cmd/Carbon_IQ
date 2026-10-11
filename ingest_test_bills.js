const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Ingesting 9 complex PDF bills into CarbonIQ Database...');

  // 1. Resolve seed org, site, reporting period, user
  const org = await prisma.organization.findFirst();
  const site = await prisma.site.findFirst({ where: { organizationId: org.id } });
  const period = await prisma.reportingPeriod.findFirst({ where: { organizationId: org.id } });
  const user = await prisma.user.findFirst({ where: { organizationId: org.id } });

  const categories = await prisma.documentCategory.findMany();
  const catMap = {};
  for (const c of categories) catMap[c.code] = c.id;

  const testBills = [
    // Scope 1
    {
      fileName: 'scope1_stationary_diesel_generator.pdf',
      categoryCode: 'STATIONARY_COMBUSTION',
      source: 'UPLOAD',
      fields: { quantity: 4250, unit: 'LITERS', fuelType: 'DIESEL', meterId: 'TANK-GEN-01' },
    },
    {
      fileName: 'scope1_natural_gas_utility.pdf',
      categoryCode: 'STATIONARY_COMBUSTION',
      source: 'UPLOAD',
      fields: { quantity: 18400, unit: 'M3', fuelType: 'NATURAL_GAS', meterId: 'MTR-GAS-9912' },
    },
    {
      fileName: 'scope1_mobile_fleet_diesel.pdf',
      categoryCode: 'MOBILE_COMBUSTION',
      source: 'UPLOAD',
      fields: { quantity: 6850, unit: 'GALLONS', fuelType: 'DIESEL', fleetBatchId: 'BATCH-CHI-01' },
    },

    // Scope 2
    {
      fileName: 'scope2_us_industrial_power.pdf',
      categoryCode: 'ELECTRICITY',
      source: 'UPLOAD',
      fields: { kwhConsumed: 77500, unit: 'KWH', gridRegion: 'US_GRID', accountNumber: 'ACCT-CONED-99120' },
    },
    {
      fileName: 'scope2_india_manufacturing_grid.pdf',
      categoryCode: 'ELECTRICITY',
      source: 'UPLOAD',
      fields: { kwhConsumed: 125000, unit: 'KWH', gridRegion: 'IN_GRID', consumerNumber: 'HT-PUNE-883011' },
    },
    {
      fileName: 'scope2_eu_renewable_rec_facility.pdf',
      categoryCode: 'ELECTRICITY',
      source: 'UPLOAD',
      fields: { kwhConsumed: 92000, unit: 'KWH', gridRegion: 'EU_GRID', recVerification: true, contractId: 'PPA-EU-VATT-4401' },
    },

    // Scope 3
    {
      fileName: 'scope3_ocean_intermodal_freight.pdf',
      categoryCode: 'UPSTREAM_TRANSPORT',
      source: 'UPLOAD',
      fields: { weightKg: 45500, distanceKm: 10400, transportMode: 'OCEAN_FREIGHT', bolNumber: 'BOL-MAE-2026-9901' },
    },
    {
      fileName: 'scope3_air_freight_airwaybill.pdf',
      categoryCode: 'UPSTREAM_TRANSPORT',
      source: 'UPLOAD',
      fields: { weightKg: 3200, distanceKm: 6900, transportMode: 'AIR_FREIGHT', awbNumber: 'AWB-020-88392011' },
    },
    {
      fileName: 'scope3_purchased_goods_steel.pdf',
      categoryCode: 'PURCHASED_GOODS',
      source: 'UPLOAD',
      fields: { quantity: 28500, unit: 'KG', itemType: 'STEEL', poNumber: 'PO-STEEL-2026-882' },
    },
  ];

  for (const bill of testBills) {
    const catId = catMap[bill.categoryCode] || catMap['GENERAL'];

    const doc = await prisma.document.create({
      data: {
        organization: { connect: { id: org.id } },
        site: { connect: { id: site.id } },
        reportingPeriod: { connect: { id: period.id } },
        uploadedBy: { connect: { id: user.id } },
        category: { connect: { id: catId } },
        fileName: bill.fileName,
        s3Key: `uploads/${org.id}/${bill.fileName}`,
        mimeType: 'application/pdf',
        fileSize: 15420,
        source: bill.source,
        status: 'EXTRACTED',
      },
    });

    await prisma.extractedData.create({
      data: {
        document: { connect: { id: doc.id } },
        fieldsJson: bill.fields,
        fieldConfidenceJson: {},
        extractionVersion: 1,
        modelVersion: 'v1.0',
      },
    });

    console.log(`Ingested [${doc.id}] ${bill.fileName}`);
  }

  console.log('All 9 test documents ingested successfully into database!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
