import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
import { getPrismaClient } from '../core/repository/tenant-scoped.repository';
import { CopilotService } from '../modules/copilot/copilot.service';
import { CopilotRepository } from '../modules/copilot/copilot.repository';
import { IngestionService } from '../modules/copilot/ingestion/ingestion.service';
import { ForecastService } from '../modules/forecast/forecast.service';
import { ForecastRepository } from '../modules/forecast/forecast.repository';
import { FeatureFlagService } from '../services/feature-flag.service';
import { NotificationService } from '../services/notification.service';

async function test() {
  const prisma = getPrismaClient();
  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst({ where: { organizationId: org!.id } });
  
  const repo = new CopilotRepository(prisma, org!.id);
  const ingestionService = new IngestionService(repo);
  const forecastRepo = new ForecastRepository(prisma);
  const flagService = new FeatureFlagService(prisma);
  const notifService = new NotificationService(prisma);
  const forecastService = new ForecastService(forecastRepo, flagService, notifService);
  const copilotService = new CopilotService(repo, ingestionService, forecastService, flagService);

  console.log('Testing copilot query...');
  try {
    const res = await copilotService.executeQuery({
      organizationId: org!.id,
      userId: user!.id,
      message: 'Which emission scope and category is contributing the most to our footprint?'
    });
    console.log('Query Success:', res);
  } catch (err: any) {
    console.error('ERROR in executeQuery:', err);
  }
  await prisma.$disconnect();
}
test().catch(console.error);
