// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { notifyTaskAssignment } from '@/lib/notifications';

// ── POST /api/tasks ────────────────────────────────────────────────────────
const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  contactId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
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

    const { title, description, contactId, assignedToId, priority, dueDate } = parsed.data;

    // Verify contact belongs to workspace if provided
    if (contactId) {
      const contact = await db.contact.findFirst({
        where: { id: contactId, workspaceId: dbUser.workspaceId },
      });
      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }
    }

    // Get assignee details if provided
    let assignee = null;
    if (assignedToId) {
      assignee = await db.user.findFirst({
        where: { id: assignedToId, workspaceId: dbUser.workspaceId },
      });
      if (!assignee) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const task = await db.task.create({
      data: {
        workspaceId: dbUser.workspaceId,
        contactId: contactId || null,
        createdById: dbUser.id,
        assignedToId: assignedToId || null,
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });

    // Send notification to assignee (if different from creator)
    if (assignee && assignee.id !== dbUser.id) {
      try {
        await notifyTaskAssignment(
          dbUser.workspaceId,
          task.id,
          assignee.id,
          assignee.name,
          assignee.email,
          title,
          dueDate ? new Date(dueDate) : undefined
        );
        console.log('✅ Task assignment notification sent to:', assignee.email);
      } catch (notifyError) {
        console.error('Failed to send task notification:', notifyError);
        // Don't fail the task creation if notification fails
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/tasks error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to create task', details: error?.message },
      { status: 500 }
    );
  }
}

// ── GET /api/tasks ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userRole = searchParams.get('userRole') || dbUser.role;
    const contactId = searchParams.get('contactId');
    const overdue = searchParams.get('overdue') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';
    const withStats = searchParams.get('withStats') === 'true';
    const limitParam = Number(searchParams.get('limit') ?? 100);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 100;

    const visibilityWhere: any = { workspaceId: dbUser.workspaceId };
    
    // Role-based visibility: OWNER and ADMIN see all tasks; AGENT sees only their own
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      visibilityWhere.OR = [
        { assignedToId: dbUser.id },
        { createdById: dbUser.id },
      ];
    }

    const where: any = { ...visibilityWhere };
    
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;
    
    if (overdue) {
      // Combine with existing conditions using AND at top level
      if (where.OR) {
        where.AND = [
          { dueDate: { lt: new Date() } },
          { status: 'TODO' },  // FIXED: Use TODO instead of PENDING
          { OR: where.OR },
        ];
        delete where.OR;
      } else {
        where.dueDate = { lt: new Date() };
        where.status = 'TODO';  // FIXED: Use TODO instead of PENDING
      }
    }

    if (countOnly) {
      const count = await db.task.count({ where });
      return NextResponse.json({ count }, { status: 200 });
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (!withStats) {
      return NextResponse.json({ tasks }, { status: 200 });
    }

    const now = new Date();
    const [pending, completed, overdueCount] = await Promise.all([
      db.task.count({ where: { ...visibilityWhere, status: 'TODO' } }),
      db.task.count({ where: { ...visibilityWhere, status: 'DONE' } }),
      db.task.count({ where: { ...visibilityWhere, status: 'TODO', dueDate: { lt: now } } }),
    ]);

    return NextResponse.json(
      {
        tasks,
        stats: {
          pending,
          completed,
          overdue: overdueCount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ GET /api/tasks error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error?.message },
      { status: 500 }
    );
  }
}
