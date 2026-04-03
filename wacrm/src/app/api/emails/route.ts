// src/app/api/emails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

// ── POST /api/emails ───────────────────────────────────────────────────────
const attachmentSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  base64: z.string(),
});

const createEmailSchema = z.object({
  contactId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(5000),
  sendNow: z.boolean().default(false),
  attachments: z.array(attachmentSchema).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = createEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { contactId, to, subject, body: emailBody, sendNow, attachments } = parsed.data;

  // Verify contact belongs to workspace
  const contact = await db.contact.findFirst({
    where: { id: contactId, workspaceId: dbUser.workspaceId },
  });
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  // Get workspace email (from admin user)
  const workspace = await db.workspace.findUnique({
    where: { id: dbUser.workspaceId },
    include: { users: { where: { role: 'OWNER' }, take: 1 } },
  });

  if (!workspace?.users[0]?.email) {
    return NextResponse.json(
      { error: 'Workspace email not configured. Please set up an owner email in settings.' },
      { status: 400 }
    );
  }

  // Check if Resend is configured
  if (sendNow && !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email service not configured. Please add RESEND_API_KEY to your environment.' },
      { status: 400 }
    );
  }

  try {
    if (sendNow) {
      // Send immediately
      const email = await sendEmail({
        workspaceId: dbUser.workspaceId,
        contactId,
        from: workspace.users[0].email,
        to,
        subject,
        body: emailBody,
        actorId: dbUser.id,
        attachments,
      });
      return NextResponse.json({ email }, { status: 201 });
    } else {
      // Create as DRAFT
      const email = await db.email.create({
        data: {
          workspaceId: dbUser.workspaceId,
          contactId,
          from: workspace.users[0].email,
          to,
          subject,
          body: emailBody,
          status: 'DRAFT',
        },
        include: { contact: { select: { id: true, name: true, phoneNumber: true } } },
      });
      return NextResponse.json({ email }, { status: 201 });
    }
  } catch (error) {
    console.error('Email creation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// ── GET /api/emails ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const contactId = searchParams.get('contactId');

  const where: any = { workspaceId: dbUser.workspaceId };
  if (status) where.status = status;
  if (contactId) where.contactId = contactId;

  const emails = await db.email.findMany({
    where,
    include: {
      contact: { select: { id: true, name: true, phoneNumber: true } },
    },
    orderBy: { sentAt: 'desc' },
  });

  return NextResponse.json({ emails });
}
