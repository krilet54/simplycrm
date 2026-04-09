// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

async function getUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { supabaseId: user.id } });
}

// ── GET /api/notes?contactId=xxx ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const rateLimitResponse = await checkRateLimit(req, 'general');
  if (rateLimitResponse) return rateLimitResponse;

  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contactId = new URL(req.url).searchParams.get('contactId');
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });

  const contact = await db.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const notes = await db.note.findMany({
    where: { contactId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ notes });
}

// ── POST /api/notes ───────────────────────────────────────────────────────────
const createSchema = z.object({
  contactId: z.string().uuid(),
  content: z.string().min(1).max(10000), // Increased max length for notes
});

export async function POST(req: NextRequest) {
  const rateLimitResponse = await checkRateLimit(req, 'general');
  if (rateLimitResponse) return rateLimitResponse;

  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const contact = await db.contact.findUnique({ where: { id: parsed.data.contactId } });
  if (!contact || contact.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const note = await db.note.create({
    data: {
      contactId: parsed.data.contactId,
      authorId: dbUser.id,
      content: parsed.data.content,
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Update contact's lastActivityAt
  await db.contact.update({
    where: { id: parsed.data.contactId },
    data: { lastActivityAt: new Date() },
  });

  return NextResponse.json({ note }, { status: 201 });
}

// ── DELETE /api/notes?id=xxx ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const note = await db.note.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only author or admin can delete
  if (note.authorId !== dbUser.id && dbUser.role === 'AGENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.note.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
