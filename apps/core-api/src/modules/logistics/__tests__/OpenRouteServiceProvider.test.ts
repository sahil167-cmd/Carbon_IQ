import { OpenRouteServiceProvider } from '../infrastructure/routing/OpenRouteServiceProvider';
import { RouteRequest, RoutingError } from '../domain/routing/types';

describe('Phase 4 — OpenRouteServiceProvider', () => {
  const dummyApiKey = 'test-ors-api-key-xyz-12345';

  // Sample synthetic coordinates
  const coordA = { latitude: 19.076, longitude: 72.8777 }; // Point A
  const coordB = { latitude: 18.5204, longitude: 73.8567 }; // Point B
  const coordC = { latitude: 19.9975, longitude: 73.7898 }; // Point C

  // Standard synthetic ORS single-leg response fixture
  const singleLegOrsResponse = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          summary: {
            distance: 148250.6,
            duration: 11420.2,
          },
          segments: [
            {
              distance: 148250.6,
              duration: 11420.2,
              steps: [
                {
                  distance: 520.0,
                  duration: 60.0,
                  type: 11,
                  instruction: 'Head north on Main St',
                  name: 'Main St',
                },
                {
                  distance: 147730.6,
                  duration: 11360.2,
                  type: 1,
                  instruction: 'Continue onto Highway 48',
                  name: 'Highway 48',
                },
              ],
            },
          ],
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [72.8777, 19.076],
            [73.1234, 18.891],
            [73.8567, 18.5204],
          ],
        },
      },
    ],
  };

  // Standard synthetic ORS multi-leg response fixture
  const multiLegOrsResponse = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          summary: {
            distance: 310500.0,
            duration: 24000.0,
          },
          segments: [
            {
              distance: 148250.0,
              duration: 11420.0,
              steps: [{ distance: 148250.0, duration: 11420.0, instruction: 'Leg 1' }],
            },
            {
              distance: 162250.0,
              duration: 12580.0,
              steps: [{ distance: 162250.0, duration: 12580.0, instruction: 'Leg 2' }],
            },
          ],
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [72.8777, 19.076],
            [73.8567, 18.5204],
            [73.7898, 19.9975],
          ],
        },
      },
    ],
  };

  // ===========================================================================
  // TEST 1: Valid coordinate validation
  // ===========================================================================
  it('TEST 1: Valid coordinate validation', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => singleLegOrsResponse,
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const request: RouteRequest = {
      origin: coordA,
      destination: coordB,
    };

    const result = await provider.route(request);
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify coordinates sent to ORS are formatted as [longitude, latitude]
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.coordinates).toEqual([
      [coordA.longitude, coordA.latitude],
      [coordB.longitude, coordB.latitude],
    ]);
  });

  // ===========================================================================
  // TEST 2: Invalid latitude is rejected with INVALID_COORDINATE
  // ===========================================================================
  it('TEST 2: Invalid latitude is rejected with INVALID_COORDINATE', async () => {
    const provider = new OpenRouteServiceProvider({ apiKey: dummyApiKey });

    const request: RouteRequest = {
      origin: { latitude: 95.0, longitude: 72.8777 }, // Invalid > 90
      destination: coordB,
    };

    await expect(provider.route(request)).rejects.toThrow(RoutingError);
    await expect(provider.route(request)).rejects.toMatchObject({
      routingCode: 'INVALID_COORDINATE',
      statusCode: 400,
    });
  });

  // ===========================================================================
  // TEST 3: Invalid longitude is rejected with INVALID_COORDINATE
  // ===========================================================================
  it('TEST 3: Invalid longitude is rejected with INVALID_COORDINATE', async () => {
    const provider = new OpenRouteServiceProvider({ apiKey: dummyApiKey });

    const request: RouteRequest = {
      origin: coordA,
      destination: { latitude: 18.5204, longitude: -185.0 }, // Invalid < -180
    };

    await expect(provider.route(request)).rejects.toThrow(RoutingError);
    await expect(provider.route(request)).rejects.toMatchObject({
      routingCode: 'INVALID_COORDINATE',
      statusCode: 400,
    });
  });

  // ===========================================================================
  // TEST 4: Missing origin coordinate is rejected with MISSING_COORDINATE
  // ===========================================================================
  it('TEST 4: Missing origin coordinate is rejected with MISSING_COORDINATE', async () => {
    const provider = new OpenRouteServiceProvider({ apiKey: dummyApiKey });

    const request = {
      origin: null as any,
      destination: coordB,
    };

    await expect(provider.route(request)).rejects.toMatchObject({
      routingCode: 'MISSING_COORDINATE',
      statusCode: 400,
    });
  });

  // ===========================================================================
  // TEST 5: Missing destination coordinate is rejected with MISSING_COORDINATE
  // ===========================================================================
  it('TEST 5: Missing destination coordinate is rejected with MISSING_COORDINATE', async () => {
    const provider = new OpenRouteServiceProvider({ apiKey: dummyApiKey });

    const request = {
      origin: coordA,
      destination: { latitude: 18.52 } as any, // Missing longitude
    };

    await expect(provider.route(request)).rejects.toMatchObject({
      routingCode: 'MISSING_COORDINATE',
      statusCode: 400,
    });
  });

  // ===========================================================================
  // TEST 6: Single-leg route normalization
  // ===========================================================================
  it('TEST 6: Single-leg route normalization', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => singleLegOrsResponse,
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const result = await provider.route({ origin: coordA, destination: coordB });

    expect(result.success).toBe(true);
    expect(result.legs).toHaveLength(1);
    expect(result.legs[0].origin).toEqual(coordA);
    expect(result.legs[0].destination).toEqual(coordB);
    expect(result.legs[0].distanceMeters).toBe(148251);
    expect(result.legs[0].durationSeconds).toBe(11420);
    expect(result.legs[0].segments).toBeDefined();
    expect(result.legs[0].segments![0].steps).toHaveLength(2);
  });

  // ===========================================================================
  // TEST 7: Multi-leg route normalization preserves waypoints and leg boundaries
  // ===========================================================================
  it('TEST 7: Multi-leg route normalization preserves waypoints and leg boundaries', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => multiLegOrsResponse,
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const result = await provider.route({
      origin: coordA,
      destination: coordC,
      waypoints: [coordB],
    });

    expect(result.success).toBe(true);
    expect(result.legs).toHaveLength(2);

    // Leg 1: A -> B
    expect(result.legs[0].origin).toEqual(coordA);
    expect(result.legs[0].destination).toEqual(coordB);
    expect(result.legs[0].distanceMeters).toBe(148250);
    expect(result.legs[0].durationSeconds).toBe(11420);

    // Leg 2: B -> C
    expect(result.legs[1].origin).toEqual(coordB);
    expect(result.legs[1].destination).toEqual(coordC);
    expect(result.legs[1].distanceMeters).toBe(162250);
    expect(result.legs[1].durationSeconds).toBe(12580);
  });

  // ===========================================================================
  // TEST 8: Distance normalization (rounded integer meters)
  // ===========================================================================
  it('TEST 8: Distance normalization', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => singleLegOrsResponse,
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const result = await provider.route({ origin: coordA, destination: coordB });
    expect(result.distanceMeters).toBe(148251); // 148250.6 rounded
    expect(Number.isInteger(result.distanceMeters)).toBe(true);
  });

  // ===========================================================================
  // TEST 9: Duration normalization (rounded integer seconds, marked as non-traffic)
  // ===========================================================================
  it('TEST 9: Duration normalization', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => singleLegOrsResponse,
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const result = await provider.route({ origin: coordA, destination: coordB });
    expect(result.durationSeconds).toBe(11420); // 11420.2 rounded
    expect(result.metadata.isTrafficAware).toBe(false); // Explicit guarantee
  });

  // ===========================================================================
  // TEST 10: Geometry normalization
  // ===========================================================================
  it('TEST 10: Geometry normalization', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => singleLegOrsResponse,
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const result = await provider.route({ origin: coordA, destination: coordB });
    expect(result.geometry.format).toBe('GEOJSON');
    expect(result.geometry.coordinates).toHaveLength(3);
    expect(result.geometry.coordinates![0]).toEqual([72.8777, 19.076]);
  });

  // ===========================================================================
  // TEST 11: ORS authentication failure (HTTP 401 / 403)
  // ===========================================================================
  it('TEST 11: ORS authentication failure maps to PROVIDER_AUTHENTICATION_ERROR', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'Invalid API key provided' } }),
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    await expect(provider.route({ origin: coordA, destination: coordB })).rejects.toMatchObject({
      routingCode: 'PROVIDER_AUTHENTICATION_ERROR',
      statusCode: 502,
    });
  });

  // ===========================================================================
  // TEST 12: ORS rate-limit response (HTTP 429)
  // ===========================================================================
  it('TEST 12: ORS rate-limit response maps to PROVIDER_RATE_LIMIT', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { message: 'Rate limit exceeded' } }),
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    await expect(provider.route({ origin: coordA, destination: coordB })).rejects.toMatchObject({
      routingCode: 'PROVIDER_RATE_LIMIT',
      statusCode: 429,
    });
  });

  // ===========================================================================
  // TEST 13: ORS timeout maps to PROVIDER_TIMEOUT
  // ===========================================================================
  it('TEST 13: ORS timeout maps to PROVIDER_TIMEOUT', async () => {
    const mockFetch = jest.fn(async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      timeoutMs: 100,
      fetchFn: mockFetch,
    });

    await expect(provider.route({ origin: coordA, destination: coordB })).rejects.toMatchObject({
      routingCode: 'PROVIDER_TIMEOUT',
      statusCode: 504,
    });
  });

  // ===========================================================================
  // TEST 14: ORS unavailable / server error maps to PROVIDER_UNAVAILABLE
  // ===========================================================================
  it('TEST 14: ORS unavailable / server error maps to PROVIDER_UNAVAILABLE', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    await expect(provider.route({ origin: coordA, destination: coordB })).rejects.toMatchObject({
      routingCode: 'PROVIDER_UNAVAILABLE',
      statusCode: 502,
    });
  });

  // ===========================================================================
  // TEST 15: Malformed ORS response maps to PROVIDER_BAD_RESPONSE
  // ===========================================================================
  it('TEST 15: Malformed ORS response maps to PROVIDER_BAD_RESPONSE', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ unexpectedKey: true }), // Missing features array
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    await expect(provider.route({ origin: coordA, destination: coordB })).rejects.toMatchObject({
      routingCode: 'PROVIDER_BAD_RESPONSE',
      statusCode: 502,
    });
  });

  // ===========================================================================
  // TEST 16: No-route response maps to NO_ROUTE_FOUND
  // ===========================================================================
  it('TEST 16: No-route response maps to NO_ROUTE_FOUND', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          error: { code: 2010, message: 'Could not find a route between points' },
        }),
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    await expect(provider.route({ origin: coordA, destination: coordB })).rejects.toMatchObject({
      routingCode: 'NO_ROUTE_FOUND',
      statusCode: 404,
    });
  });

  // ===========================================================================
  // TEST 17: Missing API key / configuration throws ROUTING_CONFIGURATION_ERROR
  // ===========================================================================
  it('TEST 17: Missing API key throws ROUTING_CONFIGURATION_ERROR', async () => {
    const provider = new OpenRouteServiceProvider({ apiKey: '' });

    await expect(provider.route({ origin: coordA, destination: coordB })).rejects.toMatchObject({
      routingCode: 'ROUTING_CONFIGURATION_ERROR',
      statusCode: 500,
    });
  });

  // ===========================================================================
  // TEST 18: No straight-line / fake route fallback on failure
  // ===========================================================================
  it('TEST 18: No straight-line / fake route fallback on failure', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    // Must NOT catch error and synthesize a Haversine distance! Must strictly rethrow error!
    await expect(provider.route({ origin: coordA, destination: coordB })).rejects.toThrow(RoutingError);
  });

  // ===========================================================================
  // TEST 19: Vehicle profile is passed only where actually supported
  // ===========================================================================
  it('TEST 19: Vehicle profile is passed only where actually supported', async () => {
    let capturedBody: any = null;

    const mockFetch = jest.fn(async (url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => singleLegOrsResponse,
      };
    }) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const result = await provider.route({
      origin: coordA,
      destination: coordB,
      vehicleProfile: {
        category: 'HEAVY_GOODS',
        lengthMeters: 12.0,
        widthMeters: 2.5,
        heightMeters: 3.8,
        weightTonnes: 25.0,
        axleLoadTonnes: 10.0,
        isHazardous: true,
      },
    });

    expect(result.success).toBe(true);
    expect(capturedBody.options?.vehicle_type).toBe('hgv');
    expect(capturedBody.options?.profile_params?.restrictions).toBeDefined();
    expect(capturedBody.options.profile_params.restrictions.length).toBe(12.0);
    expect(capturedBody.options.profile_params.restrictions.width).toBe(2.5);
    expect(capturedBody.options.profile_params.restrictions.height).toBe(3.8);
    expect(capturedBody.options.profile_params.restrictions.weight).toBe(25.0);
    expect(capturedBody.options.profile_params.restrictions.axleload).toBe(10.0);
    expect(capturedBody.options.profile_params.restrictions.hazmat).toBe(true);

    expect(result.metadata.appliedVehicleConstraints?.lengthMeters).toBe(12.0);
    expect(result.metadata.appliedVehicleConstraints?.weightTonnes).toBe(25.0);
    expect(result.metadata.appliedVehicleConstraints?.hazmat).toBe(true);
  });

  // ===========================================================================
  // TEST 20: Deterministic normalization of identical provider responses
  // ===========================================================================
  it('TEST 20: Deterministic normalization of identical provider responses', async () => {
    const mockFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => singleLegOrsResponse,
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const res1 = await provider.route({ origin: coordA, destination: coordB });
    const res2 = await provider.route({ origin: coordA, destination: coordB });

    expect(res1.distanceMeters).toBe(res2.distanceMeters);
    expect(res1.durationSeconds).toBe(res2.durationSeconds);
    expect(res1.geometry).toEqual(res2.geometry);
    expect(res1.legs).toEqual(res2.legs);
  });

  // ===========================================================================
  // TEST 21: Secret/API key is never included in thrown user-facing errors
  // ===========================================================================
  it('TEST 21: Secret/API key is never included in thrown user-facing errors', async () => {
    const secretKey = 'secret-key-that-must-never-leak';

    const mockFetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => `Unauthorized request for key=${secretKey}`,
    })) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: secretKey,
      fetchFn: mockFetch,
    });

    try {
      await provider.route({ origin: coordA, destination: coordB });
      fail('Expected provider.route to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(RoutingError);
      expect(err.message).not.toContain(secretKey);
      expect(JSON.stringify(err)).not.toContain(secretKey);
    }
  });

  // ===========================================================================
  // TEST 22: Current api.heigit.org default host & exact final Directions URL path
  // ===========================================================================
  it('TEST 22: Current api.heigit.org default host and exact final Directions URL path', async () => {
    let capturedUrl = '';

    const mockFetch = jest.fn(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => singleLegOrsResponse,
      };
    }) as any;

    // Default configuration (no baseUrl passed)
    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    // Verify endpoint URL getter directly
    expect(provider.getEndpointUrl('driving-hgv')).toBe(
      'https://api.heigit.org/openrouteservice/v2/directions/driving-hgv/geojson',
    );
    expect(provider.getEndpointUrl('driving-car')).toBe(
      'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson',
    );

    await provider.route({ origin: coordA, destination: coordB });

    // Assert exact final URL constructed for the HTTP call
    expect(capturedUrl).toBe(
      'https://api.heigit.org/openrouteservice/v2/directions/driving-hgv/geojson',
    );
  });

  // ===========================================================================
  // TEST 23: Each supported HGV restriction is sent with exact field name and unit
  // ===========================================================================
  it('TEST 23: Each supported HGV restriction is sent with exact field name and unit', async () => {
    let capturedBody: any = null;

    const mockFetch = jest.fn(async (url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => singleLegOrsResponse,
      };
    }) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    await provider.route({
      origin: coordA,
      destination: coordB,
      vehicleProfile: {
        category: 'HEAVY_GOODS',
        lengthMeters: 14.5,
        widthMeters: 2.6,
        heightMeters: 4.1,
        weightTonnes: 32.0,
        axleLoadTonnes: 11.5,
        isHazardous: true,
      },
    });

    expect(capturedBody.options.vehicle_type).toBe('hgv');
    const restrictions = capturedBody.options.profile_params.restrictions;
    expect(restrictions.length).toBe(14.5);   // meters
    expect(restrictions.width).toBe(2.6);     // meters
    expect(restrictions.height).toBe(4.1);    // meters
    expect(restrictions.weight).toBe(32.0);   // metric tonnes
    expect(restrictions.axleload).toBe(11.5); // metric tonnes
    expect(restrictions.hazmat).toBe(true);   // boolean
  });

  // ===========================================================================
  // TEST 24: Unit normalization accurately converts mm to m, kg/grams to tonnes
  // ===========================================================================
  it('TEST 24: Unit normalization accurately converts mm to m, kg/grams to tonnes', async () => {
    let capturedBody: any = null;

    const mockFetch = jest.fn(async (url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => singleLegOrsResponse,
      };
    }) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    // Provide values in millimeters and kilograms/grams
    await provider.route({
      origin: coordA,
      destination: coordB,
      vehicleProfile: {
        lengthMm: 12000,       // 12m
        widthMm: 2500,         // 2.5m
        heightMm: 3800,        // 3.8m
        weightKg: 24000,       // 24t
        axleLoadKg: 9500,      // 9.5t
      },
    });

    const restrictions = capturedBody.options.profile_params.restrictions;
    expect(restrictions.length).toBe(12.0);
    expect(restrictions.width).toBe(2.5);
    expect(restrictions.height).toBe(3.8);
    expect(restrictions.weight).toBe(24.0);
    expect(restrictions.axleload).toBe(9.5);
  });

  // ===========================================================================
  // TEST 25: No false claim that unsupported constraints were enforced under driving-car
  // ===========================================================================
  it('TEST 25: No false claim that unsupported constraints were enforced under driving-car', async () => {
    let capturedBody: any = null;

    const mockFetch = jest.fn(async (url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => singleLegOrsResponse,
      };
    }) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    const result = await provider.route({
      origin: coordA,
      destination: coordB,
      vehicleProfile: {
        profile: 'driving-car',
        lengthMeters: 5.0,
        weightTonnes: 2.0,
        isHazardous: true,
      },
    });

    expect(result.success).toBe(true);
    // Under driving-car, ORS does not support restrictions: options.profile_params must NOT be sent
    expect(capturedBody.options?.profile_params).toBeUndefined();

    // Result metadata must explicitly list unsupported constraints and NOT claim enforcement
    expect(result.metadata.appliedVehicleConstraints).toBeUndefined();
    expect(result.metadata.unsupportedVehicleConstraints).toContain(
      'length_restriction_unsupported_for_car_profile',
    );
    expect(result.metadata.unsupportedVehicleConstraints).toContain(
      'weight_restriction_unsupported_for_car_profile',
    );
    expect(result.metadata.unsupportedVehicleConstraints).toContain(
      'hazmat_restriction_unsupported_for_car_profile',
    );
  });

  // ===========================================================================
  // TEST 26: Authorization header contains API key only and is never logged/printed
  // ===========================================================================
  it('TEST 26: Authorization header contains API key only and URL contains no credentials', async () => {
    let capturedHeaders: any = null;
    let capturedUrl = '';

    const mockFetch = jest.fn(async (url: string, init: any) => {
      capturedUrl = url;
      capturedHeaders = init.headers;
      return {
        ok: true,
        status: 200,
        json: async () => singleLegOrsResponse,
      };
    }) as any;

    const provider = new OpenRouteServiceProvider({
      apiKey: dummyApiKey,
      fetchFn: mockFetch,
    });

    await provider.route({ origin: coordA, destination: coordB });

    expect(capturedHeaders.Authorization).toBe(dummyApiKey);
    // URL must NOT contain api_key in query string
    expect(capturedUrl).not.toContain('api_key');
    expect(capturedUrl).not.toContain(dummyApiKey);
  });
});
