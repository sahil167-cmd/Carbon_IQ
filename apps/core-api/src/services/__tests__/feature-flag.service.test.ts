import { FeatureFlagService, FLAG_KEYS } from '../feature-flag.service';
import { UnprocessableError } from '../../core/errors/app.error';

describe('FeatureFlagService', () => {
  let mockPrisma: any;
  let flagService: FeatureFlagService;

  beforeEach(() => {
    mockPrisma = {
      featureFlag: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
    };
    flagService = new FeatureFlagService(mockPrisma);
  });

  it('should resolve GLOBAL flag when no ORG flag exists', async () => {
    mockPrisma.featureFlag.findFirst.mockResolvedValueOnce({
      key: FLAG_KEYS.ENABLE_FORECAST,
      isEnabled: true,
      scope: 'GLOBAL',
    });

    const isEnabled = await flagService.isEnabled(FLAG_KEYS.ENABLE_FORECAST);
    expect(isEnabled).toBe(true);
  });

  it('should prioritize ORG-scoped flag over GLOBAL flag', async () => {
    // Mock ORG check: disabled for specific org
    mockPrisma.featureFlag.findFirst.mockResolvedValueOnce({
      key: FLAG_KEYS.ENABLE_FORECAST,
      isEnabled: false,
      scope: 'ORG',
      organizationId: 'org-beta',
    });

    const isEnabled = await flagService.isEnabled(FLAG_KEYS.ENABLE_FORECAST, 'org-beta');
    expect(isEnabled).toBe(false);
  });

  it('should throw UnprocessableError when requireEnabled() encounters a disabled flag', async () => {
    mockPrisma.featureFlag.findFirst.mockResolvedValueOnce({
      key: FLAG_KEYS.ENABLE_RAG,
      isEnabled: false,
      scope: 'GLOBAL',
    });

    await expect(flagService.requireEnabled(FLAG_KEYS.ENABLE_RAG)).rejects.toThrow(UnprocessableError);
  });
});
