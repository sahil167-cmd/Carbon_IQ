import { ValidationError } from '../../../core/errors/app.error';

export interface GeocodeCandidate {
  displayName: string;
  city?: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  confidence: number;
  provider: 'ORS' | 'NOMINATIM' | 'CURATED_LOGISTICS_HUB';
}

/** @deprecated Use GeocodeCandidate. Kept for backward compat. */
export interface GeocodeResult extends GeocodeCandidate {}

/**
 * Curated high-precision coordinates for primary Indian logistics hubs,
 * ports, industrial corridors, and popular transit cities.
 *
 * IMPORTANT: Keys must be EXACT lowercase city/hub names.
 * Do NOT use substring or fuzzy matching — only exact equality.
 */
const INDIAN_LOGISTICS_HUBS: Record<
  string,
  { lat: number; lng: number; city: string; state: string; label: string }
> = {
  // Maharashtra
  'mumbai central': { lat: 19.076, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', label: 'Mumbai Central Freight Hub, Maharashtra' },
  'mumbai': { lat: 19.076, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', label: 'Mumbai, Maharashtra, India' },
  'bhiwandi': { lat: 19.2967, lng: 73.0631, city: 'Bhiwandi', state: 'Maharashtra', label: 'Bhiwandi Warehousing & Distribution Hub, Maharashtra' },
  'jnpt': { lat: 18.9499, lng: 72.9511, city: 'Navi Mumbai', state: 'Maharashtra', label: 'Jawaharlal Nehru Port Trust (JNPT / Nhava Sheva), Maharashtra' },
  'nhava sheva': { lat: 18.9499, lng: 72.9511, city: 'Navi Mumbai', state: 'Maharashtra', label: 'Nhava Sheva Port Logistics Park, Maharashtra' },
  'pune': { lat: 18.5204, lng: 73.8567, city: 'Pune', state: 'Maharashtra', label: 'Pune, Maharashtra, India' },
  'lonavala': { lat: 18.7537, lng: 73.4073, city: 'Lonavala', state: 'Maharashtra', label: 'Lonavala, Maharashtra, India' },
  'chakan': { lat: 18.7606, lng: 73.8596, city: 'Chakan', state: 'Maharashtra', label: 'Chakan MIDC Automotive Logistics Park, Pune, Maharashtra' },
  'nashik': { lat: 19.9975, lng: 73.7898, city: 'Nashik', state: 'Maharashtra', label: 'Nashik, Maharashtra, India' },
  'aurangabad': { lat: 19.8762, lng: 75.3433, city: 'Aurangabad', state: 'Maharashtra', label: 'Aurangabad Industrial Freight Zone, Maharashtra' },
  'nagpur': { lat: 21.1458, lng: 79.0882, city: 'Nagpur', state: 'Maharashtra', label: 'Nagpur MIHAN Multi-Modal Hub, Maharashtra' },
  'solapur': { lat: 17.6805, lng: 75.9064, city: 'Solapur', state: 'Maharashtra', label: 'Solapur, Maharashtra, India' },
  'kolhapur': { lat: 16.705, lng: 74.2433, city: 'Kolhapur', state: 'Maharashtra', label: 'Kolhapur, Maharashtra, India' },
  // Delhi NCR
  'delhi': { lat: 28.6139, lng: 77.209, city: 'New Delhi', state: 'Delhi', label: 'New Delhi, India' },
  'new delhi': { lat: 28.6139, lng: 77.209, city: 'New Delhi', state: 'Delhi', label: 'New Delhi, India' },
  'gurugram': { lat: 28.4595, lng: 77.0266, city: 'Gurugram', state: 'Haryana', label: 'Gurugram, Haryana, India' },
  'gurgaon': { lat: 28.4595, lng: 77.0266, city: 'Gurugram', state: 'Haryana', label: 'Gurgaon (Gurugram), Haryana, India' },
  'manesar': { lat: 28.3541, lng: 76.937, city: 'Manesar', state: 'Haryana', label: 'IMT Manesar Industrial Freight Corridor, Haryana' },
  'noida': { lat: 28.5355, lng: 77.391, city: 'Noida', state: 'Uttar Pradesh', label: 'Noida, Uttar Pradesh, India' },
  'ghaziabad': { lat: 28.6692, lng: 77.4538, city: 'Ghaziabad', state: 'Uttar Pradesh', label: 'Ghaziabad, Uttar Pradesh, India' },
  // Karnataka
  'bengaluru': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka', label: 'Bengaluru, Karnataka, India' },
  'bangalore': { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka', label: 'Bangalore (Bengaluru), Karnataka, India' },
  'peenya': { lat: 13.0285, lng: 77.5197, city: 'Bengaluru', state: 'Karnataka', label: 'Peenya Industrial Logistics Hub, Bengaluru, Karnataka' },
  'mysuru': { lat: 12.2958, lng: 76.6394, city: 'Mysuru', state: 'Karnataka', label: 'Mysuru, Karnataka, India' },
  'mysore': { lat: 12.2958, lng: 76.6394, city: 'Mysuru', state: 'Karnataka', label: 'Mysore, Karnataka, India' },
  'hubli': { lat: 15.3647, lng: 75.1240, city: 'Hubli', state: 'Karnataka', label: 'Hubli-Dharwad, Karnataka, India' },
  // Tamil Nadu
  'chennai': { lat: 13.0827, lng: 80.2707, city: 'Chennai', state: 'Tamil Nadu', label: 'Chennai, Tamil Nadu, India' },
  'sriperumbudur': { lat: 12.9699, lng: 79.9405, city: 'Sriperumbudur', state: 'Tamil Nadu', label: 'Sriperumbudur Industrial Zone, Tamil Nadu' },
  'coimbatore': { lat: 11.0168, lng: 76.9558, city: 'Coimbatore', state: 'Tamil Nadu', label: 'Coimbatore, Tamil Nadu, India' },
  'madurai': { lat: 9.9252, lng: 78.1198, city: 'Madurai', state: 'Tamil Nadu', label: 'Madurai, Tamil Nadu, India' },
  // Telangana
  'hyderabad': { lat: 17.385, lng: 78.4867, city: 'Hyderabad', state: 'Telangana', label: 'Hyderabad, Telangana, India' },
  'secunderabad': { lat: 17.4399, lng: 78.4983, city: 'Secunderabad', state: 'Telangana', label: 'Secunderabad, Telangana, India' },
  // Gujarat
  'ahmedabad': { lat: 23.0225, lng: 72.5714, city: 'Ahmedabad', state: 'Gujarat', label: 'Ahmedabad, Gujarat, India' },
  'sanand': { lat: 22.9868, lng: 72.3807, city: 'Sanand', state: 'Gujarat', label: 'Sanand GIDC Industrial Logistics Cluster, Gujarat' },
  'surat': { lat: 21.1702, lng: 72.8311, city: 'Surat', state: 'Gujarat', label: 'Surat, Gujarat, India' },
  'vadodara': { lat: 22.3072, lng: 73.1812, city: 'Vadodara', state: 'Gujarat', label: 'Vadodara (Baroda), Gujarat, India' },
  'rajkot': { lat: 22.3039, lng: 70.8022, city: 'Rajkot', state: 'Gujarat', label: 'Rajkot, Gujarat, India' },
  'gandhidham': { lat: 23.0849, lng: 70.1337, city: 'Gandhidham', state: 'Gujarat', label: 'Gandhidham Kandla Port Logistics, Gujarat' },
  // West Bengal
  'kolkata': { lat: 22.5726, lng: 88.3639, city: 'Kolkata', state: 'West Bengal', label: 'Kolkata, West Bengal, India' },
  'dankuni': { lat: 22.6841, lng: 88.2974, city: 'Dankuni', state: 'West Bengal', label: 'Dankuni Freight Hub, West Bengal' },
  // Rajasthan
  'jaipur': { lat: 26.9124, lng: 75.7873, city: 'Jaipur', state: 'Rajasthan', label: 'Jaipur, Rajasthan, India' },
  'jodhpur': { lat: 26.2389, lng: 73.0243, city: 'Jodhpur', state: 'Rajasthan', label: 'Jodhpur, Rajasthan, India' },
  // Uttar Pradesh
  'lucknow': { lat: 26.8467, lng: 80.9462, city: 'Lucknow', state: 'Uttar Pradesh', label: 'Lucknow, Uttar Pradesh, India' },
  'kanpur': { lat: 26.4499, lng: 80.3319, city: 'Kanpur', state: 'Uttar Pradesh', label: 'Kanpur, Uttar Pradesh, India' },
  'agra': { lat: 27.1767, lng: 78.0081, city: 'Agra', state: 'Uttar Pradesh', label: 'Agra, Uttar Pradesh, India' },
  'varanasi': { lat: 25.3176, lng: 82.9739, city: 'Varanasi', state: 'Uttar Pradesh', label: 'Varanasi, Uttar Pradesh, India' },
  // Madhya Pradesh
  'indore': { lat: 22.7196, lng: 75.8577, city: 'Indore', state: 'Madhya Pradesh', label: 'Indore, Madhya Pradesh, India' },
  'pithampur': { lat: 22.6139, lng: 75.6823, city: 'Pithampur', state: 'Madhya Pradesh', label: 'Pithampur Automotive Corridor, Madhya Pradesh' },
  'bhopal': { lat: 23.2599, lng: 77.4126, city: 'Bhopal', state: 'Madhya Pradesh', label: 'Bhopal, Madhya Pradesh, India' },
  // Andhra Pradesh
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, city: 'Visakhapatnam', state: 'Andhra Pradesh', label: 'Visakhapatnam (Vizag), Andhra Pradesh, India' },
  'vizag': { lat: 17.6868, lng: 83.2185, city: 'Visakhapatnam', state: 'Andhra Pradesh', label: 'Vizag (Visakhapatnam), Andhra Pradesh, India' },
  'vijayawada': { lat: 16.5062, lng: 80.648, city: 'Vijayawada', state: 'Andhra Pradesh', label: 'Vijayawada, Andhra Pradesh, India' },
  // Kerala
  'kochi': { lat: 9.9312, lng: 76.2673, city: 'Kochi', state: 'Kerala', label: 'Kochi, Kerala, India' },
  'cochin': { lat: 9.9312, lng: 76.2673, city: 'Kochi', state: 'Kerala', label: 'Cochin (Kochi), Kerala, India' },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366, city: 'Thiruvananthapuram', state: 'Kerala', label: 'Thiruvananthapuram, Kerala, India' },
  'trivandrum': { lat: 8.5241, lng: 76.9366, city: 'Thiruvananthapuram', state: 'Kerala', label: 'Trivandrum, Kerala, India' },
  // Punjab/Haryana
  'chandigarh': { lat: 30.7333, lng: 76.7794, city: 'Chandigarh', state: 'Punjab', label: 'Chandigarh, Punjab/Haryana, India' },
  'ludhiana': { lat: 30.901, lng: 75.8573, city: 'Ludhiana', state: 'Punjab', label: 'Ludhiana, Punjab, India' },
  'amritsar': { lat: 31.634, lng: 74.8723, city: 'Amritsar', state: 'Punjab', label: 'Amritsar, Punjab, India' },
  // Others
  'patna': { lat: 25.5941, lng: 85.1376, city: 'Patna', state: 'Bihar', label: 'Patna, Bihar, India' },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245, city: 'Bhubaneswar', state: 'Odisha', label: 'Bhubaneswar, Odisha, India' },
  'guwahati': { lat: 26.1445, lng: 91.7362, city: 'Guwahati', state: 'Assam', label: 'Guwahati, Assam, India' },
};

