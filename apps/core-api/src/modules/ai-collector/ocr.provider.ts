import { OcrResult } from './ai-collector.types';
import { MistralVisionOcrProvider } from './mistral-vision.provider';
import { createLogger } from '../../core/logging/logger';

const logger = createLogger('OcrProvider');

export interface IOcrProvider {
  extractText(fileBuffer: Buffer, mimeType: string): Promise<OcrResult>;
}

export class TesseractOcrProvider implements IOcrProvider {
  private readonly visionProvider = new MistralVisionOcrProvider();

  async extractText(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    logger.info({ sizeBytes: fileBuffer.length, mimeType }, 'Executing OCR & Document Vision Extraction Node');
    return this.visionProvider.extractText(fileBuffer, mimeType);
  }
}
