import * as crypto from 'crypto';
import { DocumentParser } from './document-parser';
import { chunkDocument } from './chunker';
import { generateEmbeddings, getEmbeddingModel } from './embedder';
import { CopilotRepository } from '../copilot.repository';
import { IngestionResult } from '../copilot.types';
import { createLogger } from '../../../core/logging/logger';

const logger = createLogger('IngestionService');

export class IngestionService {
  private readonly parser: DocumentParser;

  constructor(private readonly repo: CopilotRepository) {
    this.parser = new DocumentParser();
  }

  /**
   * Ingest a document buffer into the RAG vector corpus.
   * Steps:
   * 1. Checksum hash for deduplication
   * 2. Parse text/pages from document buffer
   * 3. Token-aware semantic chunking
   * 4. Batch vector embedding generation
   * 5. Store document record and chunk embeddings in pgvector
   * 6. Mark document status as READY
   */
  async ingestDocument(params: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    organizationId?: string;
    uploadedById?: string;
    sourceDocumentId?: string;
  }): Promise<IngestionResult> {
    const { buffer, filename, mimeType, organizationId, uploadedById, sourceDocumentId } = params;

    // 1. Compute SHA-256 Checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // Check duplicate
    const existing = await this.repo.findKbDocumentByChecksum(checksum, organizationId);
    if (existing) {
      logger.info({ filename, checksum, existingDocId: existing.id }, 'Document already ingested and ready');
      return {
        documentId: existing.id,
        filename,
        status: 'READY',
        chunksCreated: 0,
        totalTokens: existing.tokenCount || 0,
      };
    }

    const documentType = filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';

    // 2. Create initial KbDocument record
    const kbDoc = await this.repo.createKbDocument({
      organizationId,
      uploadedById,
      sourceDocumentId,
      filename,
      documentType,
      mimeType,
      checksum,
    });

    try {
      await this.repo.updateKbDocumentStatus(kbDoc.id, 'PROCESSING');

      // 3. Extract text and pages
      const parsed = await this.parser.parse(buffer, mimeType, filename);
      if (!parsed.text || parsed.text.trim().length === 0) {
        throw new Error('No readable text could be extracted from document');
      }

      // 4. Token-aware chunking
      const chunks = chunkDocument(parsed);
      if (chunks.length === 0) {
        throw new Error('Document produced 0 chunks after splitting');
      }

      // Enrich first chunk with structured metadata if available
      if (sourceDocumentId) {
        try {
          const docRecord = await this.repo.findDocumentWithFields(sourceDocumentId);
          if (docRecord) {
            let structuredHeader = `DOCUMENT: ${filename}\nCATEGORY: ${docRecord.category?.name || 'General'} (${docRecord.category?.scope || 'ALL'})\n`;
            if (docRecord.calculatedEmissions?.[0]) {
              const ce = docRecord.calculatedEmissions[0];
              structuredHeader += `CALCULATED_EMISSIONS: ${ce.co2e} kg CO2e (${(ce.co2e / 1000).toFixed(2)} t CO2e)\n`;
            }
            const ed = docRecord.extractedData?.[0]?.fieldsJson;
            if (ed && typeof ed === 'object') {
              structuredHeader += 'EXTRACTED_FIELDS:\n';
              for (const [k, v] of Object.entries(ed)) {
                const val = typeof v === 'object' && v !== null ? (v as any).value : v;
                structuredHeader += `- ${k}: ${val}\n`;
              }
            }
            chunks[0].chunkText = structuredHeader + '\n' + chunks[0].chunkText;
          }
        } catch (enrichErr: any) {
          logger.warn({ error: enrichErr.message }, 'Could not enrich chunk with document fields');
        }
      }

      const totalTokens = chunks.reduce((acc, c) => acc + c.tokenCount, 0);

      // 5. Generate embeddings
      const chunkTexts = chunks.map((c) => c.chunkText);
      const embeddings = await generateEmbeddings(chunkTexts);

      // 6. Store chunks in database
      const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        tokenCount: chunk.tokenCount,
        pageNumber: chunk.pageNumber,
        sectionTitle: chunk.sectionTitle,
        embedding: embeddings[idx],
      }));

      await this.repo.createChunks(kbDoc.id, organizationId || null, chunksWithEmbeddings);

      // 7. Update status to READY
      await this.repo.updateKbDocumentStatus(kbDoc.id, 'READY', {
        pageCount: parsed.metadata.pageCount || parsed.pages.length,
        tokenCount: totalTokens,
      });

      logger.info(
        {
          kbDocId: kbDoc.id,
          filename,
          chunksCount: chunks.length,
          totalTokens,
          model: getEmbeddingModel(),
        },
        'Knowledge base document ingested successfully',
      );

      return {
        documentId: kbDoc.id,
        filename,
        status: 'READY',
        chunksCreated: chunks.length,
        totalTokens,
      };
    } catch (err: any) {
      logger.error({ kbDocId: kbDoc.id, filename, error: err.message }, 'Failed to ingest document into RAG corpus');
      await this.repo.updateKbDocumentStatus(kbDoc.id, 'FAILED', {
        errorMessage: err.message,
      });
      return {
        documentId: kbDoc.id,
        filename,
        status: 'FAILED',
        chunksCreated: 0,
        totalTokens: 0,
        errorMessage: err.message,
      };
    }
  }
}
