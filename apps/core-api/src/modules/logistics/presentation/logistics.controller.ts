import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { successResponse, paginatedResponse } from '../../../utils/response.util';
import { UnauthorizedError } from '../../../core/errors/app.error';
import {
  CreateShipmentBody,
  UpdateShipmentBody,
  CreateCargoItemBody,
  UpdateCargoItemBody,
  OptimizeShipmentBody,
  CalculateDirectRouteBody,
  ScenarioCarbonBody,
} from './logistics.validator';
import { ShipmentService } from '../application/ShipmentService';
import { VehicleMasterService } from '../application/VehicleMasterService';
import { FleetOptimizationService } from '../application/FleetOptimizationService';
import { RoutingService } from '../application/RoutingService';
import { TrafficETAService } from '../application/TrafficETAService';
import { LogisticsCarbonImpactService } from '../application/LogisticsCarbonImpactService';
import { ScenarioComparisonService } from '../application/ScenarioComparisonService';
import { GeocodingService } from '../application/GeocodingService';
import { LogisticsRepository } from '../infrastructure/logistics.repository';

function getTenantOrgId(req: Request): string {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    throw new UnauthorizedError('Organization context is required for logistics operations');
  }
  return orgId;
}

export class LogisticsController {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Shipment Handlers ─────────────────────────────────────────────────────

  createShipment = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const userId = req.user!.id;
    const service = new ShipmentService(this.prisma, orgId);

