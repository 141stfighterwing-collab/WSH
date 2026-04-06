import { NextRequest, NextResponse } from 'next/server';

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
    // Handle PDF files
    else if (ext === 'pdf') {
      text = extractPdfText(buffer);
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

    return NextResponse.json({
      text,
      fileName: file.name,
      fileSize: file.size,
      chars: text.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to extract text';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Basic PDF text extraction — scans for text strings between BT/ET markers
function extractPdfText(buffer: Buffer): string {
  const content = buffer.toString('latin1');
  const texts: string[] = [];

  // Method 1: Extract text between parentheses in text objects
  const textRegex = /\(([^)]*)\)/g;
  let match;
  while ((match = textRegex.exec(content)) !== null) {
    const text = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    // Filter out non-printable and obviously non-text content
    if (text.length > 0 && text.length < 500 && /[\x20-\x7E\u00C0-\u024F]/.test(text)) {
      texts.push(text);
    }
  }

  // Method 2: Extract from streams (more reliable for modern PDFs)
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;
  while ((streamMatch = streamRegex.exec(content)) !== null) {
    const stream = streamMatch[1];
    // Look for Tj and TJ operators which output text
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
    // TJ array operator
    const tjArrRegex = /\[([^\]]*)\]\s*TJ/g;
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

  // Join with spaces and clean up
  let result = texts.join(' ')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1\n')
    .trim();

  return result || '[PDF text extraction produced no results. The PDF may be image-based or use non-standard encoding.]';
}

// Basic DOCX text extraction — DOCX is a ZIP containing word/document.xml
function extractDocxText(buffer: Buffer): string {
  // For a basic extraction without external deps, we look for XML text content
  // DOCX files contain word/document.xml with <w:t> tags
  const content = buffer.toString('utf-8');

  // Extract text from <w:t> tags
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

  // Fallback: extract any readable text from the ZIP content
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

  // Remove RTF control words and keep plain text
  const text = content
    .replace(/\\[a-z]+\d*[\s]?/gi, ' ')
    .replace(/[{}]/g, '')
    .replace(/\\'[0-9a-fA-F]{2}/g, '') // Remove hex escape sequences
    .replace(/\s+/g, ' ')
    .trim();

  return text || '[Could not extract text from RTF file.]';
}

// Basic DOC (binary) text extraction
function extractDocText(buffer: Buffer): string {
  // Extract readable ASCII/UTF-8 text from binary format
  const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 5 * 1024 * 1024)); // Read first 5MB

  // Find readable text segments
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
