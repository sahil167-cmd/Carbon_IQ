import { ParsedDocument } from '../copilot.types';
import { createLogger } from '../../../core/logging/logger';

const logger = createLogger('DocumentParser');

/**
 * DocumentParser — Extracts plain text from supported document types.
 *
 * Supported: PDF, DOCX, CSV, XLSX, TXT
 * Preserves page numbers (PDF) and section structure (DOCX) for traceability.
 */
export class DocumentParser {

  /**
   * Parse a file buffer into structured text with page/section metadata.
   */
  async parse(buffer: Buffer, mimeType: string, filename: string): Promise<ParsedDocument> {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';

    switch (true) {
      case mimeType === 'application/pdf' || ext === 'pdf':
        return this.parsePdf(buffer);
      case mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx':
        return this.parseDocx(buffer);
      case mimeType === 'text/csv' || ext === 'csv':
        return this.parseCsv(buffer);
      case mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === 'xlsx':
        return this.parseXlsx(buffer);
      case mimeType === 'text/plain' || ext === 'txt':
        return this.parseTxt(buffer);
      default:
        throw new Error(`Unsupported document type: ${mimeType} (${ext})`);
    }
  }

  private cleanPdfText(raw: string): string {
    if (!raw) return '';
    // If text already looks clean and does not have raw stream markers, return it
    if (!raw.includes('%PDF') && !raw.includes('obj') && !raw.includes('endobj') && !raw.includes('TJ')) {
      return raw.trim();
    }

    const decodedParts: string[] = [];

    // 1. Extract and decode hex strings e.g. <4c55465448414e534120434152474f2045585052455353> -> LUFTHANSA CARGO EXPRESS
    const hexMatches = raw.matchAll(/<([0-9a-fA-F]{4,})>/g);
    for (const match of hexMatches) {
      try {
        const decoded = Buffer.from(match[1], 'hex').toString('utf-8');
        const clean = decoded.replace(/[^\x20-\x7E\t\n\r]/g, '').trim();
        if (clean.length > 0) {
          decodedParts.push(clean);
        }
      } catch {}
    }

    // 2. Extract parenthesized strings e.g. (International Cargo Air Waybill) Tj
    const parenMatches = raw.matchAll(/\(([^()]+)\)\s*T[jJ]/g);
    for (const match of parenMatches) {
      const clean = match[1].replace(/[^\x20-\x7E\t\n\r]/g, '').trim();
      if (clean.length > 0) {
        decodedParts.push(clean);
      }
    }

    if (decodedParts.length > 0) {
      return decodedParts.join(' ');
    }

    // Fallback: clean out PDF structural markers
    return raw
      .replace(/%PDF[^\n]*/g, '')
      .replace(/<<[\s\S]*?>>/g, '')
      .replace(/[0-9]+\s+[0-9]+\s+obj/g, '')
      .replace(/endobj/g, '')
      .replace(/stream[\s\S]*?endstream/g, '')
      .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async parsePdf(buffer: Buffer): Promise<ParsedDocument> {
    let rawText = '';
    let pageCount = 1;

    try {
      const pdfModule: any = await import('pdf-parse');
      const parseFn = typeof pdfModule === 'function' ? pdfModule : pdfModule.default || pdfModule;
      if (typeof parseFn === 'function') {
        const data = await parseFn(buffer);
        rawText = data.text || '';
        pageCount = data.numpages || 1;
      }
    } catch (e) {
      logger.warn({ error: (e as any).message }, 'pdf-parse import error, using native buffer decoding');
    }

    if (!rawText || rawText.trim().length === 0 || rawText.includes('%PDF')) {
      rawText = this.cleanPdfText(buffer.toString('latin1'));
    } else {
      rawText = this.cleanPdfText(rawText);
    }

    // Extract per-page text using page render events or chunking
    const pages: ParsedDocument['pages'] = [];
    const pageTexts = rawText.split(/\f|\n{4,}/);

    for (let i = 0; i < pageTexts.length; i++) {
      const text = pageTexts[i].trim();
      if (text.length > 5) {
        pages.push({ pageNumber: i + 1, text });
      }
    }

    if (pages.length === 0 && rawText.trim().length > 0) {
      pages.push({ pageNumber: 1, text: rawText.trim() });
    }

    logger.info({ pageCount, textLength: rawText.length }, 'PDF parsed and text decoded');

    return {
      text: rawText,
      pages,
      metadata: {
        pageCount: pages.length || pageCount,
      },
    };
  }

  private async parseDocx(buffer: Buffer): Promise<ParsedDocument> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // Split by headings to create pseudo-pages/sections
    const sections = text.split(/\n(?=[A-Z][A-Z\s]{5,}\n)/);
    const pages = sections.map((section, i) => ({
      pageNumber: i + 1,
      text: section.trim(),
    })).filter((p) => p.text.length > 10);

    if (pages.length === 0 && text.trim().length > 0) {
      pages.push({ pageNumber: 1, text: text.trim() });
    }

    logger.info({ sections: pages.length, textLength: text.length }, 'DOCX parsed');

    return {
      text,
      pages,
      metadata: { pageCount: pages.length },
    };
  }

