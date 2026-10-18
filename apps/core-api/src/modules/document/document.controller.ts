import { Request, Response } from 'express';
import { DocumentService } from './document.service';
import { NotFoundError } from '../../core/errors/app.error';

import { successResponse, paginatedResponse } from '../../utils/response.util';
import {
  RequestUploadUrlsInput,
  RegisterDocumentInput,
  SubmitManualDataInput,
  ListDocumentsQuery,
  lockPeriodSchema,
} from './document.validator';

export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // ── Pre-signed Upload URL ───────────────────────────────────────────────────
  getUploadUrl = async (req: Request, res: Response): Promise<void> => {
    const orgId = req.user!.organizationId!;
    const input = req.body as RequestUploadUrlsInput;

    const urls = await this.documentService.generateBatchUploadUrls(orgId, input.files);

    res.json(
      successResponse(urls, { requestId: req.requestId }),
    );
  };

  // ── Register Document Metadata ──────────────────────────────────────────────
  registerDocument = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;
    const input = req.body as RegisterDocumentInput;

    const doc = await this.documentService.registerDocument(userId, orgId, input);

    res.status(201).json(
      successResponse(doc, { requestId: req.requestId }),
    );
  };

  // ── Submit Manual Activity Data ──────────────────────────────────────────────
  submitManualData = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;
    const input = req.body as SubmitManualDataInput;

    const doc = await this.documentService.submitManualData(userId, orgId, input);

    res.status(201).json(
      successResponse(doc, { requestId: req.requestId }),
    );
  };

  // ── Document Queries ────────────────────────────────────────────────────────
  listDocuments = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ListDocumentsQuery;
    const result = await this.documentService.listDocuments(query);

    res.json(
      paginatedResponse(result.items, result.total, result.page, result.limit, req.requestId),
    );
  };

  getDocument = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const doc = await this.documentService.getDocumentById(id);

    res.json(
      successResponse(doc, { requestId: req.requestId }),
    );
  };

  // ── Categories Taxonomy & Period Progress ───────────────────────────────────
  listCategories = async (req: Request, res: Response): Promise<void> => {
    const categories = await this.documentService.listCategories();

    res.json(
      successResponse(categories, { requestId: req.requestId }),
    );
  };

  getPeriodProgress = async (req: Request, res: Response): Promise<void> => {
    const { id: periodId } = req.params;
    const siteId = (req.query.siteId as string) || '';

    const progress = await this.documentService.getPeriodProgress(siteId, periodId);

    res.json(
      successResponse(progress, { requestId: req.requestId }),
    );
  };

  // ── Lock / Unlock Period ───────────────────────────────────────────────────
  lockPeriod = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;
    const { id: periodId } = req.params;
    const { reason } = req.body as { reason?: string };

    const updated = await this.documentService.lockReportingPeriod(userId, orgId, periodId, reason);

    res.json(
      successResponse(updated, { requestId: req.requestId }),
    );
  };

  unlockPeriod = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;
    const { id: periodId } = req.params;
    const { reason } = req.body as { reason?: string };

    const updated = await this.documentService.unlockReportingPeriod(userId, orgId, periodId, reason);

    res.json(
      successResponse(updated, { requestId: req.requestId }),
    );
  };

  // ── List Reporting Periods ─────────────────────────────────────────────────
  listActivePeriods = async (req: Request, res: Response): Promise<void> => {
    const periods = await this.documentService.listActiveReportingPeriods();
    res.json(successResponse({ items: periods, total: periods.length }, { requestId: req.requestId }));
  };

  listAllPeriods = async (req: Request, res: Response): Promise<void> => {
    const periods = await this.documentService.listReportingPeriods();
    res.json(successResponse({ items: periods, total: periods.length }, { requestId: req.requestId }));
  };

  createPeriod = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const orgId = req.user!.organizationId!;
    const { name, startDate, endDate } = req.body;

    const period = await this.documentService.createReportingPeriod(userId, orgId, { name, startDate, endDate });

    res.status(201).json(
      successResponse(period, { requestId: req.requestId }),
    );
  };

  // ── Stream Binary Document File ─────────────────────────────────────────────
  streamDocumentFile = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const doc = await (this.documentService as any).repo.prisma.document.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!doc) throw new NotFoundError('Document');

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.vercel.app https://vercel.app http://localhost:5173 http://localhost:5174 http://localhost:3000 *");

    const fs = require('fs');
    const path = require('path');
    const localFilePath = path.join(process.cwd(), doc.fileName);
    if (fs.existsSync(localFilePath)) {
      res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
      fs.createReadStream(localFilePath).pipe(res);
      return;
    }

    // Fallback vector PDF stream
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    const PDFDocument = require('pdfkit');
    const pdf = new PDFDocument({ margin: 40 });
    pdf.pipe(res);
    pdf.fontSize(18).fillColor('#0f172a').text(doc.fileName, { align: 'center' });
    pdf.fontSize(10).fillColor('#64748b').text('Carbon OS Certified Document Stream', { align: 'center' });
    pdf.moveDown(2);
    pdf.fontSize(12).fillColor('#0f766e').text('DOCUMENT PREVIEW RECORD', { underline: true });
    pdf.fontSize(10).fillColor('#334155').text(`Document ID: ${doc.id}`);
    pdf.text(`Category: ${doc.category?.name || 'General Activity'}`);
    pdf.text(`Status: ${doc.status}`);
    pdf.end();
  };
}
