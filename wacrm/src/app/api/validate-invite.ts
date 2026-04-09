import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const inviteId = req.nextUrl.searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
    }

    const invite = await db.invite.findUnique({
      where: { id: inviteId },
      include: { workspace: true },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Check if invite has expired
    if (new Date() > invite.expiresAt) {
      await db.invite.update({
        where: { id: inviteId },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'Invitation has expired. Please contact your workspace admin to send a new invite.' },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invite.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This invitation has already been used.' },
        { status: 400 }
      );
    }

    // Return invite details
    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        workspaceName: invite.workspace.businessName,
        workspaceId: invite.workspaceId,
      },
    });
  } catch (error) {
    console.error('🔴 GET /api/validate-invite error:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite' },
      { status: 500 }
    );
  }
}
