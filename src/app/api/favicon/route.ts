import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Serve favicon.ico from the PNG file to avoid 404s
// Browsers automatically request /favicon.ico regardless of metadata
export async function GET(_request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'favicon.png');
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
