// src/app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

// ── GET /api/contacts ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const search  = searchParams.get('search') ?? '';
  const stageId = searchParams.get('stageId');
  const tagId   = searchParams.get('tagId');

  const contacts = await db.contact.findMany({
    where: {
      workspaceId: dbUser.workspaceId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(stageId ? { kanbanStageId: stageId } : {}),
      ...(tagId ? { contactTags: { some: { tagId } } } : {}),
    },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    include: {
      kanbanStage: true,
      contactTags: { include: { tag: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ contacts });
}

// ── POST /api/contacts ────────────────────────────────────────────────────────
const createSchema = z.object({
  phoneNumber: z.string().min(6).max(20),
  name: z.string().optional(),
  email: z.string().email().optional(),
  kanbanStageId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  source: z.enum(['WHATSAPP', 'WALK_IN', 'PHONE_CALL', 'REFERRAL', 'SOCIAL_MEDIA', 'EVENT', 'OTHER']).optional(),
  sourceNote: z.string().max(200).optional(),
  interest: z.string().max(500).optional(),
  estimatedValue: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { phoneNumber, name, email, kanbanStageId, tagIds = [], source, sourceNote, interest, estimatedValue } = parsed.data;

  // Check duplicate
  const existing = await db.contact.findUnique({
    where: {
      workspaceId_phoneNumber: { workspaceId: dbUser.workspaceId, phoneNumber },
    },
  });
  if (existing) {
    return NextResponse.json({ error: 'Contact with this number already exists' }, { status: 409 });
  }

  const contact = await db.contact.create({
    data: {
      workspaceId: dbUser.workspaceId,
      phoneNumber,
      name,
      email,
      kanbanStageId,
      source,
      sourceNote,
      interest,
      estimatedValue,
      contactTags: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
    include: { kanbanStage: true, contactTags: { include: { tag: true } } },
  });

  // Log activity: Contact created
  await logActivity({
    workspaceId: dbUser.workspaceId,
    contactId: contact.id,
    activityType: 'CONTACT_CREATED',
    actorId: dbUser.id,
    title: `Contact created: ${contact.name || contact.phoneNumber}`,
    description: `Source: ${source || 'Unknown'}`,
    metadata: { source, phoneNumber },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
