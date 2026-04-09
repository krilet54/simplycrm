// Test endpoint to simulate assignment and check if agent can see it
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Get any workspace with agents
    const workspace = await db.workspace.findFirst({
      include: {
        users: true,
        contacts: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            assignedToId: true,
            assignedById: true,
            assignmentStatus: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const owner = workspace.users.find(u => u.role === 'OWNER');
    const agent = workspace.users.find(u => u.role === 'AGENT');

    if (!owner || !agent) {
      return NextResponse.json(
        { error: 'Owner or agent not found' },
        { status: 404 }
      );
    }

    // Get first contact
    const contact = workspace.contacts[0];
    if (!contact) {
      return NextResponse.json({ error: 'No contacts in workspace' }, { status: 404 });
    }

    // Now test: Agent should only see contacts assigned to them
    const agentContacts = await db.contact.findMany({
      where: {
        workspaceId: workspace.id,
        assignedToId: agent.id,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        assignedToId: true,
      },
    });

    // Get all contacts with assignment info
    const allContactsWithAssignments = await db.contact.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        assignedToId: true,
        assignedById: true,
        assignmentStatus: true,
      },
    });

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.businessName,
      },
      users: {
        owner: { id: owner.id, name: owner.name, email: owner.email },
        agent: { id: agent.id, name: agent.name, email: agent.email },
      },
      contactAnalysis: {
        testContact: contact,
        agentContactCount: agentContacts.length,
        agentCanSee: agentContacts,
        allContacts: allContactsWithAssignments,
      },
      expectedBehavior: `Agent (${agent.name}) should see contacts where assignedToId = ${agent.id}`,
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
