import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST create workspace user for invited person
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supabaseId, email, fullName, workspaceId, role } = body;

    if (!supabaseId || !email || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check workspace exists
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Create user in workspace
    const user = await db.user.create({
      data: {
        supabaseId,
        workspaceId,
        name: fullName || email.split('@')[0],
        email,
        role: role || 'AGENT',
      },
    });

    // Try to delete the pending user record if it exists
    try {
      await db.user.deleteMany({
        where: {
          workspaceId,
          email,
          supabaseId: {
            startsWith: 'pending_',
          },
        },
      });
    } catch (err) {
      // Ignore error if pending user doesn't exist
      console.log('Note: No pending user record to delete');
    }

    return NextResponse.json({
      success: true,
      message: 'Workspace user created successfully',
      user,
    });
  } catch (error) {
    console.error('POST /api/workspace/join-invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
