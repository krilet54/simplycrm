// src/lib/whatsapp.ts
import axios from 'axios';
import type { Workspace } from '@prisma/client';
import { db } from '@/lib/db';

const GRAPH_API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface SendTextMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;          // recipient phone number with country code, no +
  body: string;
}

export interface SendTemplateMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode?: string;
  components?: object[];
}

export interface MarkReadParams {
  phoneNumberId: string;
  accessToken: string;
  wamid: string;
}

// ─── Get WhatsApp credentials (OAuth or legacy) ────────────────────────────
export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  source: 'oauth' | 'legacy';
}

export async function getWhatsAppCredentials(workspace: Workspace): Promise<WhatsAppCredentials> {
  // First: Try OAuth token (new path)
  const oauthToken = await db.metaOAuthToken.findUnique({
    where: { workspaceId: workspace.id }
  });

  if (oauthToken) {
    return {
      phoneNumberId: oauthToken.phoneNumberId,
      accessToken: oauthToken.accessToken,
      source: 'oauth'
    };
  }

  // Fallback: Legacy token in workspace (backward compatibility)
  if (workspace.whatsappPhoneNumberId && workspace.whatsappAccessToken) {
    return {
      phoneNumberId: workspace.whatsappPhoneNumberId,
      accessToken: workspace.whatsappAccessToken,
      source: 'legacy'
    };
  }

  throw new Error('WhatsApp not connected. Configure via Settings > WhatsApp.');
}

// ─── Send a plain text message ────────────────────────────────────────────────
export async function sendTextMessage({
  phoneNumberId,
  accessToken,
  to,
  body,
}: SendTextMessageParams) {
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  };

  const { data } = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // data.messages[0].id is the wamid
  return data as { messages: [{ id: string }] };
}

// ─── Send a template message ──────────────────────────────────────────────────
export async function sendTemplateMessage({
  phoneNumberId,
  accessToken,
  to,
  templateName,
  languageCode = 'en_US',
  components = [],
}: SendTemplateMessageParams) {
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  const { data } = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return data;
}

// ─── Mark a message as read ───────────────────────────────────────────────────
export async function markMessageRead({
  phoneNumberId,
  accessToken,
  wamid,
}: MarkReadParams) {
  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  await axios.post(
    url,
    { messaging_product: 'whatsapp', status: 'read', message_id: wamid },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
}

// ─── Parse incoming webhook payload ──────────────────────────────────────────
export interface ParsedInboundMessage {
  wamid: string;
  from: string;     // phone number
  type: string;
  text?: string;
  mediaId?: string;
  timestamp: Date;
  phoneNumberId: string;
}

export function parseWebhookPayload(body: {
  entry: Array<{
    changes: Array<{
      value: {
        metadata: { phone_number_id: string };
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          timestamp: string;
          text?: { body: string };
          image?: { id: string };
          audio?: { id: string };
          video?: { id: string };
          document?: { id: string };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          recipient_id: string;
        }>;
      };
    }>;
  }>;
}): {
  messages: ParsedInboundMessage[];
  statuses: Array<{ wamid: string; status: string }>;
} {
  const messages: ParsedInboundMessage[] = [];
  const statuses: Array<{ wamid: string; status: string }> = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      for (const msg of value.messages ?? []) {
        messages.push({
          wamid: msg.id,
          from: msg.from,
          type: msg.type,
          text: msg.text?.body,
          mediaId: msg.image?.id ?? msg.audio?.id ?? msg.video?.id ?? msg.document?.id,
          timestamp: new Date(parseInt(msg.timestamp) * 1000),
          phoneNumberId,
        });
      }

      for (const status of value.statuses ?? []) {
        statuses.push({ wamid: status.id, status: status.status });
      }
    }
  }

  return { messages, statuses };
}
