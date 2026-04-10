// src/app/api/quick-replies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

async function getUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { supabaseId: user.id } });
}

export async function GET() {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const replies = await db.quickReply.findMany({
    where: { workspaceId: dbUser.workspaceId },
    orderBy: { shortcut: 'asc' },
  });

  // Add cache headers - quick replies are relatively static
  const response = NextResponse.json({ replies });
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=240');
  return response;
}

const schema = z.object({
  shortcut: z.string().min(1).max(30).startsWith('/'),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const reply = await db.quickReply.create({
    data: { workspaceId: dbUser.workspaceId, ...parsed.data },
  });

  return NextResponse.json({ reply }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const reply = await db.quickReply.findUnique({ where: { id } });
  if (!reply || reply.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.quickReply.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
