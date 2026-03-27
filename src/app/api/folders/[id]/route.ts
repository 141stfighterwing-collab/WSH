import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
  
  const existingFolder = await prisma.folder.findFirst({
    where: { id, userId: user.id }
  });
  
  if (!existingFolder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }
  
  const folder = await prisma.folder.update({
    where: { id },
    data: { name: body.name, order: body.order }
  });
  
  return NextResponse.json({ folder });
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
  
  const existingFolder = await prisma.folder.findFirst({
    where: { id, userId: user.id }
  });
  
  if (!existingFolder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }
  
  await prisma.folder.delete({ where: { id } });
  
  return NextResponse.json({ success: true });
}
