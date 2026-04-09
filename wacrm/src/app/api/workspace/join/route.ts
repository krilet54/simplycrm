// src/app/api/workspace/join/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';
import { z } from 'zod';

const joinSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const result = joinSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }

    const { fullName, phone } = result.data;

    // Find and update the user
    const dbUser = await db.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: dbUser.id },
      data: {
        name: fullName,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('POST /api/workspace/join error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