  private async parseCsv(buffer: Buffer): Promise<ParsedDocument> {
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
      return { text: '', pages: [], metadata: { pageCount: 0 } };
    }

    const header = lines[0];
    const columnNames = header.split(',').map((c) => c.trim().replace(/"/g, ''));

    // Convert CSV rows into structured text summaries (not raw CSV)
    const sections: string[] = [];
    const ROWS_PER_SECTION = 25;

    for (let i = 1; i < lines.length; i += ROWS_PER_SECTION) {
      const chunk = lines.slice(i, i + ROWS_PER_SECTION);
      const textRows = chunk.map((row) => {
        const values = row.split(',').map((v) => v.trim().replace(/"/g, ''));
        return columnNames.map((col, idx) => `${col}: ${values[idx] ?? ''}`).join(' | ');
      });
      sections.push(`Columns: ${columnNames.join(', ')}\n\n${textRows.join('\n')}`);
    }

    const fullText = sections.join('\n\n---\n\n');
    const pages = sections.map((s, i) => ({
      pageNumber: i + 1,
      text: s,
    }));

    logger.info({ rows: lines.length - 1, columns: columnNames.length }, 'CSV parsed');

    return {
      text: fullText,
      pages,
      metadata: { pageCount: pages.length },
    };
  }

  private async parseXlsx(buffer: Buffer): Promise<ParsedDocument> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sections: { pageNumber: number; text: string }[] = [];
    let fullText = '';

    for (let sheetIdx = 0; sheetIdx < workbook.SheetNames.length; sheetIdx++) {
      const sheetName = workbook.SheetNames[sheetIdx];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const ROWS_PER_SECTION = 25;

      for (let i = 0; i < rows.length; i += ROWS_PER_SECTION) {
        const chunk = rows.slice(i, i + ROWS_PER_SECTION);
        const textRows = chunk.map((row) =>
          columns.map((col) => `${col}: ${row[col] ?? ''}`).join(' | '),
        );
        const sectionText = `Sheet: ${sheetName}\nColumns: ${columns.join(', ')}\n\n${textRows.join('\n')}`;
        sections.push({ pageNumber: sections.length + 1, text: sectionText });
        fullText += sectionText + '\n\n---\n\n';
      }
    }

    logger.info({ sheets: workbook.SheetNames.length, sections: sections.length }, 'XLSX parsed');

    return {
      text: fullText,
      pages: sections,
      metadata: { pageCount: sections.length },
    };
  }

  private async parseTxt(buffer: Buffer): Promise<ParsedDocument> {
    const text = buffer.toString('utf-8');
    return {
      text,
      pages: [{ pageNumber: 1, text }],
      metadata: { pageCount: 1 },
    };
  }
}
