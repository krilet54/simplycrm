// src/app/api/followups/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const updateFollowUpSchema = z.object({
  isDone: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const followUp = await db.followUp.findFirst({
    where: { id: params.id, workspaceId: dbUser.workspaceId },
  });
  if (!followUp) {
    return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { isDone } = parsed.data;

  try {
    const updated = await db.followUp.update({
      where: { id: params.id },
      data: {
        isDone,
        doneAt: isDone ? new Date() : null,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            kanbanStage: { select: { name: true, color: true } },
          },
        },
      },
    });

    return NextResponse.json({ followUp: updated });
  } catch (error) {
    console.error('FollowUp update failed:', error);
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
  }
}
