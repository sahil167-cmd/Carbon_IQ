import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { getPrismaClient } from '../../../core/repository/tenant-scoped.repository';
import { authenticate } from '../../../core/middleware/authenticate.middleware';
import { authorize } from '../../../core/middleware/authorize.middleware';
import { validate } from '../../../core/middleware/validate.middleware';
import { asyncHandler } from '../../../utils/async-handler.util';
import { LogisticsController } from './logistics.controller';
import {
  createShipmentSchema,
  updateShipmentSchema,
  createCargoItemSchema,
  updateCargoItemSchema,
  optimizeShipmentSchema,
  calculateDirectRouteSchema,
  scenarioCarbonSchema,
  createScenarioSchema,
  compareScenariosSchema,
} from './logistics.validator';

const prisma = getPrismaClient();
const controller = new LogisticsController(prisma);

const router = Router();

// All logistics endpoints require authenticated tenant session
router.use(authenticate);

const standardRoles = [UserRole.ORG_ADMIN, UserRole.ORG_MEMBER];

// ── Shipment Routes ─────────────────────────────────────────────────────────
router.post(
  '/shipments',
  authorize(standardRoles),
  validate(createShipmentSchema),
  asyncHandler(controller.createShipment),
);

router.get(
  '/shipments',
  authorize(standardRoles),
  asyncHandler(controller.listShipments),
);

router.get(
  '/shipments/:id',
  authorize(standardRoles),
  asyncHandler(controller.getShipment),
);

router.patch(
  '/shipments/:id',
  authorize(standardRoles),
  validate(updateShipmentSchema),
  asyncHandler(controller.updateShipment),
);

// ── Cargo Routes ────────────────────────────────────────────────────────────
router.get(
  '/shipments/:shipmentId/cargo',
  authorize(standardRoles),
  asyncHandler(controller.listCargo),
);

router.post(
  '/shipments/:shipmentId/cargo',
  authorize(standardRoles),
  validate(createCargoItemSchema),
  asyncHandler(controller.addCargo),
);

router.patch(
  '/shipments/:shipmentId/cargo/:cargoId',
  authorize(standardRoles),
  validate(updateCargoItemSchema),
  asyncHandler(controller.updateCargo),
);

router.delete(
  '/shipments/:shipmentId/cargo/:cargoId',
  authorize(standardRoles),
  asyncHandler(controller.deleteCargo),
);

// ── Vehicle & Fleet Routes ──────────────────────────────────────────────────
router.get(
  '/vehicles',
  authorize(standardRoles),
  asyncHandler(controller.listVehicles),
);

router.get(
  '/vehicles/:id',
  authorize(standardRoles),
  asyncHandler(controller.getVehicle),
);

router.get(
  '/vehicle-specifications',
  authorize(standardRoles),
  asyncHandler(controller.listVehicleSpecifications),
);

// ── Fleet Optimization Routes ───────────────────────────────────────────────
router.post(
  '/shipments/:shipmentId/optimize',
  authorize(standardRoles),
  validate(optimizeShipmentSchema),
  asyncHandler(controller.optimizeShipment),
);

router.get(
  '/optimizations/:id',
  authorize(standardRoles),
  asyncHandler(controller.getOptimizationResult),
);

// ── Route Calculation Routes ────────────────────────────────────────────────
router.get(
  '/shipments/:shipmentId/route',
  authorize(standardRoles),
  asyncHandler(controller.getShipmentRoute),
);

router.post(
  '/routes/calculate',
  authorize(standardRoles),
  validate(calculateDirectRouteSchema),
  asyncHandler(controller.calculateDirectRoute),
);

// ── Traffic / ETA Routes ────────────────────────────────────────────────────
router.get(
  '/shipments/:shipmentId/traffic-eta',
  authorize(standardRoles),
  asyncHandler(controller.getShipmentTrafficETA),
);

// ── Carbon Impact Routes ────────────────────────────────────────────────────
router.get(
  '/shipments/:shipmentId/carbon',
  authorize(standardRoles),
  asyncHandler(controller.getShipmentCarbon),
);

router.post(
  '/carbon/scenario',
  authorize(standardRoles),
  validate(scenarioCarbonSchema),
  asyncHandler(controller.calculateScenarioCarbon),
);

// ── Scenario Comparison Routes ──────────────────────────────────────────────
router.get(
  '/shipments/:shipmentId/scenarios',
  authorize(standardRoles),
  asyncHandler(controller.listShipmentScenarios),
);

router.post(
  '/shipments/:shipmentId/scenarios',
  authorize(standardRoles),
  validate(createScenarioSchema),
  asyncHandler(controller.createShipmentScenario),
);

router.post(
  '/shipments/:shipmentId/scenarios/compare',
  authorize(standardRoles),
  validate(compareScenariosSchema),
  asyncHandler(controller.compareShipmentScenarios),
);

// ── Geocoding Route ────────────────────────────────────────────────────────
router.get(
  '/geocode',
  authorize(standardRoles),
  asyncHandler(controller.geocode),
);

export default router;
