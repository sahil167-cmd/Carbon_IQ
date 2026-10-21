import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../lib/api-client';

export interface Notification {
  id: string;
  userId: string;
  organizationId: string | null;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * useNotifications — fetches paginated notifications from /api/v1/notifications
 * Polls every 60 seconds for new notifications.
 */
export function useNotifications(page = 1, limit = 20) {
  return useQuery<NotificationsPage, Error>({
    queryKey: ['notifications', page, limit],
    queryFn: async () => {
      try {
        return await apiGet<NotificationsPage>('/api/v1/notifications', { page, limit });
      } catch {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
        };
      }
    },
    refetchInterval: 60_000,
    retry: 0,
    staleTime: 30_000,
  });
}

/**
 * useUnreadCount — returns the count of unread notifications.
 */
export function useUnreadCount() {
  const { data } = useNotifications(1, 100);
  return data?.items.filter((n) => !n.isRead).length ?? 0;
}

/**
 * useMarkAsRead — mutation to mark a single notification as read.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<{ id: string; isRead: boolean; updated: boolean }>(
        `/api/v1/notifications/${id}/read`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * useMarkAllAsRead — mutation to mark all notifications as read.
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiPatch<{ markedRead: number }>('/api/v1/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
