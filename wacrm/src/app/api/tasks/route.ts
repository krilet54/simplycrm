// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

// ── POST /api/tasks ────────────────────────────────────────────────────────
const createTaskSchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  type: z.enum(['MANUAL', 'AUTO_PAYMENT_DUE', 'AUTO_NO_REPLY_24H', 'AUTO_INVOICE_SENT', 'AUTO_INVOICE_OVERDUE']).default('MANUAL'),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { contactId, title, description, dueDate, priority, type } = parsed.data;

  // Verify contact belongs to workspace
  const contact = await db.contact.findFirst({
    where: { id: contactId, workspaceId: dbUser.workspaceId },
  });
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  try {
    const task = await db.task.create({
      data: {
        workspaceId: dbUser.workspaceId,
        contactId,
        createdBy: dbUser.id,
        title,
        description,
        dueDate: new Date(dueDate),
        priority,
        type,
      },
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      workspaceId: dbUser.workspaceId,
      contactId,
      activityType: 'CONTACT_UPDATED',
      actorId: dbUser.id,
      title: `Task created: ${title}`,
      description: `Due: ${new Date(dueDate).toLocaleDateString()}`,
      metadata: { taskId: task.id, type },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Task creation failed:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// ── GET /api/tasks ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const contactId = searchParams.get('contactId');
  const pastDue = searchParams.get('pastDue') === 'true';

  const where: any = { workspaceId: dbUser.workspaceId };
  if (status) where.status = status;
  if (contactId) where.contactId = contactId;
  if (pastDue) {
    where.dueDate = { lt: new Date() };
    where.status = { in: ['TODO', 'IN_PROGRESS'] };
  }

  const tasks = await db.task.findMany({
    where,
    include: {
      contact: { select: { id: true, name: true, phoneNumber: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  return NextResponse.json({ tasks });
}
