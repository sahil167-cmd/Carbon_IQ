import { z } from 'zod';

export const shipmentExtractionSchema = z.object({
  shipmentId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  transportMode: z.enum(['road', 'rail', 'air', 'sea']).default('road'),
  vehicleType: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  distanceKm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
});

export const electricityExtractionSchema = z.object({
  consumerNumber: z.string().optional(),
  billingPeriodStart: z.string().optional(),
  billingPeriodEnd: z.string().optional(),
  kwhConsumed: z.number().positive('kWh consumed must be positive'),
  tariffRate: z.number().optional(),
  gridRegion: z.string().optional(),
  renewablePercentage: z.number().min(0).max(100).optional(),
});

export const fuelExtractionSchema = z.object({
  fuelType: z.string().min(1, 'fuelType is required'), // e.g. "DIESEL", "LPG", "FURNACE_OIL"
  quantity: z.number().positive('Fuel quantity must be positive'),
  unit: z.string().min(1, 'unit is required'), // e.g. "LITERS", "GALLONS", "KG"
  purchaseDate: z.string().optional(),
  supplierName: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

export const purchasedGoodsExtractionSchema = z.object({
  materialType: z.string().optional(),
  material: z.string().optional(),
  productDescription: z.string().optional(),
  supplier: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  weightKg: z.number().positive().optional(),
  unit: z.string().min(1, 'Unit is required'),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
});

export const wasteExtractionSchema = z.object({
  wasteType: z.string().min(1, 'wasteType is required'),
  quantity: z.number().positive('Waste quantity must be positive'),
  unit: z.string().min(1, 'unit is required'),
  disposalMethod: z.string().optional(), // e.g. "LANDFILL", "RECYCLED", "INCINERATED"
  disposalDate: z.string().optional(),
});

export type ShipmentExtraction = z.infer<typeof shipmentExtractionSchema>;
export type ElectricityExtraction = z.infer<typeof electricityExtractionSchema>;
export type FuelExtraction = z.infer<typeof fuelExtractionSchema>;
export type PurchasedGoodsExtraction = z.infer<typeof purchasedGoodsExtractionSchema>;
export type WasteExtraction = z.infer<typeof wasteExtractionSchema>;

export function getCategorySchema(categoryCode: string): z.ZodSchema {
  switch (categoryCode) {
    case 'UPSTREAM_TRANSPORT':
    case 'DOWNSTREAM_TRANSPORT':
    case 'ROAD_FREIGHT':
      return shipmentExtractionSchema;
    case 'ELECTRICITY':
    case 'RENEWABLE_ENERGY':
      return electricityExtractionSchema;
    case 'STATIONARY_COMBUSTION':
    case 'MOBILE_COMBUSTION':
      return fuelExtractionSchema;
    case 'PURCHASED_GOODS':
      return purchasedGoodsExtractionSchema;
    case 'WASTE_MANAGEMENT':
      return wasteExtractionSchema;
    default:
      return fuelExtractionSchema;
  }
}
