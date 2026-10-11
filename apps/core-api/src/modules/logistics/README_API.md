# CarbonIQ Logistics API Reference (Phase 7A)

All logistics endpoints are mounted at `/api/v1/logistics`.
Every request requires bearer token authentication: `Authorization: Bearer <JWT>`.
Multi-tenancy is enforced server-side via the authenticated user's `organizationId`.

---

## 1. Shipments

### `POST /api/v1/logistics/shipments`
Create a new shipment with optional stops.
* **Roles**: `ORG_ADMIN`, `ORG_MEMBER`
* **Request Body**:
  ```json
  {
    "shipmentNumber": "SHP-2026-001",
    "referenceNumber": "PO-98421",
    "description": "Mumbai to Pune Electronics Consignment",
    "plannedPickupDate": "2026-09-10T08:00:00.000Z",
    "plannedDeliveryDate": "2026-09-10T18:00:00.000Z",
    "stops": [
      {
        "stopSequence": 1,
        "stopType": "PICKUP",
        "facilityName": "Bhiwandi Central Hub",
        "addressLine1": "Plot 14, Warehouse Zone",
        "city": "Bhiwandi",
        "state": "Maharashtra",
        "postalCode": "421302",
        "country": "IN",
        "latitude": 19.2967,
        "longitude": 73.0628
      },
      {
        "stopSequence": 2,
        "stopType": "DROPOFF",
        "facilityName": "Pune Distribution Center",
        "addressLine1": "Hinjawadi Phase 3",
        "city": "Pune",
        "state": "Maharashtra",
        "postalCode": "411057",
        "country": "IN",
        "latitude": 18.5913,
        "longitude": 73.7389
      }
    ]
  }
  ```
* **Response**: `201 Created` with created shipment and stops.

### `GET /api/v1/logistics/shipments`
List shipments for the current organization.
* **Roles**: `ORG_ADMIN`, `ORG_MEMBER`
* **Query Params**: `status` (`DRAFT` | `SCHEDULED` | `IN_TRANSIT` | `DELIVERED` | `CANCELLED`), `page` (int), `limit` (int)
* **Response**: `200 OK` with paginated shipment list and counts.

### `GET /api/v1/logistics/shipments/:id`
Retrieve shipment details with cargo items, stops, and recent optimization runs.
* **Roles**: `ORG_ADMIN`, `ORG_MEMBER`
* **Response**: `200 OK` (or `404 Not Found` if belonging to another tenant).

### `PATCH /api/v1/logistics/shipments/:id`
Update shipment status, reference number, or dates.
* **Roles**: `ORG_ADMIN`, `ORG_MEMBER`
* **Response**: `200 OK`.

---

## 2. Cargo Items

### `GET /api/v1/logistics/shipments/:shipmentId/cargo`
List cargo items assigned to a shipment.
* **Response**: `200 OK` with array of `CargoItem` records.

### `POST /api/v1/logistics/shipments/:shipmentId/cargo`
Add a cargo item to a shipment. Automatically updates shipment's total weight and volume.
* **Request Body**:
  ```json
  {
    "description": "Lithium Battery Packs",
    "packageType": "BOX",
    "quantity": 10,
    "length": 60,
    "width": 40,
    "height": 50,
    "dimensionUnit": "CM",
    "unitWeight": 25,
    "weightUnit": "KG",
    "isStackable": true,
    "maxStackWeight": 150,
    "allowRotationHorizontal": true
  }
  ```
* **Response**: `201 Created`.

### `PATCH /api/v1/logistics/shipments/:shipmentId/cargo/:cargoId`
Update a cargo item.
* **Response**: `200 OK`.

### `DELETE /api/v1/logistics/shipments/:shipmentId/cargo/:cargoId`
Delete a cargo item. Automatically recalculates shipment's total weight and volume.
* **Response**: `200 OK`.

---

## 3. Vehicles & Fleet

### `GET /api/v1/logistics/vehicles`
List physical fleet vehicles belonging to the organization.
* **Response**: `200 OK` with array of `VehicleWithSpecification` records.

### `GET /api/v1/logistics/vehicles/:id`
Get a specific physical vehicle by ID.
* **Response**: `200 OK` (or `404 Not Found` if cross-tenant).

### `GET /api/v1/logistics/vehicle-specifications`
List accessible vehicle specifications (approved global templates + tenant custom specs).
* **Response**: `200 OK`.

---

## 4. Fleet Optimization

### `POST /api/v1/logistics/shipments/:shipmentId/optimize`
Runs multi-objective fleet allocation and 3D cargo packing for the shipment.
* **Request Body**:
  ```json
  {
    "scenarioName": "Minimum Trucks Allocation",
    "persistOptimizationRun": true,
    "options": {
      "searchEffort": "BALANCED",
      "prioritizePayloadUtilization": true
    }
  }
  ```
* **Response**: `200 OK` with `FleetOptimizationResult` and persisted `optimizationRunId`.

### `GET /api/v1/logistics/optimizations/:id`
Retrieve an existing optimization result and its vehicle `LoadPlan`s with 3D spatial placements.
* **Response**: `200 OK` with `OptimizationRun & { loadPlans: LoadPlan[] }`.

---

## 5. Routing

### `GET /api/v1/logistics/shipments/:shipmentId/route`
Calculates road route for shipment stops using OpenRouteService.
* **Query Params**: `profile` (`driving-hgv` | `driving-car`)
* **Response**: `200 OK` with `RouteResult` (distance, duration, geometry, waypoints).

### `POST /api/v1/logistics/routes/calculate`
Direct route calculation from caller-provided coordinates.
* **Request Body**:
  ```json
  {
    "origin": { "latitude": 19.2967, "longitude": 73.0628 },
    "destination": { "latitude": 18.5913, "longitude": 73.7389 },
    "profile": "driving-hgv"
  }
  ```
* **Response**: `200 OK` with `RouteResult`.

---

## 6. Traffic & ETA

### `GET /api/v1/logistics/shipments/:shipmentId/traffic-eta`
Calculates departure-aware ETA and traffic delay using the Traffic abstraction.
* **Query Params**: `departureTime` (ISO string), `profile` (`driving-hgv` | `driving-car`)
* **Response**: `200 OK` with `TrafficETAResult` (`status: "BASELINE"`, `isLive: false`, `trafficDelaySeconds: 0`, `eta`).

---

## 7. Carbon Impact

### `GET /api/v1/logistics/shipments/:shipmentId/carbon`
Calculates real GLEC Scope 3 freight emissions for the shipment's latest optimization run.
* **Query Params**: `optimizationRunId` (optional), `region` (optional)
* **Response**: `200 OK` with `LogisticsCarbonImpactResult` (per-vehicle emissions, total CO2e, factor provenance).

### `POST /api/v1/logistics/carbon/scenario`
Calculates CO2e for an arbitrary multi-vehicle logistics scenario.
* **Request Body**:
  ```json
  {
    "scenarioName": "Comparison Scenario B",
    "vehicles": [
      {
        "vehicleCategory": "ARTICULATED_40T",
        "distanceKm": 450,
        "cargoWeightKg": 20000
      }
    ]
  }
  ```
* **Response**: `200 OK` with `LogisticsCarbonImpactResult`.
