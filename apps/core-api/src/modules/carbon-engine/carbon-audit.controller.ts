import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../core/errors/app.error';

export class CarbonAuditController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /api/v1/carbon/audit/:documentId
   * Returns the machine-readable provenance trace from document to verified ledger entry.
   */
  public getAuditTrail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { documentId } = req.params;
      const orgId = req.user?.organizationId;

      const doc = await this.prisma.document.findFirst({
        where: { id: documentId, ...(orgId ? { organizationId: orgId } : {}) },
        include: {
          category: true,
          extractedData: { orderBy: { extractionVersion: 'desc' }, take: 1 },
          calculatedEmissions: {
            include: {
              emissionFactor: true,
              calculationLogs: true,
            },
          },
        },
      });

      if (!doc) {
        throw new NotFoundError(`Document ${documentId} not found in audit registry`);
      }

      const extracted = doc.extractedData[0];
      const calculation = doc.calculatedEmissions[0];
      const factor = calculation?.emissionFactor;
      const log = calculation?.calculationLogs[0];

      const auditTrace = {
        document: {
          id: doc.id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          status: doc.status,
          uploadedAt: doc.createdAt,
          assignedCategory: doc.category.name,
          categoryCode: doc.category.code,
        },
        ocrAndExtraction: {
          modelVersion: extracted?.modelVersion || 'native_pdf_stream',
          extractionStatus: extracted?.status || 'NOT_RUN',
          extractedFields: extracted?.fieldsJson || {},
          confidenceScores: extracted?.fieldConfidenceJson || {},
          extractedAt: extracted?.createdAt,
        },
        activitySemantics: {
          rawActivityValue: calculation?.rawActivityValue ?? calculation?.activityValue,
          rawActivityUnit: calculation?.rawActivityUnit ?? calculation?.activityUnit,
          normalizedQuantity: calculation?.normalizedActivityVal ?? calculation?.activityValue,
          normalizedUnit: calculation?.normalizedActivityUnit ?? calculation?.activityUnit,
          calculationMethod: calculation?.calculationMethod,
        },
        emissionFactorProvenance: factor
          ? {
              factorId: factor.id,
              factorValue: factor.factorValue,
              factorUnit: factor.unit,
              sourceOrganization: factor.sourceSet,
              reportingYear: factor.year || '2024',
              category: factor.category,
              subCategory: factor.subCategory,
              geography: factor.region,
              gwpBasis: factor.gwpBasis || 'IPCC_AR6_100Y',
              methodology: factor.methodology || 'ACTIVITY_BASED',
              citation: factor.citation || `${factor.sourceSet} Official GHG Conversion Table`,
            }
          : null,
        calculationExecution: {
          formulaUsed: log?.formulaUsed || calculation?.formulaUsed || 'N/A',
          formulaVersion: log?.formulaVersion || 'v1.0',
          co2eKg: calculation?.co2e,
          co2eTonnes: calculation ? (calculation.co2e / 1000).toFixed(4) : null,
          co2eLocation: calculation?.co2eLocation,
          co2eMarket: calculation?.co2eMarket,
          calculatedAt: calculation?.createdAt,
        },
        validationAndLedger: {
          validationStatus: calculation?.validationStatus || 'PENDING',
          overallConfidence: calculation?.overallConfidence ?? 1.0,
          reviewReasons: calculation?.reviewReasons || [],
          isLedgerVerified: calculation?.validationStatus === 'VERIFIED',
        },
      };

      res.status(200).json({
        success: true,
        data: auditTrace,
      });
    } catch (err) {
      next(err);
    }
  };
}
