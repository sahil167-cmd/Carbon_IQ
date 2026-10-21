import OpenAI from 'openai';
import { env } from '../../../config/env.schema';
import { createLogger } from '../../../core/logging/logger';

const logger = createLogger('Embedder');

/**
 * Universal Embedder — Generates vector embeddings using Google Gemini, Mistral AI, or OpenAI.
 * Automatically adapts dimensions and parameters based on the active provider.
 */

const TARGET_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 64;

let _openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey || apiKey.includes('REPLACE_') || apiKey.includes('YOUR_') || apiKey.length < 15) {
      throw new Error('LLM_API_KEY is not configured with a valid key');
    }
    _openaiClient = new OpenAI({
      apiKey,
      baseURL: env.LLM_BASE_URL || 'https://api.mistral.ai/v1',
      timeout: 3500,
      maxRetries: 0,
    });
  }
  return _openaiClient;
}

function isMistral(): boolean {
  const url = (env.LLM_BASE_URL || '').toLowerCase();
  return url.includes('mistral.ai');
}

function isGemini(): boolean {
  const url = (env.LLM_BASE_URL || '').toLowerCase();
  return url.includes('generativelanguage.googleapis.com');
}

export function getEmbeddingModel(): string {
  if (process.env.EMBEDDING_MODEL) return process.env.EMBEDDING_MODEL;
  if (isMistral()) return 'mistral-embed';
  if (isGemini()) return 'text-embedding-004';
  return 'text-embedding-3-small';
}

function normalizeToTargetDimensions(vec: number[]): number[] {
  if (vec.length === TARGET_DIMENSIONS) return vec;
  if (vec.length > TARGET_DIMENSIONS) return vec.slice(0, TARGET_DIMENSIONS);
  // Pad with zeros to 1536
  const padded = new Array(TARGET_DIMENSIONS).fill(0);
  for (let i = 0; i < vec.length; i++) {
    padded[i] = vec[i];
  }
  return padded;
}

/**
 * Generate embedding for a single text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getClient();
    const model = getEmbeddingModel();
    const payload: any = {
      model,
      input: text.substring(0, 4000),
    };
    if (!isMistral()) {
      payload.dimensions = TARGET_DIMENSIONS;
    }

    const response = await client.embeddings.create(payload);
    const rawVec = response.data[0].embedding;
    return normalizeToTargetDimensions(rawVec);
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Embedding generation unavailable, using deterministic hash fallback');
    // Fallback: create pseudo-embedding from text hash to avoid crashing retrieval
    const fallback = new Array(TARGET_DIMENSIONS).fill(0);
    for (let i = 0; i < text.length; i++) {
      fallback[i % TARGET_DIMENSIONS] += (text.charCodeAt(i) % 100) / 1000;
    }
    return fallback;
  }
}


/**
 * Generate embeddings for multiple text strings in batches.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getClient();
  const model = getEmbeddingModel();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE).map((t) => t.substring(0, 4000));

    try {
      const payload: any = {
        model,
        input: batch,
      };
      if (!isMistral() && !isGemini()) {
        payload.dimensions = TARGET_DIMENSIONS;
      }

      const response = await client.embeddings.create(payload);
      const sorted = response.data.sort((a, b) => a.index - b.index);
      for (const d of sorted) {
        allEmbeddings.push(normalizeToTargetDimensions(d.embedding));
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Batch embedding failed, falling back to individual generation');
      for (const t of batch) {
        allEmbeddings.push(await generateEmbedding(t));
      }
    }
  }

  return allEmbeddings;
}

export function getEmbeddingDimensions(): number {
  return TARGET_DIMENSIONS;
}
