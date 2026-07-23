import { SiteRepository } from './site.repository';
import { CreateSiteInput, UpdateSiteInput } from './site.validator';
import { SiteDTO, SiteDashboardMetrics } from './site.types';
import { SiteStatus } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/app.error';
import { OrganizationRepository } from '../organization/organization.repository';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('SiteService');

export class SiteService {
  constructor(
    private readonly siteRepo: SiteRepository,
    private readonly orgRepo: OrganizationRepository,
  ) {}

  // ===========================================================================
  // 1. Create Site (FWS §4.1 & PRD §3.8)
  // ===========================================================================
  async createSite(userId: string, input: CreateSiteInput): Promise<SiteDTO> {
    // Unique site name within organization check
    const existing = await this.siteRepo.findSiteByName(input.name);
    if (existing) {
      throw new ValidationError(`A site with the name "${input.name}" already exists in your organization.`);
    }

    const site = await this.siteRepo.createSite(input);

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: site.organizationId,
      action: 'SITE_CREATED',
      entityType: 'Site',
      entityId: site.id,
      newValue: { name: site.name, type: site.type, country: site.country },
    });

    logger.info({ siteId: site.id, orgId: site.organizationId, type: site.type }, 'Site created');

    return site;
  }

  // ===========================================================================
  // 2. Fetch & List Sites (PRD §3.10)
  // ===========================================================================
  async getSiteById(siteId: string): Promise<SiteDTO> {
    const site = await this.siteRepo.findSiteById(siteId);
    if (!site) {
      throw new NotFoundError('Site');
    }
    return site;
  }

  async listSites(status?: SiteStatus): Promise<SiteDTO[]> {
    return this.siteRepo.listSites(status);
  }

  // ===========================================================================
  // 3. Update Site (PRD §3.4)
  // ===========================================================================
  async updateSite(userId: string, siteId: string, input: UpdateSiteInput): Promise<SiteDTO> {
    const currentSite = await this.siteRepo.findSiteById(siteId);
    if (!currentSite) {
      throw new NotFoundError('Site');
    }

    // Name uniqueness check if name is changing
    if (input.name && input.name !== currentSite.name) {
      const existing = await this.siteRepo.findSiteByName(input.name);
      if (existing) {
        throw new ValidationError(`A site named "${input.name}" already exists in your organization.`);
      }
    }

    const updated = await this.siteRepo.updateSite(siteId, input);

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: currentSite.organizationId,
      action: 'SITE_UPDATED',
      entityType: 'Site',
      entityId: siteId,
      oldValue: { name: currentSite.name, type: currentSite.type, status: currentSite.status },
      newValue: { name: updated.name, type: updated.type, status: updated.status },
    });

    logger.info({ siteId, userId }, 'Site details updated');

    return updated;
  }

  // ===========================================================================
  // 4. Soft-Deactivate Site (FWS §4.1 & PRD §3.4)
  // ===========================================================================
  async deactivateSite(userId: string, siteId: string): Promise<SiteDTO> {
    const currentSite = await this.siteRepo.findSiteById(siteId);
    if (!currentSite) {
      throw new NotFoundError('Site');
    }

    const deactivated = await this.siteRepo.setSiteStatus(siteId, SiteStatus.INACTIVE);

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: currentSite.organizationId,
      action: 'SITE_DEACTIVATED',
      entityType: 'Site',
      entityId: siteId,
      oldValue: { status: currentSite.status },
      newValue: { status: SiteStatus.INACTIVE },
    });

    logger.info({ siteId, userId }, 'Site soft-deactivated (historical data preserved)');

    return deactivated;
  }

  // ===========================================================================
  // 5. Hard Delete Prevention (FWS §4.4 & PRD §3.6)
  // ===========================================================================
  async deleteSite(userId: string, siteId: string): Promise<void> {
    const currentSite = await this.siteRepo.findSiteById(siteId);
    if (!currentSite) {
      throw new NotFoundError('Site');
    }

    // In Phase 0-4 before calculation rows exist, check if site has any dependent documents or calculations.
    // If historical data exists, block hard-delete and guide to deactivate (FWS §4.4).
    const hasCalculations = false; // Evaluated dynamically in Phase 8

    if (hasCalculations) {
      throw new ConflictError(
        'Sites with historical emissions data cannot be permanently deleted. Use soft-deactivation instead.',
        'SITE_HAS_HISTORICAL_DATA',
      );
    }

    await this.siteRepo.hardDeleteSite(siteId);

    await this.orgRepo.logAuditAction({
      userId,
      organizationId: currentSite.organizationId,
      action: 'SITE_HARD_DELETED',
      entityType: 'Site',
      entityId: siteId,
      oldValue: { name: currentSite.name },
    });
  }

  // ===========================================================================
  // 6. Site Dashboard APIs (FWS §4.2 & PRD §3.5)
  // ===========================================================================
  async getSiteDashboard(siteId: string): Promise<SiteDashboardMetrics> {
    const site = await this.siteRepo.findSiteById(siteId);
    if (!site) {
      throw new NotFoundError('Site');
    }

    const totalSites = await this.siteRepo.countTotalOrgSites();

    // Stub aggregations until Module 7 calculation engine lands
    const currentEmissions = {
      scope1: 420.5,
      scope2: 180.2,
      scope3: 95.0,
      total: 695.7,
    };

    const monthlyTrend = [
      { month: 'Jan', co2e: 55.2 },
      { month: 'Feb', co2e: 58.1 },
      { month: 'Mar', co2e: 52.4 },
      { month: 'Apr', co2e: 61.0 },
      { month: 'May', co2e: 59.8 },
      { month: 'Jun', co2e: 56.4 },
    ];

    return {
      site,
      reportingPeriodName: 'CY 2025',
      currentPeriodEmissions: currentEmissions,
      previousPeriodEmissions: { scope1: 450.0, scope2: 200.0, scope3: 110.0, total: 760.0 },
      percentageChange: -8.46, // -8.46% reduction YoY
      orgSharePercentage: totalSites > 0 ? Number((100 / totalSites).toFixed(2)) : 100,
      monthlyTrend,
    };
  }
}