    const shipment = await service.createShipment(userId, req.body as CreateShipmentBody);
    res.status(201).json(successResponse(shipment, { requestId: req.requestId }));
  };

  listShipments = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ShipmentService(this.prisma, orgId);

    const { status, page, limit } = req.query as any;
    const result = await service.listShipments({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json(paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
      req.requestId,
    ));
  };

  getShipment = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ShipmentService(this.prisma, orgId);

    const shipment = await service.getShipmentById(req.params.id);
    res.json(successResponse(shipment, { requestId: req.requestId }));
  };

  updateShipment = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ShipmentService(this.prisma, orgId);

    const updated = await service.updateShipment(req.params.id, req.body as UpdateShipmentBody);
    res.json(successResponse(updated, { requestId: req.requestId }));
  };

  // ── Cargo Handlers ────────────────────────────────────────────────────────

  listCargo = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ShipmentService(this.prisma, orgId);

    const cargo = await service.listCargoItems(req.params.shipmentId);
    res.json(successResponse(cargo, { requestId: req.requestId }));
  };

  addCargo = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ShipmentService(this.prisma, orgId);

    const cargo = await service.addCargoItem(req.params.shipmentId, req.body as CreateCargoItemBody);
    res.status(201).json(successResponse(cargo, { requestId: req.requestId }));
  };

  updateCargo = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ShipmentService(this.prisma, orgId);

    const updated = await service.updateCargoItem(
      req.params.shipmentId,
      req.params.cargoId,
      req.body as UpdateCargoItemBody,
    );
    res.json(successResponse(updated, { requestId: req.requestId }));
  };

  deleteCargo = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ShipmentService(this.prisma, orgId);

    await service.deleteCargoItem(req.params.shipmentId, req.params.cargoId);
    res.json(successResponse({ success: true, message: 'Cargo item removed' }, { requestId: req.requestId }));
  };

  // ── Vehicle & Fleet Handlers ──────────────────────────────────────────────

  listVehicles = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new VehicleMasterService(this.prisma, orgId);

    const vehicles = await service.listTenantVehicles();
    res.json(successResponse(vehicles, { requestId: req.requestId }));
  };

  getVehicle = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new VehicleMasterService(this.prisma, orgId);

    const vehicle = await service.getVehicle(req.params.id);
    res.json(successResponse(vehicle, { requestId: req.requestId }));
  };

  listVehicleSpecifications = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new VehicleMasterService(this.prisma, orgId);

    const specs = await service.listAccessibleVehicleTypes();
    res.json(successResponse(specs, { requestId: req.requestId }));
  };

  // ── Fleet Optimization Handlers ───────────────────────────────────────────

  optimizeShipment = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new FleetOptimizationService(this.prisma, orgId);

    const body = req.body as OptimizeShipmentBody;
    const result = await service.optimizeFleetForShipment({
      shipmentId: req.params.shipmentId,
      vehicleIds: body.vehicleIds,
      vehicleTypeIds: body.vehicleTypeIds,
      options: body.options,
      scenarioName: body.scenarioName,
      persistOptimizationRun: body.persistOptimizationRun ?? true,
    });

    res.json(successResponse(result, { requestId: req.requestId }));
  };

  getOptimizationResult = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const repo = new LogisticsRepository(this.prisma, orgId);

    const run = await repo.findOptimizationRunById(req.params.id);
    res.json(successResponse(run, { requestId: req.requestId }));
  };

  // ── Route Handlers ────────────────────────────────────────────────────────

  getShipmentRoute = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new RoutingService(this.prisma, orgId);

    const profile = req.query.profile as any;
    const route = await service.calculateRouteForShipment({
      shipmentId: req.params.shipmentId,
      vehicleProfile: profile ? { profile } : undefined,
    });

    res.json(successResponse(route, { requestId: req.requestId }));
  };

  calculateDirectRoute = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new RoutingService(this.prisma, orgId);

    const body = req.body as CalculateDirectRouteBody;
    const route = await service.calculateRoute({
      origin: body.origin,
      destination: body.destination,
      waypoints: body.waypoints,
      vehicleProfile: body.profile ? { profile: body.profile } : undefined,
    });

    res.json(successResponse(route, { requestId: req.requestId }));
  };

  // ── Traffic / ETA Handlers ────────────────────────────────────────────────

  getShipmentTrafficETA = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new TrafficETAService(this.prisma, orgId);

    const departureTime = req.query.departureTime as string;
    const profile = req.query.profile as any;

    const etaResult = await service.calculateShipmentETA({
      shipmentId: req.params.shipmentId,
      departureTime: departureTime ? new Date(departureTime) : undefined,
      vehicleProfile: profile ? { profile } : undefined,
    });

    res.json(successResponse(etaResult, { requestId: req.requestId }));
  };

  // ── Carbon Impact Handlers ────────────────────────────────────────────────

  getShipmentCarbon = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new LogisticsCarbonImpactService(this.prisma);

    const optimizationRunId = req.query.optimizationRunId as string;
    const region = req.query.region as string;
    const distanceKm = req.query.distanceKm ? Number(req.query.distanceKm) : undefined;

    const carbonResult = await service.calculateShipmentCarbon(
      req.params.shipmentId,
      orgId,
      {
        optimizationRunId,
        region,
        distanceKm,
      },
    );

    res.json(successResponse(carbonResult, { requestId: req.requestId }));
  };

  calculateScenarioCarbon = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new LogisticsCarbonImpactService(this.prisma);

    const body = req.body as ScenarioCarbonBody;
    const carbonResult = await service.calculateScenarioCarbon({
      organizationId: orgId,
      shipmentId: (req.body as any).shipmentId || `SCENARIO-${Date.now().toString(36)}`,
      scenarioName: body.scenarioName,
      region: body.region,
      activityDate: body.activityDate ? new Date(body.activityDate) : undefined,
      vehicles: body.vehicles,
    });

    res.json(successResponse(carbonResult, { requestId: req.requestId }));
  };

  // ── Scenario Comparison Handlers ──────────────────────────────────────────

  listShipmentScenarios = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ScenarioComparisonService(this.prisma, orgId);

    const scenarios = await service.listScenariosForShipment(req.params.shipmentId);
    res.json(successResponse(scenarios, { requestId: req.requestId }));
  };

  createShipmentScenario = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ScenarioComparisonService(this.prisma, orgId);

    const scenario = await service.executeScenario(req.params.shipmentId, req.body as any);
    res.status(201).json(successResponse(scenario, { requestId: req.requestId }));
  };

  compareShipmentScenarios = async (req: Request, res: Response): Promise<void> => {
    const orgId = getTenantOrgId(req);
    const service = new ScenarioComparisonService(this.prisma, orgId);

    const comparison = await service.compareScenarios(req.params.shipmentId, req.body as any);
    res.json(successResponse(comparison, { requestId: req.requestId }));
  };

  // ── Geocoding Handlers ───────────────────────────────────────────────────

  geocode = async (req: Request, res: Response): Promise<void> => {
    const query = String(req.query.q || req.query.query || '').trim();
    if (!query) {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }
    const service = new GeocodingService();
    // Return multiple candidates so the frontend can show a picker
    const candidates = await service.geocodeCandidates(query);
    res.json(successResponse({ candidates }, { requestId: req.requestId }));
  };
}
