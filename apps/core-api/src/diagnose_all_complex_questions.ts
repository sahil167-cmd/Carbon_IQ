import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { CopilotRepository } from './modules/copilot/copilot.repository';
import { IngestionService } from './modules/copilot/ingestion/ingestion.service';
import { ForecastService } from './modules/forecast/forecast.service';
import { ForecastRepository } from './modules/forecast/forecast.repository';
import { FeatureFlagService } from './services/feature-flag.service';
import { NotificationService } from './services/notification.service';
import { CopilotService } from './modules/copilot/copilot.service';

const complexQuestions = [
  'What is our estimated carbon tax liability under EU ETS at $80/tCO2e versus the SBTi $100/tCO2e shadow price?',
  'How can we optimize money and reduce Scope 3 emissions using the Marginal Abatement Cost Curve (MACC)?',
  'What are our net-profitable decarbonization levers, and how much annual OPEX can we save?',
  'If we switch our Scope 2 grid electricity to an on-site solar PPA, what is our projected cost savings per kWh and carbon abatement?',
  'What is the financial ROI of consolidating LTL freight shipments into FTL rail under the GLEC framework?',
  'What is our projected carbon emission target for next month, and what is the model confidence score?',
  'Why is our emission trajectory projected to remain stable next month despite increased business activity?',
  'Which historical activity categories from our uploaded documents form the primary baseline drivers for the forecast?',
  'If we reduce Scope 3 transport intensity by 15%, how will that bend our next quarter forecast?',
  'Compare our emissions between July and August 2026: which Scope grew the fastest and why?',
  'Which month had the highest carbon emissions in our recorded history, and what was the breakdown across Scopes 1, 2, and 3?',
  'What was our exact carbon footprint in August 2026, and what activity categories contributed to it?',
  'Are our overall emissions increasing or decreasing month-over-month, and what is our net velocity percentage?',
  'How many total activity documents have we uploaded, and what is the breakdown by processing status and file category?',
  'What does scope2_eu_renewable_rec_facility.pdf say about our market-based electricity accounting?',
  'Find the freight weight and distance values in complex_scope3_freight_bol.pdf that support our Scope 3 transport calculation.',
  'Which specific uploaded documents support our Scope 2 utility bill emissions?',
  'What is our single largest emission hotspot across all recorded scopes and categories?',
  'How much did Scope 3 Category 4 (Upstream Transportation & Distribution) contribute to our overall carbon footprint?',
  'What is our Scope 2 market-based versus location-based reporting breakdown?',
  'Which Scope contributes the highest percentage to our total footprint, and what are the top 3 reduction priorities?',
  'What exact calculation formula and emission factor was applied to our electricity bills?',
  'Which emission factor standard (IPCC AR5, DEFRA, or GLEC 2023) was used for our logistics shipments?',
  'Show me the mathematical audit trail for our Scope 1 diesel combustion calculations.',
  'What is the difference between spend-based (EEIO) and activity-based (GLEC) calculations in our Scope 3 accounting?',
];

async function runDiagnostic() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'sahil' } },
  });

  if (!user || !user.organizationId) {
    console.log('User not found!');
    await prisma.$disconnect();
    return;
  }

  const repo = new CopilotRepository(prisma, user.organizationId);
  const ingestionService = new IngestionService(repo);
  const forecastRepo = new ForecastRepository(prisma);
  const flagService = new FeatureFlagService(prisma);
  const notifService = new NotificationService(prisma);
  const forecastService = new ForecastService(forecastRepo, flagService, notifService);
  const copilotService = new CopilotService(repo, ingestionService, forecastService, flagService);

  console.log(`\n======================================================================`);
  console.log(`DIAGNOSTIC TEST RUN FOR ALL 25 COMPLEX QUESTIONS`);
  console.log(`Org: ${user.organizationId}`);
  console.log(`======================================================================\n`);

  for (let i = 0; i < complexQuestions.length; i++) {
    const q = complexQuestions[i];
    console.log(`======================================================================`);
    console.log(`[Q${i + 1}] "${q}"`);
    try {
      const res = await copilotService.executeQuery({
        organizationId: user.organizationId,
        userId: user.id,
        message: q,
      });
      console.log(`OPERATION: ${res.queryType}`);
      console.log(`CITATIONS (${res.citations.length}):`, res.citations.map((c) => (c.type === 'database' ? `${c.source} (${c.reference})` : `${c.filename} (p.${c.page})`)));
      console.log(`ANSWER:\n${res.answer.slice(0, 300)}...`);
    } catch (e: any) {
      console.log(`ERROR: ${e.message}`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

runDiagnostic().catch(console.error);
