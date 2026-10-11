import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LogisticsService from '../services/logistics.service';
import * as apiClient from '../lib/api-client';
import type {
  Shipment,
  CreateShipmentInput,
  CreateCargoItemInput,
  UpdateCargoItemInput,
} from '../types/logistics';

describe('Phase 7B: Logistics Frontend — Shipment & Cargo Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Shipment List Workflow
  // =========================================================================
  describe('Shipment List Workflow', () => {
    it('TEST 1: Fetches and returns live paginated shipments from API', async () => {
      const mockShipments: Shipment[] = [
        {
          id: 'shp-1',
          organizationId: 'org-alpha',
          shipmentNumber: 'SHP-2026-001',
          referenceNumber: 'PO-9821',
          status: 'PLANNED',
          totalWeightKg: 1500,
          totalVolumeM3: 4.5,
          cargoItemsCount: 2,
          stops: [
            { sequenceOrder: 1, stopType: 'PICKUP', city: 'Mumbai', country: 'India' },
            { sequenceOrder: 2, stopType: 'DROPOFF', city: 'Pune', country: 'India' },
          ],
          createdAt: '2026-09-07T00:00:00.000Z',
          updatedAt: '2026-09-07T00:00:00.000Z',
        },
      ];

      const apiGetSpy = vi.spyOn(apiClient, 'apiGet').mockResolvedValue({
        items: mockShipments,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await LogisticsService.listShipments({ page: 1, limit: 10 });

      expect(apiGetSpy).toHaveBeenCalledWith('/api/v1/logistics/shipments', { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].shipmentNumber).toBe('SHP-2026-001');
      expect(result.items[0].totalWeightKg).toBe(1500);
      expect(result.total).toBe(1);
    });

    it('TEST 2: Handles empty response gracefully when no shipments exist', async () => {
      vi.spyOn(apiClient, 'apiGet').mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await LogisticsService.listShipments({ page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('TEST 3: Propagates API error when fetching shipments fails', async () => {
      vi.spyOn(apiClient, 'apiGet').mockRejectedValue(new Error('Network error: Failed to connect to server'));

      await expect(LogisticsService.listShipments()).rejects.toThrow('Network error: Failed to connect to server');
    });

    it('TEST 4: Passes status query parameter when filtering by status', async () => {
      const apiGetSpy = vi.spyOn(apiClient, 'apiGet').mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await LogisticsService.listShipments({ status: 'OPTIMIZED', page: 2, limit: 20 });

      expect(apiGetSpy).toHaveBeenCalledWith('/api/v1/logistics/shipments', {
        status: 'OPTIMIZED',
        page: 2,
        limit: 20,
      });
    });
  });

  // =========================================================================
  // 2. Shipment Creation Workflow
  // =========================================================================
  describe('Shipment Creation Workflow', () => {
    it('TEST 5: Submits valid shipment creation payload with ordered stops', async () => {
      const newShipmentInput: CreateShipmentInput = {
        referenceNumber: 'PO-2026-MUM-PUN',
        description: 'Auto component freight transfer',
        stops: [
          {
            sequenceOrder: 1,
            stopType: 'PICKUP',
            locationName: 'Bhiwandi Hub',
            city: 'Mumbai',
            country: 'India',
            latitude: 19.2812,
            longitude: 73.0483,
          },
          {
            sequenceOrder: 2,
            stopType: 'DROPOFF',
            locationName: 'Chakan Assembly Facility',
            city: 'Pune',
            country: 'India',
            latitude: 18.7562,
            longitude: 73.8491,
          },
        ],
      };

      const mockCreated: Shipment = {
        id: 'shp-new-1',
        organizationId: 'org-alpha',
        shipmentNumber: 'SHP-20260907-9912',
        referenceNumber: 'PO-2026-MUM-PUN',
        description: 'Auto component freight transfer',
        status: 'DRAFT',
        stops: newShipmentInput.stops,
        createdAt: '2026-09-07T00:00:00.000Z',
        updatedAt: '2026-09-07T00:00:00.000Z',
      };

      const apiPostSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValue(mockCreated);

      const result = await LogisticsService.createShipment(newShipmentInput);

      expect(apiPostSpy).toHaveBeenCalledWith('/api/v1/logistics/shipments', newShipmentInput);
      expect(result.id).toBe('shp-new-1');
      expect(result.status).toBe('DRAFT');
      expect(result.stops).toHaveLength(2);
    });

    it('TEST 6: Handles backend validation failure on creation with descriptive message', async () => {
      vi.spyOn(apiClient, 'apiPost').mockRejectedValue(
        new Error('Validation failed (stops.0.country: country is required)')
      );

      const invalidInput: CreateShipmentInput = {
        stops: [{ sequenceOrder: 1, stopType: 'PICKUP', country: '' }],
      };

      await expect(LogisticsService.createShipment(invalidInput)).rejects.toThrow(
        'Validation failed (stops.0.country: country is required)'
      );
    });
  });

  // =========================================================================
  // 3. Cargo Workflow
  // =========================================================================
  describe('Cargo Workflow', () => {
    it('TEST 7: Adds a valid cargo item and returns updated totals from backend', async () => {
      const cargoInput: CreateCargoItemInput = {
        description: 'Heavy Gearboxes',
        quantity: 4,
        length: 80,
        width: 60,
        height: 50,
        dimensionUnit: 'CM',
        unitWeight: 120,
        weightUnit: 'KG',
        isStackable: true,
        maxStackWeight: 500,
        isFragile: false,
        allowRotationHorizontal: true,
        allowRotationVertical: false,
      };

      const mockResponse = {
        cargoItem: {
          id: 'cargo-1',
          shipmentId: 'shp-1',
          ...cargoInput,
          totalWeightKg: 480,
          totalVolumeM3: 0.96,
          allowedOrientations: ['DEFAULT'],
        },
        shipmentTotals: {
          totalWeightKg: 480,
          totalVolumeM3: 0.96,
        },
      };

      const apiPostSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValue(mockResponse);

      const result = await LogisticsService.addCargoItem('shp-1', cargoInput);

      expect(apiPostSpy).toHaveBeenCalledWith('/api/v1/logistics/shipments/shp-1/cargo', cargoInput);
      expect(result.cargoItem.id).toBe('cargo-1');
      expect(result.shipmentTotals.totalWeightKg).toBe(480);
      expect(result.shipmentTotals.totalVolumeM3).toBe(0.96);
    });

    it('TEST 8: Propagates rejection when invalid cargo dimensions are submitted', async () => {
      vi.spyOn(apiClient, 'apiPost').mockRejectedValue(
        new Error('Validation failed (length: length must be positive)')
      );

      const invalidCargoInput: CreateCargoItemInput = {
        description: 'Faulty Cargo',
        quantity: 1,
        length: -10, // Invalid non-positive dimension
        width: 50,
        height: 50,
        dimensionUnit: 'CM',
        unitWeight: 10,
        weightUnit: 'KG',
      };

      await expect(LogisticsService.addCargoItem('shp-1', invalidCargoInput)).rejects.toThrow(
        'Validation failed (length: length must be positive)'
      );
    });

    it('TEST 9: Updates an existing cargo item and reconciles totals from backend', async () => {
      const updateInput: UpdateCargoItemInput = {
        quantity: 6,
        unitWeight: 125,
      };

      const mockResponse = {
        cargoItem: {
          id: 'cargo-1',
          shipmentId: 'shp-1',
          description: 'Heavy Gearboxes',
          quantity: 6,
          length: 80,
          width: 60,
          height: 50,
          dimensionUnit: 'CM' as const,
          unitWeight: 125,
          weightUnit: 'KG' as const,
          totalWeightKg: 750,
          totalVolumeM3: 1.44,
          isStackable: true,
          isFragile: false,
          allowRotationHorizontal: true,
          allowRotationVertical: false,
          allowedOrientations: ['DEFAULT'],
        },
        shipmentTotals: {
          totalWeightKg: 750,
          totalVolumeM3: 1.44,
        },
      };

      const apiPatchSpy = vi.spyOn(apiClient, 'apiPatch').mockResolvedValue(mockResponse);

      const result = await LogisticsService.updateCargoItem('shp-1', 'cargo-1', updateInput);

      expect(apiPatchSpy).toHaveBeenCalledWith(
        '/api/v1/logistics/shipments/shp-1/cargo/cargo-1',
        updateInput
      );
      expect(result.cargoItem.quantity).toBe(6);
      expect(result.shipmentTotals.totalWeightKg).toBe(750);
    });

    it('TEST 10: Deletes a cargo item and reconciles remaining shipment totals', async () => {
      const mockResponse = {
        deleted: true,
        cargoId: 'cargo-1',
        shipmentTotals: {
          totalWeightKg: 0,
          totalVolumeM3: 0,
        },
      };

      const apiDeleteSpy = vi.spyOn(apiClient, 'apiDelete').mockResolvedValue(mockResponse);

      const result = await LogisticsService.deleteCargoItem('shp-1', 'cargo-1');

      expect(apiDeleteSpy).toHaveBeenCalledWith('/api/v1/logistics/shipments/shp-1/cargo/cargo-1');
      expect(result.deleted).toBe(true);
      expect(result.shipmentTotals.totalWeightKg).toBe(0);
      expect(result.shipmentTotals.totalVolumeM3).toBe(0);
    });
  });

  // =========================================================================
  // 4. Shipment Detail & Status Transition Workflow
  // =========================================================================
  describe('Shipment Detail & Status Workflow', () => {
    it('TEST 11: Loads shipment details with ordered stops and cargo manifest', async () => {
      const mockDetail: Shipment = {
        id: 'shp-detail-1',
        organizationId: 'org-alpha',
        shipmentNumber: 'SHP-2026-MUM-PUN-01',
        referenceNumber: 'PO-8812',
        description: 'Precision Instruments Consignment',
        status: 'PLANNED',
        totalWeightKg: 350,
        totalVolumeM3: 2.1,
        stops: [
          { sequenceOrder: 1, stopType: 'PICKUP', city: 'Mumbai', country: 'India' },
          { sequenceOrder: 2, stopType: 'TRANSIT_WAYPOINT', city: 'Lonavala', country: 'India' },
          { sequenceOrder: 3, stopType: 'DROPOFF', city: 'Pune', country: 'India' },
        ],
        cargoItems: [
          {
            id: 'c-1',
            shipmentId: 'shp-detail-1',
            description: 'Sensors Box',
            quantity: 10,
            length: 40,
            width: 30,
            height: 25,
            dimensionUnit: 'CM',
            unitWeight: 35,
            weightUnit: 'KG',
            totalWeightKg: 350,
            totalVolumeM3: 2.1,
            isStackable: true,
            isFragile: true,
            allowRotationHorizontal: true,
            allowRotationVertical: false,
            allowedOrientations: ['DEFAULT'],
          },
        ],
        createdAt: '2026-09-07T00:00:00.000Z',
        updatedAt: '2026-09-07T00:00:00.000Z',
      };

      const apiGetSpy = vi.spyOn(apiClient, 'apiGet').mockResolvedValue(mockDetail);

      const result = await LogisticsService.getShipment('shp-detail-1');

      expect(apiGetSpy).toHaveBeenCalledWith('/api/v1/logistics/shipments/shp-detail-1');
      expect(result.shipmentNumber).toBe('SHP-2026-MUM-PUN-01');
      expect(result.stops).toHaveLength(3);
      expect(result.cargoItems).toHaveLength(1);
      expect(result.cargoItems![0].isFragile).toBe(true);
    });

    it('TEST 12: Handles 404 Not Found error when accessing non-existent shipment', async () => {
      vi.spyOn(apiClient, 'apiGet').mockRejectedValue(new Error('Shipment not found'));

      await expect(LogisticsService.getShipment('non-existent-id')).rejects.toThrow('Shipment not found');
    });

    it('TEST 13: Updates shipment status and receives updated state from backend', async () => {
      const mockUpdated: Shipment = {
        id: 'shp-1',
        organizationId: 'org-alpha',
        shipmentNumber: 'SHP-001',
        status: 'DISPATCHED',
        createdAt: '2026-09-07T00:00:00.000Z',
        updatedAt: '2026-09-07T00:00:00.000Z',
      };

      const apiPatchSpy = vi.spyOn(apiClient, 'apiPatch').mockResolvedValue(mockUpdated);

      const result = await LogisticsService.updateShipment('shp-1', { status: 'DISPATCHED' });

      expect(apiPatchSpy).toHaveBeenCalledWith('/api/v1/logistics/shipments/shp-1', {
        status: 'DISPATCHED',
      });
      expect(result.status).toBe('DISPATCHED');
    });
  });
});
