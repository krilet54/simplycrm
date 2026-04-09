// src/app/api/contacts/[id]/details/route.ts
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { workspace, user: dbUser } = await getAuthenticatedUser();
    const { id } = params;

    // Fetch the contact
    const contact = await db.contact.findUnique({
      where: { id },
      include: {
        kanbanStage: true,
        contactTags: { include: { tag: true } },
        assignedTo: true,
        assignedBy: true,
        _count: { select: { activities: true, invoices: true } },
      },
    });

    if (!contact || contact.workspaceId !== workspace.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check assignment - agent can only access their assigned/created contacts
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      const hasAccess = contact.assignedToId === dbUser.id || 
                        contact.assignedById === dbUser.id || 
                        contact.createdById === dbUser.id;
      if (!hasAccess) {
        console.warn('🚫 Agent attempted to access unauthorized contact:', {
          contactId: id,
          agentId: dbUser.id,
          assignedToId: contact.assignedToId,
          assignedById: contact.assignedById,
          createdById: contact.createdById,
        });
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Fetch related data in parallel
    const [activities, notes, invoices, emails] = await Promise.all([
      db.activity.findMany({
        where: { contactId: id },
        include: { author: true },
        orderBy: { timestamp: 'desc' },
      }),
      db.note.findMany({
        where: { contactId: id },
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.invoice.findMany({
        where: { contactId: id },
        include: { items: true, contact: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.email.findMany({
        where: { contactId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      contact,
      activities,
      notes,
      invoices,
      emails,
    });
  } catch (error: any) {
    console.error('❌ GET /api/contacts/[id]/details error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch contact details', details: error?.message },
      { status: 500 }
    );
  }
}
