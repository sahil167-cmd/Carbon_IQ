import { SiteService } from '../site.service';
import { SiteType, SiteStatus } from '@prisma/client';
import { ValidationError, NotFoundError } from '../../../core/errors/app.error';

describe('SiteService', () => {
  let mockSiteRepo: any;
  let mockOrgRepo: any;
  let service: SiteService;

  const mockSite = {
    id: 'site-1',
    organizationId: 'org-100',
    name: 'Plant Alpha',
    type: SiteType.MANUFACTURING_PLANT,
    status: SiteStatus.ACTIVE,
    address: '100 Industrial Way',
    city: 'Detroit',
    state: 'MI',
    country: 'US',
    productionCapacity: 50000,
    capacityUnit: 'TONS_PER_YEAR',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSiteRepo = {
      findSiteById: jest.fn(),
      findSiteByName: jest.fn(),
      listSites: jest.fn(),
      createSite: jest.fn(),
      updateSite: jest.fn(),
      setSiteStatus: jest.fn(),
      hardDeleteSite: jest.fn(),
      countTotalOrgSites: jest.fn().mockResolvedValue(4),
    };

    mockOrgRepo = {
      logAuditAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new SiteService(mockSiteRepo, mockOrgRepo);
  });

  describe('createSite', () => {
    it('should throw ValidationError if duplicate site name exists in same organization', async () => {
      mockSiteRepo.findSiteByName.mockResolvedValueOnce(mockSite);

      await expect(
        service.createSite('user-1', {
          name: 'Plant Alpha',
          type: SiteType.MANUFACTURING_PLANT,
          country: 'US',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should create site and record audit log on valid input', async () => {
      mockSiteRepo.findSiteByName.mockResolvedValueOnce(null);
      mockSiteRepo.createSite.mockResolvedValueOnce(mockSite);

      const result = await service.createSite('user-1', {
        name: 'Plant Alpha',
        type: SiteType.MANUFACTURING_PLANT,
        country: 'US',
        productionCapacity: 50000,
        capacityUnit: 'TONS_PER_YEAR',
      });

      expect(result.id).toBe('site-1');
      expect(mockSiteRepo.createSite).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Plant Alpha',
          type: SiteType.MANUFACTURING_PLANT,
          country: 'US',
        }),
      );
      expect(mockOrgRepo.logAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SITE_CREATED',
          entityId: 'site-1',
        }),
      );
    });
  });

  describe('deactivateSite (Soft Delete)', () => {
    it('should update site status to INACTIVE and log audit action', async () => {
      mockSiteRepo.findSiteById.mockResolvedValueOnce(mockSite);
      mockSiteRepo.setSiteStatus.mockResolvedValueOnce({
        ...mockSite,
        status: SiteStatus.INACTIVE,
      });

      const result = await service.deactivateSite('user-1', 'site-1');

      expect(result.status).toBe(SiteStatus.INACTIVE);
      expect(mockSiteRepo.setSiteStatus).toHaveBeenCalledWith('site-1', SiteStatus.INACTIVE);
      expect(mockOrgRepo.logAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SITE_DEACTIVATED',
          entityId: 'site-1',
        }),
      );
    });
  });

  describe('getSiteDashboard', () => {
    it('should return site-level emissions breakdown, org share, and trend data', async () => {
      mockSiteRepo.findSiteById.mockResolvedValueOnce(mockSite);
      mockSiteRepo.countTotalOrgSites.mockResolvedValueOnce(4);

      const metrics = await service.getSiteDashboard('site-1');

      expect(metrics.site.name).toBe('Plant Alpha');
      expect(metrics.currentPeriodEmissions.total).toBeGreaterThan(0);
      expect(metrics.orgSharePercentage).toBe(25); // 100 / 4 = 25%
      expect(metrics.monthlyTrend.length).toBe(6);
    });
  });
});
