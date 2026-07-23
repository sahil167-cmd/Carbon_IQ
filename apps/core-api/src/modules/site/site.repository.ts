import { PrismaClient, Site, SiteStatus, SiteType } from '@prisma/client';
import { TenantScopedRepository } from '../../core/repository/tenant-scoped.repository';

export class SiteRepository extends TenantScopedRepository {
  constructor(prisma: PrismaClient, organizationId?: string) {
    super(prisma, organizationId);
  }

  async findSiteById(id: string): Promise<Site | null> {
    return this.prisma.site.findFirst({
      where: this.scopedWhere({ id }),
    });
  }

  async findSiteByName(name: string): Promise<Site | null> {
    return this.prisma.site.findFirst({
      where: this.scopedWhere({ name }),
    });
  }

  async listSites(status?: SiteStatus): Promise<Site[]> {
    return this.prisma.site.findMany({
      where: this.scopedWhere(status ? { status } : undefined),
      orderBy: { name: 'asc' },
    });
  }

  async createSite(data: {
    name: string;
    type: SiteType;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country: string;
    productionCapacity?: number | null;
    capacityUnit?: string | null;
  }): Promise<Site> {
    return this.prisma.site.create({
      data: {
        organizationId: this.organizationId,
        name: data.name,
        type: data.type,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        country: data.country,
        productionCapacity: data.productionCapacity ?? null,
        capacityUnit: data.capacityUnit ?? null,
        status: SiteStatus.ACTIVE,
      },
    });
  }

  async updateSite(
    id: string,
    data: {
      name?: string;
      type?: SiteType;
      status?: SiteStatus;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string;
      productionCapacity?: number | null;
      capacityUnit?: string | null;
    },
  ): Promise<Site> {
    return this.prisma.site.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.country ? { country: data.country } : {}),
        ...(data.productionCapacity !== undefined ? { productionCapacity: data.productionCapacity } : {}),
        ...(data.capacityUnit !== undefined ? { capacityUnit: data.capacityUnit } : {}),
      },
    });
  }

  async setSiteStatus(id: string, status: SiteStatus): Promise<Site> {
    return this.prisma.site.update({
      where: { id },
      data: { status },
    });
  }

  async hardDeleteSite(id: string): Promise<void> {
    await this.prisma.site.delete({
      where: { id },
    });
  }

  async countTotalOrgSites(): Promise<number> {
    return this.prisma.site.count({
      where: this.scopedWhere({ status: SiteStatus.ACTIVE }),
    });
  }
}
