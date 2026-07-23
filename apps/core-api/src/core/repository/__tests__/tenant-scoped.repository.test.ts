import { TenantScopedRepository } from '../tenant-scoped.repository';
import { NotFoundError } from '../../errors/app.error';

// Concrete subclass for testing TenantScopedRepository base class
class TestRepository extends TenantScopedRepository {
  public getScopedWhere<T extends Record<string, unknown>>(where?: T) {
    return this.scopedWhere(where);
  }

  public async testFindById(mockModel: any, id: string) {
    return this.findByIdScoped(mockModel, id, 'TestItem');
  }
}

describe('TenantScopedRepository', () => {
  const mockPrisma: any = {};
  const orgIdA = 'org-123-alpha';
  const orgIdB = 'org-456-beta';

  it('should auto-inject organizationId into empty where clause', () => {
    const repo = new TestRepository(mockPrisma, orgIdA);
    const result = repo.getScopedWhere();

    expect(result).toEqual({ organizationId: orgIdA });
  });

  it('should merge organizationId with existing where filters', () => {
    const repo = new TestRepository(mockPrisma, orgIdA);
    const result = repo.getScopedWhere({ status: 'ACTIVE', category: 'FUEL' });

    expect(result).toEqual({
      status: 'ACTIVE',
      category: 'FUEL',
      organizationId: orgIdA,
    });
  });

  it('should return item when found within tenant scope', async () => {
    const repo = new TestRepository(mockPrisma, orgIdA);
    const mockItem = { id: 'item-1', name: 'Site Alpha', organizationId: orgIdA };
    const mockModel = {
      findFirst: jest.fn().mockResolvedValue(mockItem),
    };

    const result = await repo.testFindById(mockModel, 'item-1');

    expect(mockModel.findFirst).toHaveBeenCalledWith({
      where: { id: 'item-1', organizationId: orgIdA },
    });
    expect(result).toEqual(mockItem);
  });

  it('should throw NotFoundError (404, never 403) when item belongs to another tenant', async () => {
    const repo = new TestRepository(mockPrisma, orgIdA);
    // Model returns null because query was scoped to orgIdA, but item belongs to orgIdB
    const mockModel = {
      findFirst: jest.fn().mockResolvedValue(null),
    };

    await expect(repo.testFindById(mockModel, 'item-cross-tenant')).rejects.toThrow(NotFoundError);
    expect(mockModel.findFirst).toHaveBeenCalledWith({
      where: { id: 'item-cross-tenant', organizationId: orgIdA },
    });
  });
});
