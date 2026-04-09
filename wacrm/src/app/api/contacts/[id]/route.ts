// src/app/api/contacts/[id]/route.ts
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

// ── PATCH /api/contacts/[id] ──────────────────────────────────────────────────
const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().nullable(),
  kanbanStageId: z.string().uuid().optional().nullable(),
  isBlocked: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  source: z.enum(['WHATSAPP', 'WALK_IN', 'PHONE_CALL', 'REFERRAL', 'SOCIAL_MEDIA', 'EVENT', 'OTHER']).optional(),
  sourceNote: z.string().max(200).optional().nullable(),
  interest: z.string().max(500).optional().nullable(),
  estimatedValue: z.number().positive().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contact = await db.contact.findUnique({
      where: { id: params.id },
      include: {
        kanbanStage: true,
        contactTags: { include: { tag: true } },
      },
    });

    if (!contact || contact.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Role-based access: OWNER/ADMIN see all, AGENT only sees assigned or created
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      const isAssignedOrCreated = contact.assignedToId === dbUser.id || contact.createdById === dbUser.id;
      if (!isAssignedOrCreated) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ contact });
  } catch (error: any) {
    console.error('❌ GET /api/contacts/[id] error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch contact', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contact = await db.contact.findUnique({ where: { id: params.id } });
    if (!contact || contact.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Role-based access: OWNER/ADMIN edit all, AGENT only edits assigned or created
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      const isAssignedOrCreated = contact.assignedToId === dbUser.id || contact.createdById === dbUser.id;
      if (!isAssignedOrCreated) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { tagIds, ...rest } = parsed.data;

    const updated = await db.contact.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(tagIds !== undefined
          ? {
              contactTags: {
                deleteMany: {},
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: {
        kanbanStage: true,
        contactTags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ contact: updated });
  } catch (error: any) {
    console.error('❌ PATCH /api/contacts/[id] error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to update contact', details: error?.message },
      { status: 500 }
    );
  }
}

// ── DELETE /api/contacts/[id] ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contact = await db.contact.findUnique({ where: { id: params.id } });
    if (!contact || contact.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only OWNER/ADMIN can delete
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete by setting deletedAt timestamp
    await db.contact.update({ 
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ DELETE /api/contacts/[id] error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to delete contact', details: error?.message },
      { status: 500 }
    );
  }
}
