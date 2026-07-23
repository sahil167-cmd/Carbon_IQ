import { z } from 'zod';

/** Query params for listing notifications */
export const listNotificationsSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((n) => n > 0, 'page must be a positive integer'),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .refine((n) => n > 0 && n <= 100, 'limit must be between 1 and 100'),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>;
