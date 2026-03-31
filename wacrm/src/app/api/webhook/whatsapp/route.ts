// src/app/api/webhook/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseWebhookPayload, markMessageRead } from '@/lib/whatsapp';
import crypto from 'crypto';

// ─── GET: Meta webhook verification ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ─── POST: Receive messages and status updates ────────────────────────────────
export async function POST(req: NextRequest) {
  // Verify signature from Meta
  const rawBody    = await req.text();
  const signature  = req.headers.get('x-hub-signature-256') ?? '';
  const appSecret  = process.env.WHATSAPP_APP_SECRET ?? '';

  if (appSecret) {
    const expectedSig = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;

    if (signature !== expectedSig) {
      return new NextResponse('Invalid signature', { status: 401 });
    }
  }

  const body = JSON.parse(rawBody);
  const { messages, statuses } = parseWebhookPayload(body);

  // ── Handle inbound messages ──────────────────────────────────────────────
  for (const msg of messages) {
    // Find workspace by phone number ID
    const workspace = await db.workspace.findFirst({
      where: { whatsappPhoneNumberId: msg.phoneNumberId },
    });
    if (!workspace) continue;

    // Upsert contact
    let contact = await db.contact.findUnique({
      where: {
        workspaceId_phoneNumber: {
          workspaceId: workspace.id,
          phoneNumber: msg.from,
        },
      },
    });

    if (!contact) {
      // Find default kanban stage
      const defaultStage = await db.kanbanStage.findFirst({
        where: { workspaceId: workspace.id, isDefault: true },
        orderBy: { position: 'asc' },
      });

      contact = await db.contact.create({
        data: {
          workspaceId: workspace.id,
          phoneNumber: msg.from,
          name: msg.from, // Name populated later via profile API or manual edit
          kanbanStageId: defaultStage?.id,
        },
      });
    }

    // Skip duplicate messages (Meta can send duplicates)
    if (msg.wamid) {
      const exists = await db.message.findUnique({ where: { wamid: msg.wamid } });
      if (exists) continue;
    }

    // Map type
    const typeMap: Record<string, 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'> = {
      text: 'TEXT', image: 'IMAGE', audio: 'AUDIO', video: 'VIDEO', document: 'DOCUMENT',
    };

    await db.message.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        wamid: msg.wamid,
        senderType: 'CUSTOMER',
        type: typeMap[msg.type] ?? 'TEXT',
        content: msg.text ?? `[${msg.type} message]`,
        status: 'DELIVERED',
        timestamp: msg.timestamp,
      },
    });

    // Update contact's lastMessageAt
    await db.contact.update({
      where: { id: contact.id },
      data: { lastMessageAt: msg.timestamp },
    });

    // Auto mark as read via API
    if (workspace.whatsappAccessToken && msg.wamid) {
      markMessageRead({
        phoneNumberId: msg.phoneNumberId,
        accessToken: workspace.whatsappAccessToken,
        wamid: msg.wamid,
      }).catch(console.error);
    }
  }

  // ── Handle status updates ────────────────────────────────────────────────
  for (const statusUpdate of statuses) {
    const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
      sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED',
    };
    const mapped = statusMap[statusUpdate.status];
    if (!mapped) continue;

    await db.message.updateMany({
      where: { wamid: statusUpdate.wamid },
      data: { status: mapped },
    });
  }

  return NextResponse.json({ success: true });
}
