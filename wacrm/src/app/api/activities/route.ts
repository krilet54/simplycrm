import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const createSchema = z.object({
  contactId: z.string().uuid(),
  type: z.enum(['NOTE', 'CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'INVOICE_SENT', 'STAGE_CHANGE', 'CONTACT_ADDED', 'OTHER']),
  content: z.string().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json({ error: 'contactId required' }, { status: 400 });
    }

    // Verify contact belongs to user's workspace
    const contact = await db.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get activities for this contact
    const activities = await db.activity.findMany({
      where: { contactId },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { timestamp: 'asc' },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('GET /api/activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { contactId, type, content } = createSchema.parse(body);

    // Verify contact belongs to user's workspace
    const contact = await db.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Create activity
    const activity = await db.activity.create({
      data: {
        workspaceId: dbUser.workspaceId,
        contactId,
        type,
        content,
        authorId: dbUser.id,
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // Update contact's lastActivityAt
    await db.contact.update({
      where: { id: contactId },
      data: { lastActivityAt: new Date() },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('POST /api/activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get('id');

    if (!activityId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const activity = await db.activity.findUnique({
      where: { id: activityId },
      include: { author: true },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Only allow deletion if user is author, admin, or owner
    const isAuthor = activity.authorId === dbUser.id;
    const isAdmin = dbUser.role === 'OWNER' || dbUser.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden'}, { status: 403 });
    }

    await db.activity.delete({ where: { id: activityId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
