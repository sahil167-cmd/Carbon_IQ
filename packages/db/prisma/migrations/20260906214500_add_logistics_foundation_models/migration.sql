-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'PLANNED', 'OPTIMIZED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('PICKUP', 'DROPOFF', 'TRANSIT_WAYPOINT');

-- CreateEnum
CREATE TYPE "DimensionUnit" AS ENUM ('CM', 'M', 'MM', 'INCH');

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'TONNE', 'G', 'LBS');

-- CreateEnum
CREATE TYPE "VolumeUnit" AS ENUM ('M3', 'CM3', 'LITER', 'CFT');

-- CreateEnum
CREATE TYPE "OptimizationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VehicleBodyType" AS ENUM ('BOX_TRUCK', 'CURTAIN_SIDE', 'FLATBED', 'REFRIGERATED', 'CONTAINER_CARRIER', 'TANKER', 'OPEN_BODY');

-- CreateEnum
CREATE TYPE "VehicleFuelType" AS ENUM ('DIESEL', 'PETROL', 'CNG', 'LNG', 'ELECTRIC', 'HYBRID', 'BIO_DIESEL', 'HYDROGEN');

-- CreateTable
CREATE TABLE "vehicle_types" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "bodyType" "VehicleBodyType" NOT NULL,
    "fuelType" "VehicleFuelType" NOT NULL,
    "emissionStandard" TEXT,
    "internalLength" DECIMAL(10,2) NOT NULL,
    "internalWidth" DECIMAL(10,2) NOT NULL,
    "internalHeight" DECIMAL(10,2) NOT NULL,
    "dimensionUnit" "DimensionUnit" NOT NULL DEFAULT 'CM',
    "doorWidth" DECIMAL(10,2),
    "doorHeight" DECIMAL(10,2),
    "maxPayload" DECIMAL(12,3) NOT NULL,
    "grossVehicleWeight" DECIMAL(12,3),
    "tareWeight" DECIMAL(12,3),
    "weightUnit" "WeightUnit" NOT NULL DEFAULT 'KG',
    "volumetricCapacity" DECIMAL(12,4),
    "volumeUnit" "VolumeUnit" NOT NULL DEFAULT 'M3',
    "axleCount" INTEGER,
    "axleConfiguration" TEXT,
    "maxAxleWeightFront" DECIMAL(10,3),
    "maxAxleWeightRear" DECIMAL(10,3),
    "isRefrigerated" BOOLEAN NOT NULL DEFAULT false,
    "temperatureMin" DECIMAL(5,2),
    "temperatureMax" DECIMAL(5,2),
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "fleetNumber" TEXT,
    "homeSiteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "yearOfManufacture" INTEGER,
    "currentOdometerKm" DECIMAL(12,2),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "referenceNumber" TEXT,
    "description" TEXT,
    "totalWeight" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "weightUnit" "WeightUnit" NOT NULL DEFAULT 'KG',
    "totalVolume" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "volumeUnit" "VolumeUnit" NOT NULL DEFAULT 'M3',
    "totalItemsCount" INTEGER NOT NULL DEFAULT 0,
    "plannedPickupDate" TIMESTAMP(3),
    "plannedDeliveryDate" TIMESTAMP(3),
    "actualPickupDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_stops" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "stopSequence" INTEGER NOT NULL,
    "stopType" "StopType" NOT NULL DEFAULT 'PICKUP',
    "siteId" TEXT,
    "facilityName" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "timeWindowStart" TIMESTAMP(3),
    "timeWindowEnd" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "actualDeparture" TIMESTAMP(3),
    "specialInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "packageType" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "length" DECIMAL(10,2) NOT NULL,
    "width" DECIMAL(10,2) NOT NULL,
    "height" DECIMAL(10,2) NOT NULL,
    "dimensionUnit" "DimensionUnit" NOT NULL DEFAULT 'CM',
    "unitWeight" DECIMAL(10,3) NOT NULL,
    "totalWeight" DECIMAL(12,3) NOT NULL,
    "weightUnit" "WeightUnit" NOT NULL DEFAULT 'KG',
    "unitVolume" DECIMAL(10,4),
    "totalVolume" DECIMAL(12,4),
    "volumeUnit" "VolumeUnit" NOT NULL DEFAULT 'M3',
    "isStackable" BOOLEAN NOT NULL DEFAULT true,
    "maxStackWeight" DECIMAL(10,2),
    "maxStackTiers" INTEGER,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "allowRotationHorizontal" BOOLEAN NOT NULL DEFAULT true,
    "allowRotationVertical" BOOLEAN NOT NULL DEFAULT false,
    "allowedOrientations" TEXT[] DEFAULT ARRAY['DEFAULT']::TEXT[],
    "loadingPriority" INTEGER NOT NULL DEFAULT 1,
    "unloadingSequence" INTEGER NOT NULL DEFAULT 1,
    "pickupStopId" TEXT,
    "dropoffStopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimization_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "scenarioName" TEXT NOT NULL DEFAULT 'Scenario 1',
    "runNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "OptimizationStatus" NOT NULL DEFAULT 'PENDING',
    "algorithmVersion" TEXT NOT NULL DEFAULT 'v1-3d-binpack',
    "parametersJson" JSONB,
    "baselineTruckCount" INTEGER,
    "optimizedTruckCount" INTEGER,
    "baselineDistanceKm" DECIMAL(10,2),
    "optimizedDistanceKm" DECIMAL(10,2),
    "baselineDurationMins" DECIMAL(10,2),
    "optimizedDurationMins" DECIMAL(10,2),
    "totalLoadedWeightKg" DECIMAL(12,3),
    "totalLoadedVolumeM3" DECIMAL(12,4),
    "overallVolumeUtilizationPct" DECIMAL(5,2),
    "overallWeightUtilizationPct" DECIMAL(5,2),
    "unassignedItemsCount" INTEGER DEFAULT 0,
    "violationsCount" INTEGER DEFAULT 0,
    "violationsJson" JSONB,
    "executionTimeMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optimization_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_plans" (
    "id" TEXT NOT NULL,
    "optimizationRunId" TEXT NOT NULL,
    "vehicleSequence" INTEGER NOT NULL DEFAULT 1,
    "vehicleTypeId" TEXT,
    "vehicleId" TEXT,
    "loadedWeightKg" DECIMAL(12,3) NOT NULL,
    "loadedVolumeM3" DECIMAL(12,4) NOT NULL,
    "weightUtilizationPct" DECIMAL(5,2) NOT NULL,
    "volumeUtilizationPct" DECIMAL(5,2) NOT NULL,
    "centerOfGravityX" DECIMAL(6,2),
    "centerOfGravityY" DECIMAL(6,2),
    "centerOfGravityZ" DECIMAL(6,2),
    "axleLoadFrontKg" DECIMAL(10,2),
    "axleLoadRearKg" DECIMAL(10,2),
    "placementsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "load_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_plans" (
    "id" TEXT NOT NULL,
    "loadPlanId" TEXT NOT NULL,
    "routingProvider" TEXT,
    "distanceKm" DECIMAL(10,2) NOT NULL,
    "durationMinutes" DECIMAL(10,2) NOT NULL,
    "encodedPolyline" TEXT,
    "routeGeometryJson" JSONB,
    "tollRoadsIncluded" BOOLEAN DEFAULT false,
    "fuelEstimateLiters" DECIMAL(10,2),
    "calculatedEmissionsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_types_organizationId_idx" ON "vehicle_types"("organizationId");

-- CreateIndex
CREATE INDEX "vehicle_types_bodyType_idx" ON "vehicle_types"("bodyType");

-- CreateIndex
CREATE INDEX "vehicle_types_fuelType_idx" ON "vehicle_types"("fuelType");

-- CreateIndex
CREATE INDEX "vehicles_organizationId_status_idx" ON "vehicles"("organizationId", "status");

-- CreateIndex
CREATE INDEX "vehicles_vehicleTypeId_idx" ON "vehicles"("vehicleTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_organizationId_registrationNumber_key" ON "vehicles"("organizationId", "registrationNumber");

-- CreateIndex
CREATE INDEX "shipments_organizationId_status_idx" ON "shipments"("organizationId", "status");

-- CreateIndex
CREATE INDEX "shipments_plannedPickupDate_idx" ON "shipments"("plannedPickupDate");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_organizationId_shipmentNumber_key" ON "shipments"("organizationId", "shipmentNumber");

-- CreateIndex
CREATE INDEX "shipment_stops_shipmentId_idx" ON "shipment_stops"("shipmentId");

-- CreateIndex
CREATE INDEX "shipment_stops_siteId_idx" ON "shipment_stops"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_stops_shipmentId_stopSequence_key" ON "shipment_stops"("shipmentId", "stopSequence");

-- CreateIndex
CREATE INDEX "cargo_items_shipmentId_idx" ON "cargo_items"("shipmentId");

-- CreateIndex
CREATE INDEX "cargo_items_organizationId_idx" ON "cargo_items"("organizationId");

-- CreateIndex
CREATE INDEX "cargo_items_pickupStopId_idx" ON "cargo_items"("pickupStopId");

-- CreateIndex
CREATE INDEX "cargo_items_dropoffStopId_idx" ON "cargo_items"("dropoffStopId");

-- CreateIndex
CREATE INDEX "optimization_runs_organizationId_idx" ON "optimization_runs"("organizationId");

-- CreateIndex
CREATE INDEX "optimization_runs_shipmentId_status_idx" ON "optimization_runs"("shipmentId", "status");

-- CreateIndex
CREATE INDEX "load_plans_optimizationRunId_idx" ON "load_plans"("optimizationRunId");

-- CreateIndex
CREATE INDEX "load_plans_vehicleTypeId_idx" ON "load_plans"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "load_plans_vehicleId_idx" ON "load_plans"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "route_plans_loadPlanId_key" ON "route_plans"("loadPlanId");

-- CreateIndex
CREATE INDEX "route_plans_loadPlanId_idx" ON "route_plans"("loadPlanId");

-- CreateIndex
CREATE INDEX "route_plans_calculatedEmissionsId_idx" ON "route_plans"("calculatedEmissionsId");

-- AddForeignKey
ALTER TABLE "vehicle_types" ADD CONSTRAINT "vehicle_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_homeSiteId_fkey" FOREIGN KEY ("homeSiteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_stops" ADD CONSTRAINT "shipment_stops_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_stops" ADD CONSTRAINT "shipment_stops_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_pickupStopId_fkey" FOREIGN KEY ("pickupStopId") REFERENCES "shipment_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_dropoffStopId_fkey" FOREIGN KEY ("dropoffStopId") REFERENCES "shipment_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_plans" ADD CONSTRAINT "load_plans_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES "optimization_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_plans" ADD CONSTRAINT "load_plans_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_plans" ADD CONSTRAINT "load_plans_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_loadPlanId_fkey" FOREIGN KEY ("loadPlanId") REFERENCES "load_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_calculatedEmissionsId_fkey" FOREIGN KEY ("calculatedEmissionsId") REFERENCES "calculated_emissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
