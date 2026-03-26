import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const includeDeleted = searchParams.get('includeDeleted') === 'true';
  const folderId = searchParams.get('folderId');
  const type = searchParams.get('type');
  
  const where: any = { userId: user.id };
  
  if (!includeDeleted) {
    where.isDeleted = false;
  }
  
  if (folderId) {
    where.folderId = folderId;
  }
  
  if (type) {
    where.type = type;
  }
  
  const notes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  
  return NextResponse.json({ notes });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  
  const note = await prisma.note.create({
    data: {
      title: body.title || 'Untitled',
      content: body.content || '',
      rawContent: body.rawContent,
      category: body.category || 'QUICK',
      type: body.type || 'quick',
      tags: body.tags || [],
      color: body.color || 'yellow',
      textColor: body.textColor,
      backgroundColor: body.backgroundColor,
      folderId: body.folderId,
      userId: user.id,
      isSynthesized: body.isSynthesized || false,
      wordCount: body.wordCount || 0,
      projectData: body.projectData,
      attachments: body.attachments || [],
    }
  });
  
  return NextResponse.json({ note });
}
