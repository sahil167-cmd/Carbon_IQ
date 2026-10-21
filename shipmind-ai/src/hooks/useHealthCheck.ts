import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface HealthData {
  status: 'ok';
  timestamp: string;
  uptime: number;
  version: string;
}

interface HealthResponse {
  success: boolean;
  data: HealthData;
}

/**
 * useHealthCheck — polls the backend /health endpoint.
 * Shows backend connection status in the UI (e.g. status indicator in AppHeader).
 * Polls every 30 seconds — low priority, just for connectivity awareness.
 */
export function useHealthCheck() {
  return useQuery<HealthResponse, Error>({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<HealthResponse>('/health');
        return res.data;
      } catch {
        return {
          success: false,
          data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: 0,
            version: '0.0.0',
          },
        };
      }
    },
    refetchInterval: 45_000,
    retry: 0,
    staleTime: 40_000,
  });
}
