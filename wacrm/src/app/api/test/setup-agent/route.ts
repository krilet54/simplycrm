// Quick setup endpoint for testing
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Create workspace
    const workspace = await db.workspace.create({
      data: {
        businessName: 'microsite studio',
      },
    });

    // 2. Create agent user (this will need Supabase auth in real scenario)
    const agent = await db.user.create({
      data: {
        workspaceId: workspace.id,
        supabaseId: `test_agent_${Date.now()}`,
        name: 'Test Agent',
        email: 'kirpessh54@gmail.com',
        role: 'AGENT',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Test agent setup complete!',
      workspace: {
        id: workspace.id,
        name: workspace.businessName,
      },
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        workspaceId: agent.workspaceId,
      },
      nextSteps: [
        '1. Go to Supabase console',
        '2. Create auth user: kirpessh54@gmail.com / password: 123456789',
        '3. Use the supabaseId from that user to update the agent record',
        '4. Then login at http://localhost:3003 with those credentials',
      ],
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
