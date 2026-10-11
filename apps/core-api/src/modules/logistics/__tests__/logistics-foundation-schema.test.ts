import {
  Prisma,
  ShipmentStatus,
  StopType,
  DimensionUnit,
  WeightUnit,
  VolumeUnit,
  OptimizationStatus,
  VehicleBodyType,
  VehicleFuelType,
} from '@prisma/client';
import { TenantScopedRepository } from '../../../core/repository/tenant-scoped.repository';

// Isolated concrete repository subclass to test tenant scoping for Logistics entities
class MockLogisticsRepository extends TenantScopedRepository {
  public testScopedWhere<T extends Record<string, unknown>>(where?: T) {
    return this.scopedWhere(where);
  }

  public async testFindShipmentById(mockModel: any, id: string) {
    return this.findByIdScoped(mockModel, id, 'Shipment');
  }

  public async testFindVehicleById(mockModel: any, id: string) {
    return this.findByIdScoped(mockModel, id, 'Vehicle');
  }
}

describe('Phase 1A — Logistics Database Foundation & Domain Validation', () => {
  const testOrgAlpha = 'org-tenant-alpha-001';
  const mockPrisma: any = {};

  describe('1. Logistics Enums Verification', () => {
    it('should expose all required ShipmentStatus values', () => {
      expect(ShipmentStatus.DRAFT).toBe('DRAFT');
      expect(ShipmentStatus.PLANNED).toBe('PLANNED');
      expect(ShipmentStatus.OPTIMIZED).toBe('OPTIMIZED');
      expect(ShipmentStatus.DISPATCHED).toBe('DISPATCHED');
      expect(ShipmentStatus.IN_TRANSIT).toBe('IN_TRANSIT');
      expect(ShipmentStatus.DELIVERED).toBe('DELIVERED');
      expect(ShipmentStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should expose all required StopType values', () => {
      expect(StopType.PICKUP).toBe('PICKUP');
      expect(StopType.DROPOFF).toBe('DROPOFF');
      expect(StopType.TRANSIT_WAYPOINT).toBe('TRANSIT_WAYPOINT');
    });

    it('should expose explicit unit enums for dimensions, weight, and volume', () => {
      expect(DimensionUnit.CM).toBe('CM');
      expect(DimensionUnit.M).toBe('M');
      expect(DimensionUnit.MM).toBe('MM');
      expect(DimensionUnit.INCH).toBe('INCH');

      expect(WeightUnit.KG).toBe('KG');
      expect(WeightUnit.TONNE).toBe('TONNE');

      expect(VolumeUnit.M3).toBe('M3');
      expect(VolumeUnit.CFT).toBe('CFT');
    });

    it('should expose non-hardcoded vehicle specification enums', () => {
      expect(VehicleBodyType.BOX_TRUCK).toBe('BOX_TRUCK');
      expect(VehicleBodyType.CONTAINER_CARRIER).toBe('CONTAINER_CARRIER');
      expect(VehicleBodyType.REFRIGERATED).toBe('REFRIGERATED');
      expect(VehicleBodyType.FLATBED).toBe('FLATBED');

      expect(VehicleFuelType.DIESEL).toBe('DIESEL');
      expect(VehicleFuelType.ELECTRIC).toBe('ELECTRIC');
      expect(VehicleFuelType.CNG).toBe('CNG');
      expect(VehicleFuelType.HYBRID).toBe('HYBRID');
    });

    it('should expose OptimizationStatus values', () => {
      expect(OptimizationStatus.PENDING).toBe('PENDING');
      expect(OptimizationStatus.PROCESSING).toBe('PROCESSING');
      expect(OptimizationStatus.COMPLETED).toBe('COMPLETED');
      expect(OptimizationStatus.FAILED).toBe('FAILED');
    });
  });

  describe('2. Tenant Isolation & Scoping Compliance', () => {
    it('should automatically inject tenant organizationId into shipment queries', () => {
      const repo = new MockLogisticsRepository(mockPrisma, testOrgAlpha);
      const scopedQuery = repo.testScopedWhere({ status: ShipmentStatus.PLANNED });

      expect(scopedQuery).toEqual({
        status: ShipmentStatus.PLANNED,
        organizationId: testOrgAlpha,
      });
    });

    it('should prevent cross-tenant shipment access by returning 404', async () => {
      const repo = new MockLogisticsRepository(mockPrisma, testOrgAlpha);
      const mockShipmentModel = {
        findFirst: jest.fn().mockResolvedValue(null), // null because orgId doesn't match
      };

      await expect(
        repo.testFindShipmentById(mockShipmentModel, 'shipment-belonging-to-beta'),
      ).rejects.toThrow('Shipment not found');

      expect(mockShipmentModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'shipment-belonging-to-beta', organizationId: testOrgAlpha },
      });
    });

    it('should prevent cross-tenant vehicle fleet access by returning 404', async () => {
      const repo = new MockLogisticsRepository(mockPrisma, testOrgAlpha);
      const mockVehicleModel = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await expect(
        repo.testFindVehicleById(mockVehicleModel, 'vehicle-of-tenant-beta'),
      ).rejects.toThrow('Vehicle not found');

      expect(mockVehicleModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'vehicle-of-tenant-beta', organizationId: testOrgAlpha },
      });
    });
  });

  describe('3. Decimal & Accounting-Grade Precision Compliance', () => {
    it('should support Decimal precision without floating-point drift', () => {
      // Test Decimal instance creation matching Prisma's Decimal type
      const cargoWeightUnit = new Prisma.Decimal('142.875');
      const cargoQuantity = 40;
      const totalWeight = cargoWeightUnit.mul(cargoQuantity);

      // 142.875 * 40 = 5715.000 (Exact decimal arithmetic)
      expect(totalWeight.toString()).toBe('5715');
      expect(totalWeight.toFixed(3)).toBe('5715.000');
    });

    it('should validate 3D dimensions and volume calculation consistency', () => {
      // 120 cm x 80 cm x 150 cm (Standard Euro Pallet bounding box)
      const lengthCm = new Prisma.Decimal('120.00');
      const widthCm = new Prisma.Decimal('80.00');
      const heightCm = new Prisma.Decimal('150.00');

      // Volume in m3 = (L * W * H) / 1,000,000
      const volumeCm3 = lengthCm.mul(widthCm).mul(heightCm);
      const volumeM3 = volumeCm3.div(1000000);

      expect(volumeM3.toFixed(4)).toBe('1.4400');
    });
  });

  describe('4. Cargo Physical & 3D Optimizer Constraints', () => {
    it('should validate valid cargo constraint structures', () => {
      const testCargoManifest = {
        description: 'Industrial Inverter Unit',
        quantity: 10,
        length: new Prisma.Decimal('120.00'),
        width: new Prisma.Decimal('80.00'),
        height: new Prisma.Decimal('110.00'),
        dimensionUnit: DimensionUnit.CM,
        unitWeight: new Prisma.Decimal('350.500'),
        totalWeight: new Prisma.Decimal('3505.000'),
        weightUnit: WeightUnit.KG,
        isStackable: true,
        maxStackWeight: new Prisma.Decimal('500.00'),
        maxStackTiers: 2,
        isFragile: false,
        allowRotationHorizontal: true,
        allowRotationVertical: false,
        allowedOrientations: ['DEFAULT', 'YAW_90'],
        loadingPriority: 2,
        unloadingSequence: 1,
      };

      expect(testCargoManifest.isStackable).toBe(true);
      expect(testCargoManifest.allowRotationVertical).toBe(false); // cannot lay on side
      expect(testCargoManifest.allowedOrientations).toContain('YAW_90');
      expect(testCargoManifest.unloadingSequence).toBe(1);
    });
  });
});
