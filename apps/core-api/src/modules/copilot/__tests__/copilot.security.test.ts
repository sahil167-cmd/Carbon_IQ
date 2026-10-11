import { CopilotService } from '../copilot.service';
import { CopilotRepository } from '../copilot.repository';
import { IngestionService } from '../ingestion/ingestion.service';
import { ForecastService } from '../../forecast/forecast.service';
import { FeatureFlagService, FLAG_KEYS } from '../../../services/feature-flag.service';
import { UnprocessableError } from '../../../core/errors/app.error';

describe('CarbonIQ AI Copilot — Security & Multi-Tenancy Tests', () => {
  let mockPrisma: any;
  let repoOrgA: CopilotRepository;
  let repoOrgB: CopilotRepository;

  beforeEach(() => {
    mockPrisma = {
      copilotSession: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      copilotMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      calculatedEmissions: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    repoOrgA = new CopilotRepository(mockPrisma, 'org_tenant_A');
    repoOrgB = new CopilotRepository(mockPrisma, 'org_tenant_B');
  });

  describe('1. Organization Isolation at Repository Layer', () => {
    it('should strictly query sessions scoped to authenticated organizationId', async () => {
      mockPrisma.copilotSession.findFirst.mockResolvedValue(null);

      const res = await repoOrgA.getSessionById('session_123', 'user_1');

      expect(mockPrisma.copilotSession.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'session_123',
          organizationId: 'org_tenant_A',
          userId: 'user_1',
        },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      expect(res).toBeNull();
    });

    it('should never expose Org B sessions to Org A user', async () => {
      mockPrisma.copilotSession.findFirst.mockImplementation((args: any) => {
        if (args.where.organizationId === 'org_tenant_A') return Promise.resolve(null);
        return Promise.resolve({ id: 'session_123', organizationId: 'org_tenant_B' });
      });

      const res = await repoOrgA.getSessionById('session_123', 'user_A');
      expect(res).toBeNull();
    });
  });

  describe('2. Feature Flag Enforcement', () => {
    it('should block execution when ENABLE_RAG is disabled', async () => {
      const mockFlagService: any = {
        requireEnabled: jest.fn().mockImplementation((key, orgId) => {
          throw new UnprocessableError(`Feature '${key}' is currently disabled.`);
        }),
      };

      const service = new CopilotService(
        repoOrgA,
        {} as IngestionService,
        {} as ForecastService,
        mockFlagService,
      );

      await expect(
        service.executeQuery({
          organizationId: 'org_tenant_A',
          userId: 'user_1',
          message: 'What are my emissions?',
        }),
      ).rejects.toThrow("Feature 'ENABLE_RAG' is currently disabled.");
    });
  });
});
