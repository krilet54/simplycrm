// Debug endpoint to check assignment status
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get all contacts for this workspace
    const allContacts = await db.contact.findMany({
      where: { workspaceId: dbUser.workspaceId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        assignedToId: true,
        assignedById: true,
        assignmentStatus: true,
        assignedAt: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Get this specific user's workspace info
    const workspace = await db.workspace.findUnique({
      where: { id: dbUser.workspaceId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Get contacts visible to current user based on role
    let visibleContacts = allContacts;
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      visibleContacts = allContacts.filter(c => c.assignedToId === dbUser.id);
    }

    return NextResponse.json({
      currentUser: {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
        email: dbUser.email,
      },
      workspace: {
        id: workspace?.id,
        name: workspace?.businessName,
        userCount: workspace?.users.length,
        users: workspace?.users,
      },
      assignmentData: {
        totalContacts: allContacts.length,
        contactsVisibleToUser: visibleContacts.length,
        allContactsWithAssignments: allContacts,
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
