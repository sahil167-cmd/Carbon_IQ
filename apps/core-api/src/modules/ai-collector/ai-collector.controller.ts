import { Request, Response } from 'express';
import { AiCollectorService } from './ai-collector.service';
import { successResponse } from '../../utils/response.util';
import { PatchExtractedFieldInput, ReprocessDocumentInput, InternalExtractInput } from './ai-collector.validator';

export class AiCollectorController {
  constructor(private readonly aiService: AiCollectorService) {}

  // ── Service-to-Service Internal Trigger ────────────────────────────────────
  triggerInternalExtract = async (req: Request, res: Response): Promise<void> => {
    const { documentId, organizationId } = req.body as InternalExtractInput;
    const result = await this.aiService.processDocumentExtraction(documentId, organizationId);

    res.json(
      successResponse(result, { requestId: req.requestId }),
    );
  };

  // ── Fetch Extracted Data ───────────────────────────────────────────────────
  getExtraction = async (req: Request, res: Response): Promise<void> => {
    const { id: documentId } = req.params;
    const result = await this.aiService.getExtractedData(documentId);

    res.json(
      successResponse(result, { requestId: req.requestId }),
    );
  };

  // ── Manual Field Correction ────────────────────────────────────────────────
  correctField = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id: documentId } = req.params;
    const input = req.body as PatchExtractedFieldInput;

    const result = await this.aiService.correctExtractedField(userId, documentId, input);

    res.json(
      successResponse(result, { requestId: req.requestId }),
    );
  };

  // ── Reprocess Document Trigger ─────────────────────────────────────────────
  reprocess = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;
    const { id: documentId } = req.params;

    await this.aiService.reprocessDocument(userId, orgId, documentId);

    res.json(
      successResponse(
        { message: 'Document reprocessing enqueued successfully' },
        { requestId: req.requestId },
      ),
    );
  };
}
