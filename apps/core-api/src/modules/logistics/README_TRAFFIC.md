# CarbonIQ Logistics — Traffic & ETA Foundation (Phase 5)

## 1. Overview
The Traffic & ETA Module enriches road routes calculated in Phase 4 with traffic-aware duration, delay modeling, and departure-time-adjusted Estimated Time of Arrival (ETA).

### Critical Domain Separation: Routing vs Traffic
| Concern | Responsibility | Engine / Service | Primary Output |
|---|---|---|---|
| **Routing** (Phase 4) | Road path, trajectory geometry, distance | `RoutingService` / `RoutingProvider` | `RouteResult` (meters, free-flow seconds, GeoJSON) |
| **Traffic & ETA** (Phase 5) | Congestion delay, departure-based ETA | `TrafficETAService` / `TrafficProvider` | `TrafficETAResult` (traffic seconds, delay, ISO ETA) |

> **Fundamental Rule**: Normal OpenRouteService route duration is **NOT** live traffic. The system never labels base routing durations as real-time or live traffic ETA.

---

## 2. Architecture & Provider Abstraction
The module employs a provider-independent design decoupled from specific traffic data vendors:
```
RouteResult (Phase 4 Output) + Departure Time
      ↓
TrafficETAService (Application Layer — Validation & ETA Calculations)
      ↓
TrafficProvider (Domain Interface)
      ↓
[BaselineTrafficProvider | UnavailableTrafficProvider | Future Live Traffic Provider]
      ↓
TrafficAssessment (status, isLive, isPredicted, trafficDuration, delay)
      ↓
TrafficETAResult (departureTime, ETA, trafficDelay, congestionLevel)
```

---

## 3. Traffic Status Model
The system explicitly tracks the provenance and nature of traffic evaluations via `TrafficStatus`:

| Status | Meaning | `isLive` | `isPredicted` | Delay Handling |
|---|---|---|---|---|
| **`BASELINE`** | Conservative speed-profile duration from routing provider without live sensors. | `false` | `false` | `trafficDelay = 0` |
| **`LIVE`** | Real-time vehicle telemetry, road sensors, and current incident delays. | `true` | `false` | Real-time congestion delay |
| **`PREDICTED`** | Time-of-day statistical models and historical congestion patterns. | `false` | `true` | Predicted congestion delay |
| **`UNAVAILABLE`** | Traffic service unconfigured or external traffic API unreachable. | `false` | `false` | Fallback to base duration with `0` delay |
| **`ERROR`** | Upstream provider error during evaluation. | `false` | `false` | Error captured cleanly |

---

## 4. Deterministic Calculation Formulas

### Traffic Delay
$$\text{trafficDelaySeconds} = \max(0, \text{trafficDurationSeconds} - \text{baseDurationSeconds})$$
- When traffic duration is equal to or less than base duration (free-flow conditions), traffic delay is strictly `0` seconds.

### Estimated Time of Arrival (ETA)
$$\text{ETA} = \text{departureTime} + (\text{trafficDurationSeconds} \times 1000\text{ ms})$$
- Formatted as standard ISO 8601 UTC timestamp (e.g. `2026-09-06T15:30:00.000Z`).

---

## 5. Traffic Provider Implementations
Because CarbonIQ currently utilizes OpenRouteService for routing without an external commercial live-traffic sensor license (e.g. TomTom, HERE, INRIX, Google Maps Traffic), the system establishes safe, audited provider boundaries:

1. **`BaselineTrafficProvider`**:
   - Default provider.
   - Evaluates base route duration from OpenRouteService.
   - Sets `status: 'BASELINE'`, `isLive: false`, `trafficDelay: 0`.
   - Never claims live traffic.
2. **`UnavailableTrafficProvider`**:
   - Represents an explicitly disabled or unconfigured traffic subsystem.
   - Sets `status: 'UNAVAILABLE'`, `isLive: false`, `trafficDelay: 0`.

---

## 6. How Future Live Traffic Providers Can Be Added
To integrate a real-time traffic provider (e.g. TomTom Traffic Flow / Incidents, HERE Traffic, INRIX):
1. Implement the `TrafficProvider` interface:
   ```typescript
   export class TomTomTrafficProvider implements TrafficProvider {
     public readonly name = 'TomTomTraffic';
     public readonly isLiveCapable = true;
     public async assessTraffic(context: TrafficContext): Promise<TrafficAssessment> {
       // Query TomTom Flow API along route coordinates for context.departureTime
       return {
         status: 'LIVE',
         isLive: true,
         isPredicted: false,
         baseDurationSeconds: context.route.durationSeconds,
         trafficDurationSeconds: tomtomDuration,
         trafficDelaySeconds: Math.max(0, tomtomDuration - context.route.durationSeconds),
         source: 'TomTom/FlowAPI',
         congestionLevel: 'MODERATE',
       };
     }
   }
   ```
2. Inject the new provider into `TrafficETAService`:
   ```typescript
   const trafficService = new TrafficETAService(prisma, organizationId, new TomTomTrafficProvider());
   ```
3. The core logistics and ETA calculation pipelines remain 100% stable without code changes.
