import { Request, Response } from 'express';
import { ValidationService } from './validation.service';
import { successResponse, paginatedResponse } from '../../utils/response.util';
import {
  ApproveDocumentInput,
  RejectDocumentInput,
  BulkApproveInput,
  ListReviewQueueQuery,
} from './validation.validator';
import { DocumentStatus } from '@prisma/client';

export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  // ── Review Queue Listing ────────────────────────────────────────────────────
  listQueue = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ListReviewQueueQuery;
    const result = await this.validationService.listReviewQueue(
      {
        siteId: query.siteId,
        reportingPeriodId: query.reportingPeriodId,
        status: query.status as DocumentStatus,
      },
      query.page,
      query.limit,
    );

    res.json(
      paginatedResponse(result.items, result.total, result.page, result.limit, req.requestId),
    );
  };

  // ── Validation Details for Document ────────────────────────────────────────
  getValidationDetails = async (req: Request, res: Response): Promise<void> => {
    const { id: documentId } = req.params;
    const results = await this.validationService.getValidationDetails(documentId);

    res.json(
      successResponse(results, { requestId: req.requestId }),
    );
  };

  // ── Human Approve ───────────────────────────────────────────────────────────
  approve = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id: documentId } = req.params;
    const { reason } = req.body as ApproveDocumentInput;

    await this.validationService.approveDocument(userId, documentId, reason);

    res.json(
      successResponse(
        { message: 'Document approved and enqueued for carbon calculation' },
        { requestId: req.requestId },
      ),
    );
  };

  // ── Human Reject ────────────────────────────────────────────────────────────
  reject = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id: documentId } = req.params;
    const { reason } = req.body as RejectDocumentInput;

    await this.validationService.rejectDocument(userId, documentId, reason);

    res.json(
      successResponse(
        { message: 'Document rejected successfully' },
        { requestId: req.requestId },
      ),
    );
  };

  // ── Bulk Approve Zero-Flag Records ──────────────────────────────────────────
  bulkApprove = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;
    const { documentIds } = req.body as BulkApproveInput;

    const result = await this.validationService.bulkApprove(userId, orgId, documentIds);

    res.json(
      successResponse(result, { requestId: req.requestId }),
    );
  };
}