export class GeocodingService {
  private readonly orsApiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: { orsApiKey?: string; fetchFn?: typeof fetch }) {
    this.orsApiKey = options?.orsApiKey ?? process.env.OPENROUTESERVICE_API_KEY ?? '';
    this.fetchFn = options?.fetchFn ?? globalThis.fetch;
  }

  /**
   * Geocodes a location query and returns up to 5 ranked candidates.
   * The frontend must show these to the user and let them explicitly select one.
   *
   * CRITICAL: Do NOT auto-select. The caller must present the list to the user.
   */
  public async geocodeCandidates(query: string): Promise<GeocodeCandidate[]> {
    if (!query || !query.trim()) {
      throw new ValidationError('Geocoding query cannot be empty');
    }

    const cleanQuery = query.trim().toLowerCase();
    const candidates: GeocodeCandidate[] = [];

    // 1. Check Curated Indian Hub Dictionary — EXACT match only (no substring)
    for (const [key, hub] of Object.entries(INDIAN_LOGISTICS_HUBS)) {
      // Only match if the query exactly equals the key, OR starts with the key (multi-word prefixes)
      if (cleanQuery === key || cleanQuery.startsWith(key + ',') || cleanQuery.startsWith(key + ' ')) {
        candidates.push({
          displayName: hub.label,
          city: hub.city,
          state: hub.state,
          country: 'India',
          latitude: hub.lat,
          longitude: hub.lng,
          confidence: 1.0,
          provider: 'CURATED_LOGISTICS_HUB',
        });
        // Continue to also try ORS/Nominatim for additional candidates
        break;
      }
    }

    // 2. Try OpenRouteService — fetch up to 5 results
    if (this.orsApiKey) {
      try {
        const url = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(this.orsApiKey)}&text=${encodeURIComponent(query)}&size=5&boundary.country=IND`;
        const res = await this.fetchFn(url, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data: any = await res.json();
          const features = data.features || [];
          for (const feature of features) {
            if (!feature.geometry?.coordinates) continue;
            const [lon, lat] = feature.geometry.coordinates;
            const props = feature.properties || {};
            const conf = Number(props.confidence || 0.85);
            // Skip duplicates already covered by curated dict
            const isDupe = candidates.some(
              (c) => Math.abs(c.latitude - lat) < 0.01 && Math.abs(c.longitude - lon) < 0.01
            );
            if (!isDupe) {
              candidates.push({
                displayName: props.label || query,
                city: props.locality || props.county || props.name,
                state: props.region,
                country: props.country || 'India',
                latitude: Number(Number(lat).toFixed(6)),
                longitude: Number(Number(lon).toFixed(6)),
                confidence: conf,
                provider: 'ORS',
              });
            }
          }
        }
      } catch {
        // Fall through to Nominatim
      }
    }

    // 3. Fallback to Nominatim — fetch up to 5 results
    if (candidates.length < 5) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=in`;
        const res = await this.fetchFn(url, {
          headers: {
            'User-Agent': 'CarbonIQ-Logistics-Platform/1.0',
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const data: any = await res.json();
          for (const item of data || []) {
            if (!item.lat || !item.lon) continue;
            const addr = item.address || {};
            const lat = Number(parseFloat(item.lat).toFixed(6));
            const lon = Number(parseFloat(item.lon).toFixed(6));
            const isDupe = candidates.some(
              (c) => Math.abs(c.latitude - lat) < 0.01 && Math.abs(c.longitude - lon) < 0.01
            );
            if (!isDupe) {
              candidates.push({
                displayName: item.display_name || query,
                city: addr.city || addr.town || addr.village || addr.county,
                state: addr.state,
                country: addr.country || 'India',
                latitude: lat,
                longitude: lon,
                confidence: 0.8,
                provider: 'NOMINATIM',
              });
            }
          }
        }
      } catch {
        // Return whatever we have
      }
    }

    // Sort by confidence descending, cap at 5
    return candidates
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * @deprecated Use geocodeCandidates() instead which returns multiple options.
   * Kept for backward compatibility — returns the best single candidate.
   */
  public async geocode(query: string): Promise<GeocodeCandidate | null> {
    if (!query || !query.trim()) {
      throw new ValidationError('Geocoding query cannot be empty');
    }
    const candidates = await this.geocodeCandidates(query);
    return candidates[0] ?? null;
  }
}
