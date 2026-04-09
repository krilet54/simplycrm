// src/lib/email.ts
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

let resend: any = null;

function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface Attachment {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface SendEmailParams {
  workspaceId: string;
  contactId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  actorId?: string;
  attachments?: Attachment[];
}

/**
 * Send email via Resend
 */
export async function sendEmail({
  workspaceId,
  contactId,
  from,
  to,
  subject,
  body,
  actorId,
  attachments,
}: SendEmailParams) {
  try {
    // Create email record first
    const email = await db.email.create({
      data: {
        workspaceId,
        contactId,
        from,
        to,
        subject,
        body,
        status: 'DRAFT',
      },
    });

    // Prepare attachments for Resend
    const resendAttachments = attachments?.map((att) => ({
      filename: att.name,
      content: att.base64,
    }));

    // Send via Resend
    // Use verified sender email or Resend's test email for development
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const resendClient = getResend();
    const result = await resendClient.emails.send({
      from: senderEmail,
      to,
      subject,
      html: formatEmailBody(body),
      attachments: resendAttachments,
    });

    if (result.error) {
      // Update status to FAILED
      await db.email.update({
        where: { id: email.id },
        data: { status: 'FAILED' },
      });
      throw new Error(result.error.message || 'Email send failed');
    }

    // Update email status to SENT
    const sentEmail = await db.email.update({
      where: { id: email.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    // Update contact's lastActivityAt
    await db.contact.update({
      where: { id: contactId },
      data: { lastActivityAt: new Date() },
    });

    // Log activity
    const { logActivity } = await import('@/lib/activity');
    await logActivity({
      workspaceId,
      contactId,
      type: 'EMAIL',
      authorId: actorId || '',
      content: `Email sent: "${subject}" to ${to}${attachments?.length ? ` (${attachments.length} attachment${attachments.length > 1 ? 's' : ''})` : ''}`,
    });

    return sentEmail;
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
}

/**
 * Format plain text email body to HTML
 */
function formatEmailBody(body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto;">
        ${body
          .split('\n')
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('')}
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #999; margin-top: 16px;">
          Sent from Crebo
        </p>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Get emails for a contact
 */
export async function getContactEmails(contactId: string, workspaceId: string) {
  return db.email.findMany({
    where: { contactId, workspaceId },
    orderBy: { sentAt: 'desc' },
  });
}

/**
 * Get all workspace emails
 */
export async function getWorkspaceEmails(workspaceId: string, status?: string) {
  return db.email.findMany({
    where: {
      workspaceId,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      contact: { select: { id: true, name: true, phoneNumber: true } },
    },
    orderBy: { sentAt: 'desc' },
  });
}

/**
 * Get email statistics
 */
export async function getEmailStats(workspaceId: string) {
  const [totalSent, failedEmails, draftEmails] = await Promise.all([
    db.email.count({ where: { workspaceId, status: 'SENT' } }),
    db.email.count({ where: { workspaceId, status: 'FAILED' } }),
    db.email.count({ where: { workspaceId, status: 'DRAFT' } }),
  ]);

  return { totalSent, failedEmails, draftEmails };
}
