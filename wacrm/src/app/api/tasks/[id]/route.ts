// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'SNOOZED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  snoozedUntil: z.string().datetime().optional(),
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

  const task = await db.task.findFirst({
    where: { id: params.id, workspaceId: dbUser.workspaceId },
  });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, dueDate, status, priority, snoozedUntil } = parsed.data;

  try {
    const updated = await db.task.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(snoozedUntil && { snoozedUntil: new Date(snoozedUntil) }),
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    if (status && status !== task.status) {
      await logActivity({
        workspaceId: dbUser.workspaceId,
        contactId: task.contactId,
        activityType: 'CONTACT_UPDATED',
        actorId: dbUser.id,
        title: `Task ${status === 'COMPLETED' ? 'completed' : 'updated'}: ${task.title}`,
        description: `Status: ${status}`,
        metadata: { taskId: task.id },
      });
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('Task update failed:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const task = await db.task.findFirst({
    where: { id: params.id, workspaceId: dbUser.workspaceId },
  });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'TODO') {
    return NextResponse.json(
      { error: 'Can only delete TODO tasks' },
      { status: 400 }
    );
  }

  try {
    await db.task.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task deletion failed:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
