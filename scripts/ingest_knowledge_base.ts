import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { CopilotRepository } from '../apps/core-api/src/modules/copilot/copilot.repository';
import { IngestionService } from '../apps/core-api/src/modules/copilot/ingestion/ingestion.service';

/**
 * Knowledge Base Ingestion Script
 * Pre-seeds authorized global sustainability standards (GHG Protocol, GLEC, SBTi)
 * into the RAG vector corpus (organizationId = null).
 */
async function main() {
  const prisma = new PrismaClient();
  const repo = new CopilotRepository(prisma);
  const ingestionService = new IngestionService(repo);

  console.log('🌱 Starting CarbonIQ Knowledge Base Ingestion...');

  const standardsDocs = [
    {
      filename: 'GHG_Protocol_Corporate_Standard_Summary.txt',
      mimeType: 'text/plain',
      content: `GHG PROTOCOL CORPORATE ACCOUNTING AND REPORTING STANDARD

1. SCOPE 1: DIRECT GHG EMISSIONS
Scope 1 emissions are direct greenhouse gas emissions that occur from sources owned or controlled by the reporting organization.
Examples include:
- Stationary combustion: boilers, furnaces, diesel generators, heaters.
- Mobile combustion: company-owned automobiles, delivery vans, trucks, forklifts, ships, airplanes.
- Process emissions: chemical reactions during industrial processes (e.g. cement manufacturing, aluminum smelting).
- Fugitive emissions: unintentional leaks from refrigeration, air conditioning equipment, methane leaks from pipelines.

2. SCOPE 2: INDIRECT ELECTRICITY & HEATING EMISSIONS
Scope 2 emissions account for GHG emissions from the generation of purchased electricity, steam, heating, and cooling consumed by the organization.
Accounting Methods:
- Location-Based: Reflects the average emission intensity of grids on which energy consumption occurs (grid average emission factors).
- Market-Based: Reflects emissions from electricity that companies have purposefully chosen (contractual instruments, renewable energy certificates, PPAs).

3. SCOPE 3: OTHER INDIRECT VALUE CHAIN EMISSIONS
Scope 3 is an optional reporting category that covers all other indirect emissions occurring across an organization's value chain, both upstream and downstream.
The 15 Categories of Scope 3:
Category 1: Purchased goods and services
Category 2: Capital goods
Category 3: Fuel- and energy-related activities (not included in Scope 1 or 2)
Category 4: Upstream transportation and distribution (freight, third-party logistics)
Category 5: Waste generated in operations
Category 6: Business travel (commercial air, rail, rental cars)
Category 7: Employee commuting
Category 8: Upstream leased assets
Category 9: Downstream transportation and distribution
Category 10: Processing of sold products
Category 11: Use of sold products
Category 12: End-of-life treatment of sold products
Category 13: Downstream leased assets
Category 14: Franchises
Category 15: Investments
`,
    },
    {
      filename: 'GLEC_Framework_Logistics_Emissions.txt',
      mimeType: 'text/plain',
      content: `GLEC FRAMEWORK FOR LOGISTICS EMISSIONS ACCOUNTING (v3.0)

1. PURPOSE & PRINCIPLES
The Global Logistics Emissions Council (GLEC) Framework is the recognized global methodology for calculating and reporting logistics greenhouse gas emissions across multi-modal transport chains.

2. CALCULATION METHODOLOGIES
- Tonne-Kilometre (tkm): The fundamental activity metric representing the transport of one metric tonne of cargo over a distance of one kilometre.
Formula: Emissions (kg CO2e) = Mass (tonnes) × Distance (km) × Emission Factor (kg CO2e / tkm)
- Fuel-Based Method: Used when primary fuel consumption data is available from carriers.
Formula: Emissions (kg CO2e) = Fuel Consumed (litres or kWh) × Fuel Emission Factor (kg CO2e / unit)

3. MODAL EMISSION INTENSITIES (DEFAULT BENCHMARKS)
- Road Heavy Duty Truck (Articulated >32t): ~0.092 kg CO2e / tonne-km
- Road Light Commercial Vehicle (<3.5t): ~0.178 kg CO2e / tonne-km
- Rail Freight (Electric / Grid Mix): ~0.022 kg CO2e / tonne-km
- Sea Freight (Container Ship >8000 TEU): ~0.015 kg CO2e / tonne-km
- Air Freight (Dedicated Freighter long-haul): ~0.602 kg CO2e / tonne-km
`,
    },
    {
      filename: 'Science_Based_Targets_Decarbonization_Guide.txt',
      mimeType: 'text/plain',
      content: `SCIENCE-BASED TARGETS (SBTi) CORPORATE DECARBONIZATION BEST PRACTICES

1. SCOPE 1 REDUCTION LEVERS
- Fleet Electrification: Transition commercial fleets and executive vehicles to battery electric vehicles (BEVs).
- Energy Efficiency: Upgrade boiler burner controls, waste heat recovery, and variable speed drives.
- Fuel Switching: Replace diesel and heavy fuel oil with certified biomethane or green hydrogen.

2. SCOPE 2 REDUCTION LEVERS
- Power Purchase Agreements (PPAs): Secure long-term offsite solar and wind energy contracts.
- On-Site Generation: Install rooftop solar photovoltaic (PV) arrays and battery energy storage systems (BESS).
- Energy Conservation: Deploy smart building management systems (BMS), LED retrofits, and HVAC optimization.

3. SCOPE 3 REDUCTION LEVERS
- Supplier Engagement: Require top 80% suppliers by spend to measure and disclose product carbon footprints.
- Modal Shift: Shift high-carbon air freight to ocean or rail corridors where lead times allow.
- Low-Carbon Materials: Source recycled steel, low-clinker cement, and circular packaging materials.
`,
    },
  ];

  for (const doc of standardsDocs) {
    const buffer = Buffer.from(doc.content, 'utf-8');
    const res = await ingestionService.ingestDocument({
      buffer,
      filename: doc.filename,
      mimeType: doc.mimeType,
      organizationId: undefined, // Global knowledge base
    });
    console.log(`  ✓ Ingested: ${doc.filename} -> Status: ${res.status} (${res.chunksCreated} chunks, ${res.totalTokens} tokens)`);
  }

  console.log('✅ Knowledge base ingestion complete.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
