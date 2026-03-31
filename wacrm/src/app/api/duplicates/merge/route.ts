// src/app/api/duplicates/merge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { mergeContacts } from '@/lib/duplicates';
import { z } from 'zod';

const mergeSchema = z.object({
  keepId: z.string().uuid(),
  mergeId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only OWNER and ADMIN can merge
  if (dbUser.role !== 'OWNER' && dbUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { keepId, mergeId } = parsed.data;

  // Verify both contacts belong to workspace
  const [keepContact, mergeContact] = await Promise.all([
    db.contact.findFirst({ where: { id: keepId, workspaceId: dbUser.workspaceId } }),
    db.contact.findFirst({ where: { id: mergeId, workspaceId: dbUser.workspaceId } }),
  ]);

  if (!keepContact || !mergeContact) {
    return NextResponse.json({ error: 'One or both contacts not found' }, { status: 404 });
  }

  try {
    const result = await mergeContacts(
      dbUser.workspaceId,
      keepId,
      mergeId,
      dbUser.id
    );

    return NextResponse.json({ contact: result });
  } catch (error) {
    console.error('Merge failed:', error);
    return NextResponse.json(
      { error: 'Failed to merge contacts' },
      { status: 500 }
    );
  }
}
