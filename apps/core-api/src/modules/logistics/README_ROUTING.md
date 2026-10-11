# CarbonIQ Logistics — Routing Module (Phase 4)

## 1. Overview
The Routing Module provides a clean, provider-independent abstraction for calculating road-network trajectories, distances, and durations between logistics shipment stops.

It establishes the bridge between fleet load optimization (Phase 3B) and future route-sequencing, traffic, and carbon accounting phases:
```
Shipment & Cargo
      ↓
Truck / Fleet Optimization (Phase 3B)
      ↓
Routing Provider Layer (Phase 4 — THIS MODULE)
      ↓
Traffic & ETA Prediction (Phase 5 — FUTURE)
      ↓
Carbon Impact Engine (Phase 6 — FUTURE)
```

---

## 2. Architecture & Provider Abstraction
The routing domain is completely decoupled from mapping vendors and external HTTP APIs.

- **Domain Layer (`domain/routing/`)**:
  - `RoutingProvider`: Core provider contract exposing `route(request: RouteRequest): Promise<RouteResult>` and `getCapabilities(): RoutingCapabilities`.
  - `types.ts`: Strongly-typed definitions for `Coordinate`, `RouteRequest`, `RouteResult`, `RouteLeg`, `RouteSegment`, `RouteStep`, `VehicleRoutingProfile`, `RouteGeometry`, and `RoutingError`.
- **Infrastructure Layer (`infrastructure/routing/`)**:
  - `OpenRouteServiceProvider`: Concrete implementation connecting to the OpenRouteService (ORS) v2 Directions API.
- **Application Layer (`application/`)**:
  - `RoutingService`: Tenant-isolated application orchestrator that validates database shipment stops, coordinates, and options before invoking the configured `RoutingProvider`.

---

## 3. OpenRouteService (ORS) Implementation
The initial provider implementation uses [OpenRouteService](https://openrouteservice.org/) based on OpenStreetMap road networks.

### Environment Configuration
| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTESERVICE_API_KEY` | Yes (in production) | `""` | Authoritative API key for OpenRouteService directions endpoint. |
| `OPENROUTESERVICE_BASE_URL` | No | `https://api.heigit.org` | Base URL for ORS API (allows proxying or self-hosted ORS instances). |

### Current Public API Endpoint
- **Base Host**: `https://api.heigit.org`
- **Full Directions Path**: `/openrouteservice/v2/directions/{profile}/geojson`
- **Example Endpoint**: `https://api.heigit.org/openrouteservice/v2/directions/driving-hgv/geojson`

> **Security Rule**: API keys are strictly read from environment configuration and are NEVER committed to git, printed in structured logs, or returned in user-facing error messages.

---

## 4. Capabilities & Limitations

### Supported Capabilities
- **Road Network Calculations**: Real OpenStreetMap network distances and durations (zero straight-line or Haversine fallbacks).
- **Multi-Stop Route Routing**: Ordered stop routing with intermediate waypoints preserving exact shipment stop sequence.
- **Vehicle Profiles**: Supports commercial freight (`driving-hgv`) and light commercial/van (`driving-car`) profiles.
- **Audited HGV Physical Vehicle Constraints (`driving-hgv`)**:
  - `length`: Vehicle length in **meters** (`options.profile_params.restrictions.length`)
  - `width`: Vehicle width in **meters** (`options.profile_params.restrictions.width`)
  - `height`: Vehicle height in **meters** (`options.profile_params.restrictions.height`)
  - `weight`: Gross vehicle weight in **metric tonnes** (`options.profile_params.restrictions.weight`)
  - `axleload`: Axle load in **metric tonnes** (`options.profile_params.restrictions.axleload`)
  - `hazmat`: Hazardous material routing flag (`options.profile_params.restrictions.hazmat`)
  - `vehicle_type`: Vehicle classification required by ORS (`options.vehicle_type` e.g. `'hgv'`, `'delivery'`)
- **Toll & Highway Avoidance**: Supports avoidance flags (`avoidTolls`, `avoidHighways`).

### Explicit Limitations (Phase 4 Scope)
- **Live Traffic**: **NOT SUPPORTED**. Provider duration represents baseline free-flow / speed-profile road network travel time, NOT real-time traffic or congestion-adjusted ETA.
- **Car Profile Physical Constraints**: `driving-car` does NOT support physical dimensional/weight restrictions in ORS. When `driving-car` is selected, dimensional constraints are suppressed from the request and explicitly documented in `metadata.unsupportedVehicleConstraints`.
- **Stop Reordering / Route Sequencing**: Stop sequence is strictly preserved as defined by the shipment. Traveling Salesperson / Vehicle Routing Problem (VRP) stop reordering belongs to a future phase.
- **Geocoding**: Address-to-coordinate geocoding is not performed by this provider. Caller or database must supply valid coordinates.

---

## 5. Distinction Between Route Duration and Traffic ETA
- `RouteResult.durationSeconds` represents **provider routing duration** calculated from road classification and speed limits.
- It is accompanied by `metadata.isTrafficAware: false`.
- It must **never** be presented as live or real-time traffic ETA. Live traffic prediction and historical congestion models will be introduced in Phase 5.

---

## 6. Error Handling
All errors map into domain `RoutingError` (inheriting from `AppError`) with explicit codes:
- `INVALID_COORDINATE`: Latitude outside [-90.0, 90.0] or Longitude outside [-180.0, 180.0].
- `MISSING_COORDINATE`: Required coordinates are null or undefined.
- `INVALID_ROUTE_REQUEST`: Payload missing required fields or fewer than 2 stops provided.
- `NO_ROUTE_FOUND`: Geographic disconnection (e.g. island, terrain separation) where no road path exists.
- `PROVIDER_AUTHENTICATION_ERROR`: Invalid or expired API credentials (HTTP 401/403).
- `PROVIDER_RATE_LIMIT`: Provider quota or rate limit exceeded (HTTP 429).
- `PROVIDER_TIMEOUT`: Request exceeded bounded timeout (default: 10,000 ms).
- `PROVIDER_UNAVAILABLE`: Network failure or upstream 5xx error.
- `PROVIDER_BAD_RESPONSE`: Upstream returned malformed or unparseable JSON/GeoJSON.
- `PROVIDER_UNSUPPORTED_REQUEST`: Provider rejected parameters (HTTP 400).
- `ROUTING_CONFIGURATION_ERROR`: Missing API key when attempting a live provider request.

---

## 7. How to Add Future Routing Providers
To integrate another mapping vendor (e.g. OSRM, Google Maps, HERE, Mapbox):
1. Implement the `RoutingProvider` interface in `infrastructure/routing/`:
   ```typescript
   export class OsrmRoutingProvider implements RoutingProvider {
     public readonly name = 'OSRM';
     public readonly version = 'v5';
     public async route(request: RouteRequest): Promise<RouteResult> { ... }
     public getCapabilities(): RoutingCapabilities { ... }
   }
   ```
2. Inject the new provider into `RoutingService`:
   ```typescript
   const routingService = new RoutingService(prisma, organizationId, new OsrmRoutingProvider());
   ```
3. The core domain and application orchestration remain 100% untouched.
