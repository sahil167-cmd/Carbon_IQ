import { ConfigService } from '../config.service';

describe('ConfigService', () => {
  let mockPrisma: any;
  let configService: ConfigService;

  beforeEach(() => {
    mockPrisma = {
      configEntry: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };
    configService = new ConfigService(mockPrisma);
  });

  it('should return cached value on subsequent get calls within TTL', async () => {
    mockPrisma.configEntry.findUnique.mockResolvedValueOnce({
      key: 'AI_CONFIDENCE_THRESHOLD',
      valueJson: 0.7,
    });

    const val1 = await configService.get<number>('AI_CONFIDENCE_THRESHOLD');
    const val2 = await configService.get<number>('AI_CONFIDENCE_THRESHOLD');

    expect(val1).toBe(0.7);
    expect(val2).toBe(0.7);
    // Prisma findUnique should only be called ONCE due to 60-second caching
    expect(mockPrisma.configEntry.findUnique).toHaveBeenCalledTimes(1);
  });

  it('should fall back to default when key is not found', async () => {
    mockPrisma.configEntry.findUnique.mockResolvedValueOnce(null);

    const val = await configService.getOrDefault<number>('NON_EXISTENT_KEY', 42);

    expect(val).toBe(42);
  });

  it('should invalidate cache when set() is called', async () => {
    mockPrisma.configEntry.findUnique.mockResolvedValue({
      key: 'AI_CONFIDENCE_THRESHOLD',
      valueJson: 0.7,
    });

    await configService.get('AI_CONFIDENCE_THRESHOLD');

    // Update config
    await configService.set('AI_CONFIDENCE_THRESHOLD', 0.85, 'admin-user-id');

    expect(mockPrisma.configEntry.upsert).toHaveBeenCalled();

    // Clear and mock new DB value
    mockPrisma.configEntry.findUnique.mockResolvedValueOnce({
      key: 'AI_CONFIDENCE_THRESHOLD',
      valueJson: 0.85,
    });

    const updatedVal = await configService.get('AI_CONFIDENCE_THRESHOLD');
    expect(updatedVal).toBe(0.85);
  });
});
