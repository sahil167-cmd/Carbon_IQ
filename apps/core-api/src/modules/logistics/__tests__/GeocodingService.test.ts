import { GeocodingService } from '../application/GeocodingService';

describe('GeocodingService', () => {
  it('resolves curated Indian logistics hub without external network call', async () => {
    const service = new GeocodingService();
    const result = await service.geocode('Mumbai Central Warehouse');

    expect(result).not.toBeNull();
    expect(result?.city).toBe('Mumbai');
    expect(result?.state).toBe('Maharashtra');
    expect(result?.country).toBe('India');
    expect(result?.latitude).toBeCloseTo(19.0760, 2);
    expect(result?.longitude).toBeCloseTo(72.8777, 2);
    expect(result?.provider).toBe('CURATED_LOGISTICS_HUB');
  });

  it('resolves Pune industrial cluster correctly', async () => {
    const service = new GeocodingService();
    const result = await service.geocode('Pune Distribution Center');

    expect(result).not.toBeNull();
    expect(result?.city).toBe('Pune');
    expect(result?.latitude).toBeCloseTo(18.5204, 2);
    expect(result?.longitude).toBeCloseTo(73.8567, 2);
  });

  it('resolves Bhiwandi warehousing hub', async () => {
    const service = new GeocodingService();
    const result = await service.geocode('Bhiwandi Logistics Hub, Maharashtra');

    expect(result).not.toBeNull();
    expect(result?.city).toBe('Bhiwandi');
    expect(result?.latitude).toBeCloseTo(19.2967, 2);
  });

  it('throws ValidationError for empty query', async () => {
    const service = new GeocodingService();
    await expect(service.geocode('   ')).rejects.toThrow('Geocoding query cannot be empty');
  });

  it('delegates to Nominatim / external provider when query is not in curated dictionary', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: 'Custom Facility, Nashik, Maharashtra, India',
          lat: '19.9975',
          lon: '73.7898',
          address: {
            city: 'Nashik',
            state: 'Maharashtra',
            country: 'India',
          },
        },
      ],
    } as any);

    const service = new GeocodingService({ fetchFn: mockFetch as any });
    const result = await service.geocode('Unique Warehouse at Nashik');

    expect(result).not.toBeNull();
    expect(result?.city).toBe('Nashik');
    expect(result?.latitude).toBe(19.9975);
    expect(result?.longitude).toBe(73.7898);
    expect(result?.provider).toBe('NOMINATIM');
  });
});
