import { DocumentChunk, ParsedDocument } from '../copilot.types';
import { createLogger } from '../../../core/logging/logger';

const logger = createLogger('Chunker');

/**
 * Token-Aware Chunker — Splits documents into semantic chunks for embedding.
 *
 * Rules:
 * - Target: 500–800 tokens per chunk
 * - Overlap: ~15% (75–120 tokens)
 * - Preserves semantic boundaries: headings, paragraphs, tables, bullet groups
 * - Stores chunk_index, token_count, page_number, section_title for traceability
 */

// Approximate token count: ~4 chars per token for English text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const TARGET_CHUNK_TOKENS = 600;
const MAX_CHUNK_TOKENS = 800;
const MIN_CHUNK_TOKENS = 100;
const OVERLAP_TOKENS = 90; // ~15% of 600

/**
 * Split text into semantic paragraphs/sections.
 */
function splitIntoSections(text: string): string[] {
  // Split on double newlines, headings, horizontal rules, etc.
  const rawSections = text.split(/\n{2,}|(?=^#{1,3}\s)/m);
  return rawSections
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Detect if a text line is a heading/section title.
 */
function extractSectionTitle(text: string): string | undefined {
  const lines = text.split('\n');
  const first = lines[0]?.trim();
  if (!first) return undefined;

  // Markdown heading
  if (/^#{1,3}\s/.test(first)) return first.replace(/^#{1,3}\s*/, '');
  // ALL CAPS heading (>5 chars, <80 chars)
  if (first.length > 5 && first.length < 80 && first === first.toUpperCase() && /[A-Z]/.test(first)) return first;

  return undefined;
}

/**
 * Chunk a parsed document into semantically aware chunks with overlap.
 */
export function chunkDocument(parsed: ParsedDocument): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  // Process page by page to preserve page number metadata
  for (const page of parsed.pages) {
    const sections = splitIntoSections(page.text);
    let currentChunkText = '';
    let currentSectionTitle: string | undefined;

    for (const section of sections) {
      const sectionTitle = extractSectionTitle(section);
      if (sectionTitle) currentSectionTitle = sectionTitle;

      const sectionTokens = estimateTokens(section);
      const currentTokens = estimateTokens(currentChunkText);

      // If adding this section would exceed max, finalize current chunk
      if (currentTokens > 0 && currentTokens + sectionTokens > MAX_CHUNK_TOKENS) {
        if (currentTokens >= MIN_CHUNK_TOKENS) {
          chunks.push({
            chunkIndex: chunkIndex++,
            chunkText: currentChunkText.trim(),
            tokenCount: estimateTokens(currentChunkText),
            pageNumber: page.pageNumber,
            sectionTitle: currentSectionTitle,
          });
        }

        // Start new chunk with overlap from previous
        const overlapText = getOverlapText(currentChunkText, OVERLAP_TOKENS);
        currentChunkText = overlapText + '\n\n' + section;
      } else {
        currentChunkText += (currentChunkText ? '\n\n' : '') + section;
      }

      // If a single section is very large, split it further
      if (sectionTokens > MAX_CHUNK_TOKENS && currentTokens === 0) {
        const subChunks = splitLargeSection(section, page.pageNumber, currentSectionTitle, chunkIndex);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
        currentChunkText = '';
      }
    }

    // Finalize remaining text for this page
    if (currentChunkText.trim().length > 0) {
      chunks.push({
        chunkIndex: chunkIndex++,
        chunkText: currentChunkText.trim(),
        tokenCount: estimateTokens(currentChunkText),
        pageNumber: page.pageNumber,
        sectionTitle: currentSectionTitle,
      });
    }
  }

  // Handle edge case: parsed document had text but no pages
  if (chunks.length === 0 && parsed.text.trim().length > 0) {
    const sections = splitIntoSections(parsed.text);
    let currentChunkText = '';

    for (const section of sections) {
      const sectionTokens = estimateTokens(section);
      const currentTokens = estimateTokens(currentChunkText);

      if (currentTokens > 0 && currentTokens + sectionTokens > MAX_CHUNK_TOKENS) {
        if (currentTokens >= MIN_CHUNK_TOKENS) {
          chunks.push({
            chunkIndex: chunkIndex++,
            chunkText: currentChunkText.trim(),
            tokenCount: estimateTokens(currentChunkText),
          });
        }
        const overlapText = getOverlapText(currentChunkText, OVERLAP_TOKENS);
        currentChunkText = overlapText + '\n\n' + section;
      } else {
        currentChunkText += (currentChunkText ? '\n\n' : '') + section;
      }
    }

    if (estimateTokens(currentChunkText) >= MIN_CHUNK_TOKENS) {
      chunks.push({
        chunkIndex: chunkIndex++,
        chunkText: currentChunkText.trim(),
        tokenCount: estimateTokens(currentChunkText),
      });
    }
  }

  logger.info({ totalChunks: chunks.length, totalTokens: chunks.reduce((s, c) => s + c.tokenCount, 0) }, 'Document chunked');

  return chunks;
}

/**
 * Extract overlap text (last N tokens) from a chunk for continuity.
 */
function getOverlapText(text: string, overlapTokens: number): string {
  const chars = overlapTokens * 4; // Approximate chars for N tokens
  if (text.length <= chars) return text;

  // Try to break at a sentence or paragraph boundary
  const tail = text.substring(text.length - chars);
  const sentenceBreak = tail.indexOf('. ');
  if (sentenceBreak > 0 && sentenceBreak < chars * 0.5) {
    return tail.substring(sentenceBreak + 2);
  }
  return tail;
}

/**
 * Split a very large section into sub-chunks at sentence boundaries.
 */
function splitLargeSection(
  text: string,
  pageNumber: number | undefined,
  sectionTitle: string | undefined,
  startIndex: number,
): DocumentChunk[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const subChunks: DocumentChunk[] = [];
  let current = '';
  let idx = startIndex;

  for (const sentence of sentences) {
    if (estimateTokens(current + ' ' + sentence) > TARGET_CHUNK_TOKENS && estimateTokens(current) >= MIN_CHUNK_TOKENS) {
      subChunks.push({
        chunkIndex: idx++,
        chunkText: current.trim(),
        tokenCount: estimateTokens(current),
        pageNumber,
        sectionTitle,
      });
      const overlapText = getOverlapText(current, OVERLAP_TOKENS);
      current = overlapText + ' ' + sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }

  if (estimateTokens(current) >= MIN_CHUNK_TOKENS) {
    subChunks.push({
      chunkIndex: idx,
      chunkText: current.trim(),
      tokenCount: estimateTokens(current),
      pageNumber,
      sectionTitle,
    });
  }

  return subChunks;
}
