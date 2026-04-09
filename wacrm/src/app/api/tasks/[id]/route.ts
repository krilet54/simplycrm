// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assignedToId: z.string().uuid().optional(),
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

  const { title, description, dueDate, status, priority, assignedToId } = parsed.data;

  try {
    // Verify assignedToId belongs to workspace if provided
    if (assignedToId) {
      const assignedUser = await db.user.findFirst({
        where: { id: assignedToId, workspaceId: dbUser.workspaceId },
      });
      if (!assignedUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    // Handle completedAt based on status
    if (status === 'DONE') {
      updateData.completedAt = new Date();
    } else if (status && task.completedAt) {
      // If moving away from DONE to TODO or IN_PROGRESS, clear completedAt
      updateData.completedAt = null;
    }

    const updated = await db.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

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

  // Only createdBy or Admin/Owner can delete
  const canDelete = 
    task.createdById === dbUser.id || 
    dbUser.role === 'OWNER' || 
    dbUser.role === 'ADMIN';
  
  if (!canDelete) {
    return NextResponse.json(
      { error: 'Unauthorized to delete task' },
      { status: 403 }
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
