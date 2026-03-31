import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';

// Disconnect WhatsApp OAuth
export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase session
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get workspace from user
    const workspaceUser = await db.user.findUnique({
      where: {
        supabaseId: user.id,
      },
    });

    if (!workspaceUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has OWNER or ADMIN role
    if (workspaceUser.role !== 'OWNER' && workspaceUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only OWNER and ADMIN can disconnect WhatsApp' },
        { status: 403 }
      );
    }

    // Delete MetaOAuthToken
    await db.metaOAuthToken.delete({
      where: {
        workspaceId: workspaceUser.workspaceId,
      },
    }).catch(() => {
      // Token doesn't exist, that's fine
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect WhatsApp' },
      { status: 500 }
    );
  }
}
