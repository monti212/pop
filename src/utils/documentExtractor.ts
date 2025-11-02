import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractionResult {
  text: string;
  wordCount: number;
  pageCount: number;
  extractionMethod: string;
  qualityScore: number;
  error?: string;
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    let fullText = '';
    let hasErrors = false;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      } catch (error) {
        console.error(`Error extracting page ${pageNum}:`, error);
        hasErrors = true;
      }
    }

    const wordCount = countWords(fullText);
    const qualityScore = calculateQualityScore(fullText, wordCount, hasErrors);

    return {
      text: fullText.trim(),
      wordCount,
      pageCount,
      extractionMethod: 'pdfjs',
      qualityScore,
    };
  } catch (error: any) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from Word document (DOCX)
 */
export async function extractTextFromDOCX(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    const wordCount = countWords(text);
    const hasWarnings = result.messages.length > 0;
    const qualityScore = calculateQualityScore(text, wordCount, hasWarnings);

    return {
      text: text.trim(),
      wordCount,
      pageCount: estimatePageCount(wordCount),
      extractionMethod: 'mammoth',
      qualityScore,
      error: hasWarnings ? result.messages.map(m => m.message).join('; ') : undefined,
    };
  } catch (error: any) {
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from plain text or markdown file
 */
export async function extractTextFromPlainText(file: File): Promise<ExtractionResult> {
  try {
    const text = await file.text();
    const wordCount = countWords(text);
    const qualityScore = 100; // Plain text extraction is always high quality

    return {
      text: text.trim(),
      wordCount,
      pageCount: estimatePageCount(wordCount),
      extractionMethod: 'text',
      qualityScore,
    };
  } catch (error: any) {
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from DOC file (older Word format)
 * Note: This is a simplified approach. Full DOC support requires server-side processing.
 */
export async function extractTextFromDOC(file: File): Promise<ExtractionResult> {
  try {
    // Attempt to read as text (may not work well for binary DOC files)
    const text = await file.text();

    // Clean up binary artifacts
    const cleanText = text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    const wordCount = countWords(cleanText);
    const qualityScore = cleanText.length > 100 ? 50 : 0; // Low quality score for DOC

    return {
      text: cleanText,
      wordCount,
      pageCount: estimatePageCount(wordCount),
      extractionMethod: 'text-fallback',
      qualityScore,
      error: 'DOC format support is limited. Consider converting to DOCX for better results.',
    };
  } catch (error: any) {
    throw new Error(`DOC extraction failed: ${error.message}. Please convert to DOCX format.`);
  }
}

/**
 * Main extraction function that routes to appropriate extractor based on file type
 */
export async function extractDocumentText(file: File): Promise<ExtractionResult> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // Determine extraction method based on file extension and MIME type
  if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
    return extractTextFromPDF(file);
  } else if (
    fileName.endsWith('.docx') ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDOCX(file);
  } else if (
    fileName.endsWith('.doc') ||
    fileType === 'application/msword' ||
    fileType === 'application/vnd.ms-word'
  ) {
    return extractTextFromDOC(file);
  } else if (
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileType === 'text/plain' ||
    fileType === 'text/markdown'
  ) {
    return extractTextFromPlainText(file);
  } else {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Please upload PDF, DOCX, DOC, TXT, or MD files.`);
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Estimate page count based on word count
 * Assumes approximately 250-300 words per page
 */
function estimatePageCount(wordCount: number): number {
  if (wordCount === 0) return 0;
  return Math.max(1, Math.ceil(wordCount / 275));
}

/**
 * Calculate extraction quality score (0-100)
 */
function calculateQualityScore(
  text: string,
  wordCount: number,
  hasErrors: boolean
): number {
  let score = 100;

  // Reduce score if there are errors
  if (hasErrors) {
    score -= 30;
  }

  // Reduce score if text is too short
  if (wordCount < 50) {
    score -= 40;
  } else if (wordCount < 100) {
    score -= 20;
  }

  // Reduce score if text has too many special characters (poor extraction)
  const textLength = text.length;
  if (textLength > 0) {
    const alphanumericCount = (text.match(/[a-zA-Z0-9\s]/g) || []).length;
    const alphanumericRatio = alphanumericCount / textLength;

    if (alphanumericRatio < 0.7) {
      score -= 30; // Text has too many special characters
    } else if (alphanumericRatio < 0.8) {
      score -= 15;
    }
  }

  // Reduce score if text seems to be mostly garbage
  const averageWordLength = wordCount > 0 ? textLength / wordCount : 0;
  if (averageWordLength > 15 || averageWordLength < 3) {
    score -= 20; // Unusual word lengths indicate poor extraction
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Validate file before extraction
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 300 * 1024 * 1024; // 300MB

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 300MB limit.`,
    };
  }

  const validExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word',
    'text/plain',
    'text/markdown',
  ];
  const hasValidType = file.type && validTypes.includes(file.type.toLowerCase());

  if (!hasValidExtension && !hasValidType) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF, Word (DOC/DOCX), Text, or Markdown files.',
    };
  }

  return { valid: true };
}

/**
 * Chunk large text for AI processing
 * Splits text into chunks with overlap to maintain context
 */
export function chunkText(text: string, maxTokens: number = 8000, overlapTokens: number = 200): string[] {
  const words = text.split(/\s+/);
  const estimatedWordsPerToken = 0.75; // Approximate: 1 token ≈ 0.75 words
  const maxWords = Math.floor(maxTokens * estimatedWordsPerToken);
  const overlapWords = Math.floor(overlapTokens * estimatedWordsPerToken);

  if (words.length <= maxWords) {
    return [text];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < words.length) {
    const chunkWords = words.slice(currentIndex, currentIndex + maxWords);
    chunks.push(chunkWords.join(' '));

    // Move forward, but overlap with previous chunk
    currentIndex += maxWords - overlapWords;
  }

  return chunks;
}

/**
 * Estimate token count from text
 * Uses rough approximation: 1 token ≈ 4 characters or 0.75 words
 */
export function estimateTokenCount(text: string): number {
  const charCount = text.length;
  const wordCount = countWords(text);

  // Use average of both methods for better estimate
  const tokensFromChars = Math.ceil(charCount / 4);
  const tokensFromWords = Math.ceil(wordCount / 0.75);

  return Math.floor((tokensFromChars + tokensFromWords) / 2);
}
