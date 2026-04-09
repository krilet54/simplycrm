// Create Supabase auth user and link to workspace user
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const email = 'kirpessh54@gmail.com';
    const password = '123456789';
    const workspaceId = '74b72bd7-54af-4ac3-9bd5-af88f09eaa82';

    // Create Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Auth creation failed: ${authError.message}`);
    }

    if (!authUser.user) {
      throw new Error('No auth user returned');
    }

    const supabaseId = authUser.user.id;
    console.log('✅ Created Supabase auth user:', supabaseId);

    // Find the workspace user
    const workspaceUser = await db.user.findFirst({
      where: {
        email,
        workspaceId,
      },
    });

    if (!workspaceUser) {
      throw new Error('Workspace user not found');
    }

    // Update workspace user with real supabaseId
    const updatedUser = await db.user.update({
      where: {
        id: workspaceUser.id,
      },
      data: {
        supabaseId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Auth user created and linked to workspace!',
      auth: {
        supabaseId,
        email,
      },
      user: updatedUser,
      nextStep: `Now login at http://localhost:3003 with email: ${email}, password: ${password}`,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
