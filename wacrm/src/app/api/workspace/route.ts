// src/app/api/workspace/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const schema = z.object({
  businessName:          z.string().min(1).max(100).optional(),
  whatsappPhoneNumberId: z.string().optional().nullable(),
  whatsappAccessToken:   z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser || !['OWNER', 'ADMIN'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Only update access token if explicitly provided (non-empty string)
  const data: Record<string, unknown> = {};
  if (parsed.data.businessName !== undefined)          data.businessName          = parsed.data.businessName;
  if (parsed.data.whatsappPhoneNumberId !== undefined) data.whatsappPhoneNumberId = parsed.data.whatsappPhoneNumberId;
  if (parsed.data.whatsappAccessToken)                 data.whatsappAccessToken   = parsed.data.whatsappAccessToken;

  const workspace = await db.workspace.update({
    where: { id: dbUser.workspaceId },
    data,
  });

  return NextResponse.json({ workspace });
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const workspace = await db.workspace.findUnique({
    where: { id: dbUser.workspaceId },
    select: {
      id: true,
      businessName: true,
      plan: true,
      whatsappPhoneNumberId: true,
      // Never expose access token
    },
  });

  return NextResponse.json({ workspace });
}
