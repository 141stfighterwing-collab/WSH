import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

// POST /api/admin/users/extract-text — Extract text from uploaded files (PDF, DOCX, etc.)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();
    const ext = fileName.split('.').pop() || '';

    let text = '';

    // Handle plain text files directly
    if (['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'log', 'html', 'htm', 'css',
         'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'cs',
         'php', 'swift', 'kt', 'sh', 'bash', 'sql', 'r', 'm', 'mm', 'lua', 'pl', 'ps1',
         'bat', 'ini', 'cfg', 'conf', 'env', 'gitignore', 'dockerignore', 'editorconfig',
         'eslintrc', 'prettierrc', 'tsconfig', 'makefile', 'cmakelists', 'gradle', 'properties'
    ].includes(ext)) {
      text = buffer.toString('utf-8');
    }
    // Handle PDF files using pdf-parse v2 (class-based API)
    else if (ext === 'pdf') {
      try {
        const parser = new PDFParse(buffer);
        const result = await parser.getText();
        // getText() returns { pages: [{text, num}], total } — join all pages
        if (result && result.pages && result.pages.length > 0) {
          text = result.pages.map((p: { text: string; num: number }) => p.text).join('\n\n');
        }
        // If pdf-parse returned nothing, fall back to regex extraction
        if (!text.trim()) {
          text = extractPdfTextFallback(buffer);
        }
      } catch {
        // Fallback to regex-based extraction if pdf-parse fails
        text = extractPdfTextFallback(buffer);
      }
    }
    // Handle DOCX files
    else if (ext === 'docx') {
      text = extractDocxText(buffer);
    }
    // Handle RTF files
    else if (ext === 'rtf') {
      text = extractRtfText(buffer);
    }
    // Handle DOC (old binary format) - basic text extraction
    else if (ext === 'doc') {
      text = extractDocText(buffer);
    }
    else {
      // Try as UTF-8 text as fallback
      try {
        text = buffer.toString('utf-8');
      } catch {
        return NextResponse.json(
          { error: `Unsupported file type: .${ext}` },
          { status: 400 }
        );
      }
    }

    // Clean up the text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+$/gm, '')
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: 'No text could be extracted from this file. It may be image-based or empty.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text,
      fileName: file.name,
      fileSize: file.size,
      chars: text.length,
      pages: ext === 'pdf' ? undefined : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to extract text';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Fallback PDF text extraction — basic regex-based approach
function extractPdfTextFallback(buffer: Buffer): string {
  const content = buffer.toString('latin1');
  const texts: string[] = [];

  // Extract from streams - look for Tj and TJ operators
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;
  while ((streamMatch = streamRegex.exec(content)) !== null) {
    const stream = streamMatch[1];
    // Tj operator: (text) Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(stream)) !== null) {
      const decoded = tjMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');
      if (decoded.trim()) texts.push(decoded);
    }
    // TJ array operator: [(text1)(text2)] TJ
    const tjArrRegex = /\[([^\]]*)\]\s*TJ/gi;
    let tjArrMatch;
    while ((tjArrMatch = tjArrRegex.exec(stream)) !== null) {
      const arrText = tjArrMatch[1]
        .replace(/\(([^)]*)\)/g, (_, inner) => inner)
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .trim();
      if (arrText) texts.push(arrText);
    }
  }

  // If no streams found, try simpler approach with text between BT/ET
  if (texts.length === 0) {
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btEtRegex.exec(content)) !== null) {
      const block = btMatch[1];
      const tjs = block.match(/\(([^)]*)\)\s*Tj/g);
      if (tjs) {
        for (const tj of tjs) {
          const m = tj.match(/\(([^)]*)\)/);
          if (m && m[1].trim()) texts.push(m[1].trim());
        }
      }
    }
  }

  let result = texts.join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return result || '[PDF text extraction produced no results. The PDF may be image-based or use non-standard encoding.]';
}

// Basic DOCX text extraction — DOCX is a ZIP containing word/document.xml
function extractDocxText(buffer: Buffer): string {
  const content = buffer.toString('utf-8');
  const textParts: string[] = [];
  const tagRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    if (match[1].trim()) {
      textParts.push(match[1]);
    }
  }

  if (textParts.length > 0) {
    return textParts.join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Fallback: extract any readable text
  const readableChunks: string[] = [];
  const readable = content.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ');
  const chunkRegex = /[\w\s.,!?;:'"()\[\]{}\-\/\\@#$%^&*+=]{20,}/g;
  while ((match = chunkRegex.exec(readable)) !== null) {
    readableChunks.push(match[0].trim());
  }

  return readableChunks.join('\n').trim() || '[Could not extract text from DOCX file.]';
}

// Basic RTF text extraction
function extractRtfText(buffer: Buffer): string {
  const content = buffer.toString('utf-8');
  const text = content
    .replace(/\\[a-z]+\d*[\s]?/gi, ' ')
    .replace(/[{}]/g, '')
    .replace(/\\'[0-9a-fA-F]{2}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || '[Could not extract text from RTF file.]';
}

// Basic DOC (binary) text extraction
function extractDocText(buffer: Buffer): string {
  const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 5 * 1024 * 1024));
  const textParts: string[] = [];
  const segmentRegex = /[\x20-\x7E\u00A0-\uFFFF]{10,}/g;
  let match;
  while ((match = segmentRegex.exec(content)) !== null) {
    textParts.push(match[0]);
  }
  return textParts.join(' ')
    .replace(/\s+/g, ' ')
    .trim() || '[Could not extract text from DOC file. Consider saving as DOCX or PDF.]';
}
