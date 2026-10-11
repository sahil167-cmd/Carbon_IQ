import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForecastRepository } from './modules/forecast/forecast.repository';
import { ForecastService } from './modules/forecast/forecast.service';
import { FeatureFlagService } from './services/feature-flag.service';
import { NotificationService } from './services/notification.service';

async function main() {
  const prisma = new PrismaClient();
  const orgs = await prisma.organization.findMany();
  console.log('Found orgs:', orgs.map((o) => ({ id: o.id, name: o.name })));

  if (orgs.length > 0) {
    const repo = new ForecastRepository(prisma);
    const flags = new FeatureFlagService(prisma);
    const notif = new NotificationService(prisma);
    const service = new ForecastService(repo, flags, notif);

    for (const org of orgs) {
      console.log(`\nTesting forecast for Org: ${org.name} (${org.id})`);
      const forecast = await service.getForecast(org.id);
      console.log('Forecast result:', JSON.stringify(forecast, null, 2));
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
