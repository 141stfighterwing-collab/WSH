import { PDFParse } from 'pdf-parse';
import { promises as fs } from 'fs';
import path from 'path';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface ProcessedDocument {
  pages: ExtractedPage[];
  chunks: {
    pageNumber: number;
    chunkIndex: number;
    content: string;
    charCount: number;
  }[];
  totalChars: number;
  totalPages: number;
  totalChunks: number;
}

const MAX_CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

/**
 * Extract text from a PDF buffer, returning per-page results.
 */
export async function extractPdfPages(buffer: Buffer): Promise<ExtractedPage[]> {
  try {
    const parser = new PDFParse(buffer);
    const result = await parser.getText();

    if (result?.pages && result.pages.length > 0) {
      return result.pages
        .map((p: { text: string; num: number }, idx: number) => {
          const text = cleanText(p.text || '');
          return { pageNumber: p.num || idx + 1, text, charCount: text.length };
        })
        .filter((p: ExtractedPage) => p.charCount > 0);
    }

    const rawText = extractPdfTextFallback(buffer);
    if (rawText) {
      const segments = rawText.split(/\n{3,}/).filter(Boolean);
      if (segments.length > 0) {
        return segments.map((seg, i) => {
          const text = cleanText(seg);
          return { pageNumber: i + 1, text, charCount: text.length };
        }).filter((p: ExtractedPage) => p.charCount > 0);
      }
    }
  } catch {
    const rawText = extractPdfTextFallback(buffer);
    if (rawText) {
      const text = cleanText(rawText);
      if (text.length > 0) return [{ pageNumber: 1, text, charCount: text.length }];
    }
  }
  return [];
}

/**
 * Extract text from plain text file types.
 */
export function extractPlainText(buffer: Buffer): ExtractedPage[] {
  const text = cleanText(buffer.toString('utf-8'));
  if (!text) return [];

  if (text.length <= MAX_CHUNK_SIZE * 2) {
    return [{ pageNumber: 1, text, charCount: text.length }];
  }

  const segments = text.split(/\n{2,}/).filter(Boolean);
  const pages: ExtractedPage[] = [];
  let currentText = '';

  for (const seg of segments) {
    if (currentText.length + seg.length > MAX_CHUNK_SIZE * 3 && currentText) {
      pages.push({ pageNumber: pages.length + 1, text: cleanText(currentText), charCount: cleanText(currentText).length });
      currentText = '';
    }
    currentText += (currentText ? '\n\n' : '') + seg;
  }

  if (currentText.trim()) {
    pages.push({ pageNumber: pages.length + 1, text: cleanText(currentText), charCount: cleanText(currentText).length });
  }
  return pages.filter((p) => p.charCount > 0);
}

/**
 * Full pipeline: extract text from file → chunk it → return processed result.
 * For binary/image files, returns empty result (file is still saved and viewable).
 */
export async function processDocument(buffer: Buffer, fileName: string): Promise<ProcessedDocument> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Skip text extraction for binary/image files — they are saved for viewing, not parsing
  const skipExtraction = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'docx', 'doc', 'rtf'];
  if (skipExtraction.includes(ext)) {
    return { pages: [], chunks: [], totalChars: 0, totalPages: 0, totalChunks: 0 };
  }

  let pages: ExtractedPage[] = [];

  if (ext === 'pdf') {
    pages = await extractPdfPages(buffer);
  } else {
    pages = extractPlainText(buffer);
  }

  const chunks = chunkPages(pages);
  const totalChars = pages.reduce((sum, p) => sum + p.charCount, 0);

  return { pages, chunks, totalChars, totalPages: pages.length, totalChunks: chunks.length };
}

/**
 * Save uploaded file to disk.
 */
export async function saveUploadedFile(buffer: Buffer, fileName: string, uploadDir: string): Promise<string> {
  await fs.mkdir(uploadDir, { recursive: true });
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(uploadDir, safeName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Delete a file from disk.
 */
export async function deleteUploadedFile(filePath: string): Promise<void> {
  try { await fs.unlink(filePath); } catch { /* already deleted */ }
}

// ── Internal ──────────────────────────────────────────────────

function cleanText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+$/gm, '').replace(/\t/g, '  ').trim();
}

function chunkPages(pages: ExtractedPage[]): ProcessedDocument['chunks'] {
  const chunks: ProcessedDocument['chunks'] = [];
  for (const page of pages) {
    if (page.charCount <= MAX_CHUNK_SIZE) {
      chunks.push({ pageNumber: page.pageNumber, chunkIndex: 0, content: page.text, charCount: page.charCount });
    } else {
      const pageChunks = splitIntoChunks(page.text, MAX_CHUNK_SIZE, CHUNK_OVERLAP);
      pageChunks.forEach((chunk, idx) => {
        chunks.push({ pageNumber: page.pageNumber, chunkIndex: idx, content: chunk, charCount: chunk.length });
      });
    }
  }
  return chunks;
}

function splitIntoChunks(text: string, maxSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + maxSize * 0.3) end = breakPoint + 1;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end - overlap;
    if (start >= text.length || chunks.length > 100) break;
  }
  return chunks;
}

function extractPdfTextFallback(buffer: Buffer): string {
  const content = buffer.toString('latin1');
  const texts: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = streamRegex.exec(content)) !== null) {
    const stream = m[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj;
    while ((tj = tjRegex.exec(stream)) !== null) {
      const decoded = tj[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
      if (decoded.trim()) texts.push(decoded);
    }
    const tjArrRegex = /\[([^\]]*)\]\s*TJ/gi;
    let arr;
    while ((arr = tjArrRegex.exec(stream)) !== null) {
      const t = arr[1].replace(/\(([^)]*)\)/g, (_, inner) => inner).replace(/\\n/g, ' ').replace(/\\r/g, ' ').trim();
      if (t) texts.push(t);
    }
  }
  return texts.join(' ').replace(/\s+/g, ' ').trim();
}
