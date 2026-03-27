import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  const note = await prisma.note.findFirst({
    where: { id, userId: user.id }
  });
  
  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  
  return NextResponse.json({ note });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  const body = await request.json();
  
  const existingNote = await prisma.note.findFirst({
    where: { id, userId: user.id }
  });
  
  if (!existingNote) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  
  const note = await prisma.note.update({
    where: { id },
    data: {
      title: body.title,
      content: body.content,
      rawContent: body.rawContent,
      category: body.category,
      tags: body.tags,
      color: body.color,
      textColor: body.textColor,
      backgroundColor: body.backgroundColor,
      folderId: body.folderId,
      isDeleted: body.isDeleted,
      deletedAt: body.deletedAt ? new Date(body.deletedAt) : null,
      projectData: body.projectData,
      wordCount: body.wordCount,
      attachments: body.attachments,
    }
  });
  
  return NextResponse.json({ note });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get('permanent') === 'true';
  
  const existingNote = await prisma.note.findFirst({
    where: { id, userId: user.id }
  });
  
  if (!existingNote) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  
  if (permanent) {
    await prisma.note.delete({ where: { id } });
  } else {
    await prisma.note.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }
  
  return NextResponse.json({ success: true });
}
