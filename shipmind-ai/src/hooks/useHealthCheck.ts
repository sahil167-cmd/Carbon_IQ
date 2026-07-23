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
      const res = await apiClient.get<HealthResponse>('/health');
      return res.data;
    },
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 25_000,
  });
}
