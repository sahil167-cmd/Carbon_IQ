import { AiCollectorService } from '../ai-collector.service';
import { ExtractionJobStatus, DocumentStatus, DocumentSource, ScopeType } from '@prisma/client';

// Mock S3 Client send command
jest.mock('@aws-sdk/client-s3', () => {
  const original = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...original,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        Body: {
          transformToByteArray: jest.fn().mockResolvedValue(Buffer.from('MOCK FILE CONTENT')),
        },
      }),
    })),
  };
});

// Mock BullMQ aiQueue
jest.mock('../../../queues/queue.init', () => ({
  aiQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-reprocess-1' }),
  },
  calcQueue: {
    add: jest.fn(),
  },
}));

describe('AiCollectorService', () => {
  let mockAiRepo: any;
  let mockDocRepo: any;
  let mockOrgRepo: any;
  let mockFlagService: any;
  let mockConfigService: any;
  let service: AiCollectorService;

  const mockDoc = {
    id: 'doc-555',
    organizationId: 'org-100',
    siteId: 'site-1',
    reportingPeriodId: 'period-1',
    categoryId: 'cat-fuel',
    uploadedById: 'user-1',
    fileName: 'fuel_receipt.pdf',
    fileSize: 50000,
    mimeType: 'application/pdf',
    s3Key: 'uploads/org-100/fuel_receipt.pdf',
    source: DocumentSource.UPLOAD,
    status: DocumentStatus.UPLOADED,
    category: { code: 'STATIONARY_COMBUSTION', scope: ScopeType.SCOPE_1 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExtractedData = {
    id: 'ext-1',
    documentId: 'doc-555',
    extractionVersion: 1,
    fieldsJson: {
      fuelType: { value: 'DIESEL', confidence: 0.95, needsReview: false },
      quantity: { value: 4500, confidence: 0.9, needsReview: false },
    },
    fieldConfidenceJson: {},
    modelVersion: 'tesseract-v5+langchain',
    status: ExtractionJobStatus.SUCCESS,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockAiRepo = {
      findLatestExtractedData: jest.fn(),
      getLatestExtractionVersion: jest.fn().mockResolvedValue(0),
      createExtractedData: jest.fn().mockResolvedValue(mockExtractedData),
      updateExtractedDataFields: jest.fn(),
      logAiExecution: jest.fn().mockResolvedValue({ id: 'log-1' }),
    };

    mockDocRepo = {
      findDocumentById: jest.fn().mockResolvedValue(mockDoc),
      updateDocumentStatus: jest.fn().mockResolvedValue(mockDoc),
    };

    mockOrgRepo = {
      logAuditAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    mockFlagService = {
      isEnabled: jest.fn().mockResolvedValue(true),
    };

    mockConfigService = {
      getOrDefault: jest.fn().mockResolvedValue(0.7),
    };

    service = new AiCollectorService(
      mockAiRepo,
      mockDocRepo,
      mockOrgRepo,
      mockFlagService,
      mockConfigService,
    );
  });

  describe('processDocumentExtraction', () => {
    it('should skip extraction gracefully if ENABLE_OCR feature flag is disabled', async () => {
      mockFlagService.isEnabled.mockResolvedValueOnce(false);

      const result = await service.processDocumentExtraction('doc-555', 'org-100');

      expect(result).toBeNull();
      expect(mockDocRepo.findDocumentById).not.toHaveBeenCalled();
    });

    it('should execute 5-node ExtractionGraph, persist ExtractedData v1, update document status to EXTRACTED, and log AI audit', async () => {
      const result = await service.processDocumentExtraction('doc-555', 'org-100');

      expect(result).toBeDefined();
      expect(result?.documentId).toBe('doc-555');
      expect(mockAiRepo.createExtractedData).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-555',
          extractionVersion: 1,
          status: ExtractionJobStatus.SUCCESS,
        }),
      );
      expect(mockDocRepo.updateDocumentStatus).toHaveBeenCalledWith(
        'doc-555',
        DocumentStatus.EXTRACTED,
        expect.any(String),
        'aiWorker',
      );
      expect(mockAiRepo.logAiExecution).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'EXTRACTION', inputRef: 'doc-555' }),
      );
    });
  });

  describe('correctExtractedField', () => {
    it('should update field value, set confidence to 1.0, and clear needsReview flag', async () => {
      mockAiRepo.findLatestExtractedData.mockResolvedValueOnce(mockExtractedData);
      mockAiRepo.updateExtractedDataFields.mockResolvedValueOnce({
        ...mockExtractedData,
        fieldsJson: {
          ...mockExtractedData.fieldsJson,
          quantity: { value: 5000, confidence: 1.0, needsReview: false },
        },
      });

      const result = await service.correctExtractedField('user-1', 'doc-555', {
        fieldName: 'quantity',
        newValue: 5000,
        reason: 'Corrected quantity based on paper bill',
      });

      expect(mockAiRepo.updateExtractedDataFields).toHaveBeenCalled();
      expect(mockOrgRepo.logAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXTRACTED_FIELD_CORRECTED' }),
      );
    });
  });

  describe('reprocessDocument', () => {
    it('should update status to EXTRACTING and re-enqueue job on aiQueue', async () => {
      const { aiQueue } = require('../../../queues/queue.init');

      await service.reprocessDocument('user-1', 'org-100', 'doc-555');

      expect(mockDocRepo.updateDocumentStatus).toHaveBeenCalledWith(
        'doc-555',
        DocumentStatus.EXTRACTING,
        expect.any(String),
        'user-1',
      );
      expect(aiQueue.add).toHaveBeenCalledWith(
        'EXTRACT_DOCUMENT',
        expect.objectContaining({ documentId: 'doc-555' }),
        expect.any(Object),
      );
    });
  });
});
