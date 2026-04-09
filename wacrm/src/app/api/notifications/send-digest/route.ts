// src/app/api/notifications/send-digest/route.ts
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Simple email sending (would use SendGrid, Resend, or similar in production)
async function sendEmail(to: string, subject: string, html: string) {
  // Using a placeholder - integrate with your email provider
  console.log(`Email to ${to}: ${subject}`);
  
  // Example with Resend API:
  // const response = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     from: 'noreply@crebo.io',
  //     to,
  //     subject,
  //     html,
  //   }),
  // });
  // return response.json();
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a scheduled job (e.g., Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all workspaces with users
    const workspaces = await db.workspace.findMany({
      include: {
        users: true,
        contacts: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { lastActivityAt: 'desc' },
        },
      },
    });

    for (const workspace of workspaces) {
      for (const user of workspace.users) {
        // Get user stats for the digest
        const [overdueCount, newContacts, closedDeals] = await Promise.all([
          // Contacts with no activity in 48 hours
          db.contact.count({
            where: {
              workspaceId: workspace.id,
              OR: [
                { lastActivityAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
                { lastActivityAt: null },
              ],
            },
          }),
          // New contacts added today
          db.contact.count({
            where: {
              workspaceId: workspace.id,
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          }),
          // Deals closed today
          db.invoice.count({
            where: {
              workspaceId: workspace.id,
              status: 'PAID',
              paidAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          }),
        ]);

        // Send digest email
        const digestHtml = `
          <h2>Your Daily CRM Digest</h2>
          <p>Good morning <strong>${user.name}</strong>,</p>
          <p>Here's your ${workspace.businessName} summary:</p>
          <ul>
            <li>⏰ <strong>${overdueCount}</strong> contacts with no recent activity</li>
            <li>✨ <strong>${newContacts}</strong> new contacts added today</li>
            <li>💰 <strong>${closedDeals}</strong> deals closed today</li>
          </ul>
          <p><a href="${process.env.APP_URL}/dashboard">View Dashboard →</a></p>
        `;

        await sendEmail(user.email, `Daily Digest - ${workspace.businessName}`, digestHtml);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending digest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
