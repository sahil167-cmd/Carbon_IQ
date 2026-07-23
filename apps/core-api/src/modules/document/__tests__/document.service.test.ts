import { DocumentService } from '../document.service';
import { DocumentStatus, ReportingPeriodStatus, DocumentSource, ScopeType } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../../core/errors/app.error';

// Mock BullMQ aiQueue
jest.mock('../../../queues/queue.init', () => ({
  aiQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  },
  calcQueue: {
    add: jest.fn(),
  },
}));

describe('DocumentService', () => {
  let mockDocRepo: any;
  let mockOrgRepo: any;
  let service: DocumentService;

  const mockPeriod = {
    id: 'period-1',
    organizationId: 'org-100',
    status: ReportingPeriodStatus.OPEN,
  };

  const mockCategory = {
    id: 'cat-elec',
    code: 'ELECTRICITY',
    name: 'Purchased Electricity',
    scope: ScopeType.SCOPE_2,
    requiredByDefault: true,
  };

  const mockDoc = {
    id: 'doc-100',
    organizationId: 'org-100',
    siteId: 'site-1',
    reportingPeriodId: 'period-1',
    categoryId: 'cat-elec',
    uploadedById: 'user-1',
    fileName: 'jan_electricity_bill.pdf',
    fileSize: 1048576,
    mimeType: 'application/pdf',
    s3Key: 'uploads/org-100/123456_jan_electricity_bill.pdf',
    source: DocumentSource.UPLOAD,
    status: DocumentStatus.UPLOADED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockDocRepo = {
      findReportingPeriodById: jest.fn(),
      findCategoryById: jest.fn(),
      createUploadedDocument: jest.fn(),
      createManualDocument: jest.fn(),
      findDocumentById: jest.fn(),
      listDocuments: jest.fn(),
      listCategories: jest.fn(),
      getApprovedCategoriesCount: jest.fn(),
      updateReportingPeriodStatus: jest.fn(),
    };

    mockOrgRepo = {
      logAuditAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new DocumentService(mockDocRepo, mockOrgRepo);
  });

  describe('generateUploadUrl', () => {
    it('should generate an S3 pre-signed upload PUT URL', async () => {
      const result = await service.generateUploadUrl('org-100', {
        fileName: 'invoice.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
      });

      expect(result.uploadUrl).toBeDefined();
      expect(result.s3Key).toContain('uploads/org-100/');
      expect(result.expiresInSeconds).toBe(300);
    });
  });

  describe('registerDocument', () => {
    it('should throw ConflictError with PERIOD_LOCKED if reporting period is locked', async () => {
      mockDocRepo.findReportingPeriodById.mockResolvedValueOnce({
        ...mockPeriod,
        status: ReportingPeriodStatus.LOCKED,
      });

      await expect(
        service.registerDocument('user-1', 'org-100', {
          siteId: 'site-1',
          reportingPeriodId: 'period-1',
          categoryId: 'cat-elec',
          fileName: 'bill.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          s3Key: 'uploads/org-100/bill.pdf',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should register uploaded document and enqueue extraction job on aiQueue', async () => {
      const { aiQueue } = require('../../../queues/queue.init');
      mockDocRepo.findReportingPeriodById.mockResolvedValueOnce(mockPeriod);
      mockDocRepo.findCategoryById.mockResolvedValueOnce(mockCategory);
      mockDocRepo.createUploadedDocument.mockResolvedValueOnce(mockDoc);

      const result = await service.registerDocument('user-1', 'org-100', {
        siteId: 'site-1',
        reportingPeriodId: 'period-1',
        categoryId: 'cat-elec',
        fileName: 'jan_electricity_bill.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        s3Key: 'uploads/org-100/123456_jan_electricity_bill.pdf',
      });

      expect(result.id).toBe('doc-100');
      expect(mockDocRepo.createUploadedDocument).toHaveBeenCalled();
      expect(aiQueue.add).toHaveBeenCalledWith(
        'EXTRACT_DOCUMENT',
        expect.objectContaining({ documentId: 'doc-100' }),
        expect.any(Object),
      );
      expect(mockOrgRepo.logAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DOCUMENT_UPLOADED' }),
      );
    });
  });

  describe('submitManualData', () => {
    it('should create manual document with source=MANUAL and status=EXTRACTED', async () => {
      mockDocRepo.findReportingPeriodById.mockResolvedValueOnce(mockPeriod);
      mockDocRepo.createManualDocument.mockResolvedValueOnce({
        ...mockDoc,
        source: DocumentSource.MANUAL,
        status: DocumentStatus.EXTRACTED,
      });

      const result = await service.submitManualData('user-1', 'org-100', {
        siteId: 'site-1',
        reportingPeriodId: 'period-1',
        categoryId: 'cat-elec',
        manualData: { kwh_consumed: 15000, billing_period: '2025-01' },
      });

      expect(result.source).toBe(DocumentSource.MANUAL);
      expect(result.status).toBe(DocumentStatus.EXTRACTED);
      expect(mockOrgRepo.logAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MANUAL_ACTIVITY_DATA_SUBMITTED' }),
      );
    });
  });

  describe('getPeriodProgress', () => {
    it('should calculate category completion percentage and missing category codes', async () => {
      mockDocRepo.listCategories.mockResolvedValueOnce([
        { id: 'cat-1', code: 'STATIONARY_COMBUSTION', requiredByDefault: false },
        { id: 'cat-2', code: 'ELECTRICITY', requiredByDefault: true },
        { id: 'cat-3', code: 'UPSTREAM_TRANSPORT', requiredByDefault: true },
      ]);

      // Only Electricity is approved
      mockDocRepo.getApprovedCategoriesCount.mockResolvedValueOnce(['cat-2']);

      const progress = await service.getPeriodProgress('site-1', 'period-1');

      expect(progress.requiredCategories).toBe(2);
      expect(progress.requiredCompleted).toBe(1);
      expect(progress.percentComplete).toBe(50);
      expect(progress.isReadyForCalculation).toBe(false);
      expect(progress.missingCategoryCodes).toEqual(['UPSTREAM_TRANSPORT']);
    });
  });
});
