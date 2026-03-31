// src/app/api/emails/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

// ── PATCH /api/emails/[id] ─────────────────────────────────────────────────
const updateEmailSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  sendNow: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const email = await db.email.findUnique({ where: { id: params.id } });
  if (!email || email.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  // Only allow updates on DRAFT emails
  if (email.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Can only update DRAFT emails' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = updateEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { subject, body: emailBody, sendNow } = parsed.data;

  try {
    if (sendNow) {
      // Send the email
      const sentEmail = await sendEmail({
        workspaceId: email.workspaceId,
        contactId: email.contactId,
        from: email.from,
        to: email.to,
        subject: subject || email.subject,
        body: emailBody || email.body,
        actorId: dbUser.id,
      });
      return NextResponse.json({ email: sentEmail });
    } else {
      // Update as DRAFT
      const updated = await db.email.update({
        where: { id: params.id },
        data: {
          ...(subject && { subject }),
          ...(emailBody && { body: emailBody }),
        },
      });
      return NextResponse.json({ email: updated });
    }
  } catch (error) {
    console.error('Email update failed:', error);
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }
}

// ── DELETE /api/emails/[id] ────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const email = await db.email.findUnique({ where: { id: params.id } });
  if (!email || email.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  // Only allow deletion of DRAFT emails
  if (email.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Can only delete DRAFT emails' },
      { status: 400 }
    );
  }

  await db.email.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
