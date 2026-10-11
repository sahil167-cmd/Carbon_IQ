const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const { PrismaClient } = require('./node_modules/@prisma/client');
const { LogisticsCarbonImpactService } = require('./dist/modules/logistics/application/LogisticsCarbonImpactService');
const { RoutingService } = require('./dist/modules/logistics/application/RoutingService');
const { TrafficETAService } = require('./dist/modules/logistics/application/TrafficETAService');

const prisma = new PrismaClient();

async function test() {
  const orgId = 'cmssknvps000119nwrhreznyy';
  const shipmentId = 'cmtu4b6rf000c9ngxx9hpc8nk';
  const optId = 'cmtu4d6yo000k9ngxj84unyfj';

  console.log('--- Testing Route ---');
  try {
    const routingService = new RoutingService(prisma, orgId);
    const route = await routingService.calculateRouteForShipment({ shipmentId });
    console.log('Route Success! Distance:', route.distanceMeters);
  } catch (err) {
    console.error('Route Error:', err.message, err.stack);
  }

  console.log('--- Testing Traffic ETA ---');
  try {
    const trafficService = new TrafficETAService(prisma, orgId);
    const eta = await trafficService.calculateShipmentETA({ shipmentId });
    console.log('ETA Success!', eta);
  } catch (err) {
    console.error('Traffic ETA Error:', err.message);
  }

  console.log('--- Testing Carbon ---');
  try {
    const carbonService = new LogisticsCarbonImpactService(prisma);
    const carbon = await carbonService.calculateShipmentCarbon(shipmentId, orgId, {
      optimizationRunId: optId,
    });
    console.log('Carbon Success! Total CO2e:', carbon.totalCo2e, carbon.co2eUnit, 'Distance:', carbon.totalDistanceKm, 'km');
  } catch (err) {
    console.error('Carbon Error:', err.message, err.stack);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
