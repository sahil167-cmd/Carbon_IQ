import { ValidationService } from '../validation.service';
import { ValidationLayer, ValidationStatus, DocumentStatus, ScopeType, DocumentSource } from '@prisma/client';
import { ValidationError } from '../../../core/errors/app.error';

// Mock BullMQ queues
jest.mock('../../../queues/queue.init', () => ({
  aiQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-l3-1' }),
  },
  calcQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-calc-1' }),
  },
}));

describe('ValidationService', () => {
  let mockValRepo: any;
  let mockDocRepo: any;
  let mockAiRepo: any;
  let mockOrgRepo: any;
  let mockFlagService: any;
  let service: ValidationService;

  const mockDoc = {
    id: 'doc-777',
    organizationId: 'org-100',
    siteId: 'site-1',
    reportingPeriodId: 'period-1',
    categoryId: 'cat-elec',
    uploadedById: 'user-1',
    fileName: 'electricity_bill.pdf',
    fileSize: 25000,
    mimeType: 'application/pdf',
    s3Key: 'uploads/org-100/electricity_bill.pdf',
    source: DocumentSource.UPLOAD,
    status: DocumentStatus.EXTRACTED,
    category: { code: 'ELECTRICITY', scope: ScopeType.SCOPE_2 },
    site: { name: 'Detroit Plant' },
    reportingPeriod: { name: 'CY 2025' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExtractedData = {
    id: 'ext-1',
    documentId: 'doc-777',
    extractionVersion: 1,
    version: 1,
    fieldsJson: {
      kwhConsumed: { value: 12500, confidence: 0.95, needsReview: false },
    },
  };

  beforeEach(() => {
    mockValRepo = {
      createValidationResult: jest.fn().mockResolvedValue({ id: 'res-1' }),
      getValidationResultsForDocument: jest.fn().mockResolvedValue([]),
      listReviewQueue: jest.fn().mockResolvedValue({ items: [mockDoc], total: 1 }),
      createReviewAction: jest.fn().mockResolvedValue({ id: 'act-1' }),
    };

    mockDocRepo = {
      findDocumentById: jest.fn().mockResolvedValue(mockDoc),
      updateDocumentStatus: jest.fn().mockResolvedValue(mockDoc),
    };

    mockAiRepo = {
      findLatestExtractedData: jest.fn().mockResolvedValue(mockExtractedData),
    };

    mockOrgRepo = {
      logAuditAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    mockFlagService = {
      isEnabled: jest.fn().mockResolvedValue(true),
    };

    service = new ValidationService(
      mockValRepo,
      mockDocRepo,
      mockAiRepo,
      mockOrgRepo,
      mockFlagService,
    );
  });

  describe('runLayer1And2Validation', () => {
    it('should run Layer 1 & 2 checks, save results, and enqueue Layer 3 on ai-queue', async () => {
      const { aiQueue } = require('../../../queues/queue.init');

      const issues = await service.runLayer1And2Validation('doc-777', 'org-100');

      expect(mockValRepo.createValidationResult).toHaveBeenCalledTimes(2); // Layer 1 and Layer 2
      expect(aiQueue.add).toHaveBeenCalledWith(
        'VALIDATE_LAYER3',
        expect.objectContaining({ documentId: 'doc-777' }),
        expect.any(Object),
      );
    });

    it('should flag HARD_BLOCK error when required field is missing in Layer 1', async () => {
      mockAiRepo.findLatestExtractedData.mockResolvedValueOnce({
        id: 'ext-1',
        fieldsJson: {}, // Missing kwhConsumed for ELECTRICITY
      });

      const issues = await service.runLayer1And2Validation('doc-777', 'org-100');

      expect(issues.some((i) => i.code === 'MISSING_REQUIRED_FIELD' && i.severity === 'HARD_BLOCK')).toBe(true);
      expect(mockDocRepo.updateDocumentStatus).toHaveBeenCalledWith(
        'doc-777',
        DocumentStatus.NEEDS_REVIEW,
        expect.any(String),
      );
    });
  });

  describe('approveDocument', () => {
    it('should throw ValidationError if document has unhandled Layer 1 HARD_BLOCK errors', async () => {
      mockValRepo.getValidationResultsForDocument.mockResolvedValueOnce([
        {
          id: 'res-1',
          layer: ValidationLayer.LAYER_1,
          issuesJson: [
            { code: 'MISSING_REQUIRED_FIELD', severity: 'HARD_BLOCK', layer: ValidationLayer.LAYER_1 },
          ],
        },
      ]);

      await expect(service.approveDocument('user-1', 'doc-777')).rejects.toThrow(ValidationError);
    });

    it('should update status to APPROVED, record ReviewAction, and enqueue calc-queue on valid approval', async () => {
      const { calcQueue } = require('../../../queues/queue.init');
      mockValRepo.getValidationResultsForDocument.mockResolvedValueOnce([]);

      await service.approveDocument('user-1', 'doc-777', 'Verified utility bill against meter');

      expect(mockDocRepo.updateDocumentStatus).toHaveBeenCalledWith(
        'doc-777',
        DocumentStatus.APPROVED,
        'Verified utility bill against meter',
        'user-1',
      );
      expect(mockValRepo.createReviewAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'APPROVE', performedById: 'user-1' }),
      );
      expect(calcQueue.add).toHaveBeenCalledWith(
        'CALCULATE_RECORD',
        expect.objectContaining({ documentId: 'doc-777' }),
        expect.any(Object),
      );
    });
  });

  describe('rejectDocument', () => {
    it('should throw ValidationError if rejection reason is less than 10 characters', async () => {
      await expect(service.rejectDocument('user-1', 'doc-777', 'Bad file')).rejects.toThrow(ValidationError);
    });

    it('should update status to REJECTED and record ReviewAction when reason is at least 10 chars', async () => {
      await service.rejectDocument('user-1', 'doc-777', 'Unreadable blurred scan provided');

      expect(mockDocRepo.updateDocumentStatus).toHaveBeenCalledWith(
        'doc-777',
        DocumentStatus.REJECTED,
        'Unreadable blurred scan provided',
        'user-1',
      );
      expect(mockValRepo.createReviewAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REJECT', performedById: 'user-1' }),
      );
    });
  });
});
