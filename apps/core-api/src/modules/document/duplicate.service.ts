import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('DuplicateService');

export interface DuplicateCheckInput {
  organizationId: string;
  documentId: string;
  fileBuffer: Buffer;
  invoiceNumber?: string;
  supplierName?: string;
  invoiceDate?: Date;
  totalAmount?: number;
  quantity?: number;
  unit?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType?: 'EXACT_SHA256' | 'FUZZY_METADATA';
  existingDocumentId?: string;
  existingSha256?: string;
  reason?: string;
}

export class DuplicateService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Compute SHA-256 hash of file buffer */
  public computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check for duplicate document within organization using exact SHA-256 file hash
   * and fuzzy metadata matching (invoice #, supplier, date, total amount, quantity).
   * Does NOT delete historical records automatically.
   */
  public async checkForDuplicates(input: DuplicateCheckInput): Promise<DuplicateCheckResult> {
    const sha256 = this.computeSha256(input.fileBuffer);

    // 1. Exact SHA-256 duplicate check
    const exactMatch = await this.prisma.documentFingerprint.findUnique({
      where: { sha256Hash: sha256 },
      include: { document: true },
    });

    if (exactMatch && exactMatch.organizationId === input.organizationId) {
      logger.warn(
        { documentId: input.documentId, existingDocumentId: exactMatch.documentId, sha256 },
        'Exact SHA-256 duplicate file detected'
      );
      return {
        isDuplicate: true,
        duplicateType: 'EXACT_SHA256',
        existingDocumentId: exactMatch.documentId,
        existingSha256: sha256,
        reason: `Exact duplicate file content matching document ${exactMatch.document.fileName} (Uploaded: ${exactMatch.createdAt.toISOString()})`,
      };
    }

    // 2. Fuzzy metadata check (Supplier + Invoice Number + Date / Amount)
    if (input.supplierName && input.invoiceNumber) {
      const fuzzyMatch = await this.prisma.documentFingerprint.findFirst({
        where: {
          organizationId: input.organizationId,
          supplierName: { equals: input.supplierName, mode: 'insensitive' },
          invoiceNumber: { equals: input.invoiceNumber, mode: 'insensitive' },
          documentId: { not: input.documentId },
        },
        include: { document: true },
      });

      if (fuzzyMatch) {
        logger.warn(
          { documentId: input.documentId, existingDocumentId: fuzzyMatch.documentId, supplier: input.supplierName, invoiceNumber: input.invoiceNumber },
          'Fuzzy metadata duplicate invoice detected'
        );
        return {
          isDuplicate: true,
          duplicateType: 'FUZZY_METADATA',
          existingDocumentId: fuzzyMatch.documentId,
          reason: `Duplicate invoice number "${input.invoiceNumber}" from supplier "${input.supplierName}" already recorded in document ${fuzzyMatch.document.fileName}`,
        };
      }
    }

    // Save/update fingerprint for current document
    try {
      await this.prisma.documentFingerprint.upsert({
        where: { sha256Hash: sha256 },
        create: {
          organizationId: input.organizationId,
          documentId: input.documentId,
          sha256Hash: sha256,
          invoiceNumber: input.invoiceNumber,
          supplierName: input.supplierName,
          invoiceDate: input.invoiceDate,
          totalAmount: input.totalAmount,
          quantity: input.quantity,
          unit: input.unit,
        },
        update: {
          invoiceNumber: input.invoiceNumber || undefined,
          supplierName: input.supplierName || undefined,
          invoiceDate: input.invoiceDate || undefined,
          totalAmount: input.totalAmount || undefined,
          quantity: input.quantity || undefined,
          unit: input.unit || undefined,
        },
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Failed to persist document fingerprint (continuing)');
    }

    return { isDuplicate: false };
  }
}
