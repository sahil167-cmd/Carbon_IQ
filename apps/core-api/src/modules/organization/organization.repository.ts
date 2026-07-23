import { PrismaClient, Organization, Industry } from '@prisma/client';
import { TenantScopedRepository } from '../../core/repository/tenant-scoped.repository';

export class OrganizationRepository extends TenantScopedRepository {
  constructor(prisma: PrismaClient, organizationId?: string) {
    super(prisma, organizationId || 'GLOBAL_AUTH');
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
    });
  }

  async logAuditAction(data: {
    userId: string;
    organizationId: string;
    action: string;
    entityType: string;
    entityId: string;
    newValue?: any;
    oldValue?: any;
  }): Promise<void> {
    try {
      await (this.prisma as any).auditLog?.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          newValue: data.newValue ?? undefined,
          oldValue: data.oldValue ?? undefined,
        },
      });
    } catch {
      // Non-blocking audit log
    }
  }

  async listIndustries(): Promise<Industry[]> {
    return (this.prisma as any).industry?.findMany() ?? [];
  }
}
