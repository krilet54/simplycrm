// src/app/api/tags/route.ts
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

  const tags = await db.tag.findMany({
    where: { workspaceId: dbUser.workspaceId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ tags });
}

const schema = z.object({
  name:  z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function POST(req: NextRequest) {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tag = await db.tag.create({
    data: {
      workspaceId: dbUser.workspaceId,
      name:  parsed.data.name,
      color: parsed.data.color ?? '#6366f1',
    },
  });

  return NextResponse.json({ tag }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const tag = await db.tag.findUnique({ where: { id } });
  if (!tag || tag.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
