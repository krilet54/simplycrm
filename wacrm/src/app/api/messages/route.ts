// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendTextMessage, getWhatsAppCredentials } from '@/lib/whatsapp';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

// ── GET /api/messages?contactId=xxx ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get('contactId');
  const cursor    = searchParams.get('cursor');
  const limit     = parseInt(searchParams.get('limit') ?? '50');

  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });

  // Ensure contact belongs to same workspace
  const contact = await db.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const messages = await db.message.findMany({
    where: { contactId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      agent: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  // Mark unread messages as read
  await db.message.updateMany({
    where: { contactId, senderType: 'CUSTOMER', isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ messages: messages.reverse() });
}

// ── POST /api/messages - send a message ───────────────────────────────────────
const sendSchema = z.object({
  contactId: z.string().uuid(),
  content: z.string().min(1).max(4096),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({
    where: { supabaseId: user.id },
    include: { workspace: true },
  });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { contactId, content } = parsed.data;

  const contact = await db.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const { workspace } = dbUser;

  // Create message record optimistically
  const message = await db.message.create({
    data: {
      workspaceId: workspace.id,
      contactId,
      agentId: dbUser.id,
      senderType: 'AGENT',
      type: 'TEXT',
      content,
      status: 'SENDING',
    },
    include: { agent: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Send via WhatsApp API
  try {
    const credentials = await getWhatsAppCredentials(workspace);
    const result = await sendTextMessage({
      phoneNumberId: credentials.phoneNumberId,
      accessToken: credentials.accessToken,
      to: contact.phoneNumber,
      body: content,
    });

    await db.message.update({
      where: { id: message.id },
      data: {
        wamid: result.messages[0].id,
        status: 'SENT',
      },
    });
  } catch (err) {
    console.error('WhatsApp send error:', err);
    await db.message.update({
      where: { id: message.id },
      data: { status: 'FAILED' },
    });
  }

  // Update contact lastMessageAt
  await db.contact.update({
    where: { id: contactId },
    data: { lastMessageAt: new Date() },
  });

  const final = await db.message.findUnique({
    where: { id: message.id },
    include: { agent: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Log activity: Message sent
  await logActivity({
    workspaceId: workspace.id,
    contactId,
    activityType: 'MESSAGE_SENT',
    actorId: dbUser.id,
    title: `Message sent to ${contact.name || contact.phoneNumber}`,
    description: content.substring(0, 100),
    metadata: { messageId: message.id, status: final?.status },
  });

  return NextResponse.json({ message: final });
}
