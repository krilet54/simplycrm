// src/lib/email.ts
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

let resend: any = null;

function getResend() {
  if (!resend) {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface SendEmailParams {
  workspaceId: string;
  contactId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  actorId?: string;
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

    // Send via Resend
    const resendClient = getResend();
    const result = await resendClient.emails.send({
      from,
      to,
      subject,
      html: formatEmailBody(body),
    });

    if (result.error) {
      // Update status to FAILED
      await db.email.update({
        where: { id: email.id },
        data: { status: 'FAILED' },
      });
      throw result.error;
    }

    // Update email status to SENT
    const sentEmail = await db.email.update({
      where: { id: email.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    // Log activity
    const { logActivity } = await import('@/lib/activity');
    await logActivity({
      workspaceId,
      contactId,
      activityType: 'EMAIL_SENT',
      actorId: actorId || '',
      title: `Email sent: "${subject}"`,
      description: `To: ${to}`,
      metadata: { emailId: email.id, subject },
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
          Sent from WACRM
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
