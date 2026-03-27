import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const folders = await prisma.folder.findMany({
    where: { userId: user.id },
    orderBy: { order: 'asc' },
  });
  
  return NextResponse.json({ folders });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  
  const folderCount = await prisma.folder.count({
    where: { userId: user.id }
  });
  
  const folder = await prisma.folder.create({
    data: {
      name: body.name || 'New Folder',
      order: body.order ?? folderCount,
      userId: user.id,
    }
  });
  
  return NextResponse.json({ folder });
}
