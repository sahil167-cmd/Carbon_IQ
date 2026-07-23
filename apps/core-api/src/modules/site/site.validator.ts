import { z } from 'zod';
import { SiteType, SiteStatus } from '@prisma/client';

const countryIsoCodeRegex = /^[A-Z]{2}$/;

export const createSiteSchema = z.object({
  name: z.string().min(2, 'Site name must be at least 2 characters').max(100).trim(),
  type: z.nativeEnum(SiteType, { required_error: 'Valid site type is required' }),
  address: z.string().max(250).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z
    .string()
    .length(2, 'Country must be a 2-letter ISO 3166-1 alpha-2 code')
    .transform((c) => c.toUpperCase())
    .refine((c) => countryIsoCodeRegex.test(c), 'Invalid ISO country code'),
  productionCapacity: z
    .number()
    .positive('Production capacity must be a positive number')
    .optional()
    .nullable(),
  capacityUnit: z.string().max(30).optional().nullable(),
});

export const updateSiteSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  type: z.nativeEnum(SiteType).optional(),
  status: z.nativeEnum(SiteStatus).optional(),
  address: z.string().max(250).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z
    .string()
    .length(2)
    .transform((c) => c.toUpperCase())
    .refine((c) => countryIsoCodeRegex.test(c))
    .optional(),
  productionCapacity: z.number().positive().optional().nullable(),
  capacityUnit: z.string().max(30).optional().nullable(),
});

export const listSitesQuerySchema = z.object({
  status: z.nativeEnum(SiteStatus).optional(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
export type ListSitesQuery = z.infer<typeof listSitesQuerySchema>;
