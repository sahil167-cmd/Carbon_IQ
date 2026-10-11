import { Request, Response, NextFunction } from 'express';
import { BRSRService } from './brsr.service';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { createBrsrReportSchema, updateBrsrReportSchema } from './brsr.validator';
import { UnauthorizedError } from '../../core/errors/app.error';

/**
 * BRSRController
 * Express REST Controller handling BRSR compliance report API endpoints.
 */
export class BRSRController {
  private getService() {
    const prisma = getPrismaClient();
    return new BRSRService(prisma);
  }

  listReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new UnauthorizedError('Organization context missing');

      const service = this.getService();
      const reports = await service.listReports(orgId);

      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (err) {
      next(err);
    }
  };

  createReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw new UnauthorizedError('User authentication context missing');

      const parsed = createBrsrReportSchema.parse(req.body);
      const service = this.getService();

      const report = await service.createReportDraft({
        organizationId: orgId,
        userId,
        financialYear: parsed.financialYear,
        reportingPeriodId: parsed.reportingPeriodId,
        boundary: parsed.boundary,
      });

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  };

  getReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new UnauthorizedError('Organization context missing');

      const { id } = req.params;
      const service = this.getService();
      const report = await service.getReportById(id, orgId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  };

  updateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new UnauthorizedError('Organization context missing');

      const { id } = req.params;
      const parsed = updateBrsrReportSchema.parse(req.body);
      const service = this.getService();

      const updated = await service.updateReport(id, orgId, parsed);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  syncCarbon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new UnauthorizedError('Organization context missing');

      const { id } = req.params;
      const service = this.getService();

      const updated = await service.syncCarbonMetrics(id, orgId);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  generatePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) throw new UnauthorizedError('Organization context missing');

      const { id } = req.params;
      const service = this.getService();

      const { pdfBuffer, financialYear, version } = await service.generateReportPdf(id, orgId);

      const safeFy = financialYear.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `BRSR_Report_${safeFy}_v${version}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  };
}
