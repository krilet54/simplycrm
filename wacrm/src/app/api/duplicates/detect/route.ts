// src/app/api/duplicates/detect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { findDuplicates } from '@/lib/duplicates';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const threshold = parseFloat(searchParams.get('threshold') ?? '0.8');

  try {
    const duplicates = await findDuplicates(dbUser.workspaceId, threshold);

    return NextResponse.json({
      duplicates: duplicates.slice(0, 50), // Limit to top 50
      total: duplicates.length,
    });
  } catch (error) {
    console.error('Duplicate detection failed:', error);
    return NextResponse.json(
      { error: 'Failed to detect duplicates' },
      { status: 500 }
    );
  }
}
