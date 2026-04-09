// src/app/api/cron/trial-expiry/route.ts
// Cron job to send trial expiry emails
// Runs daily at 8am via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find workspaces whose trial expired in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const expiredWorkspaces = await db.workspace.findMany({
      where: {
        trialEndsAt: {
          gte: yesterday,
          lte: now,
        },
        stripeSubscriptionId: null, // Not subscribed
      },
      include: {
        users: {
          where: { role: 'OWNER' },
          select: { name: true, email: true },
        },
        _count: {
          select: {
            contacts: true,
            invoices: true,
            tasks: { where: { status: 'DONE' } },
          },
        },
      },
    });

    // Send emails
    const results = await Promise.allSettled(
      expiredWorkspaces.map(async (workspace) => {
        const owner = workspace.users[0];
        if (!owner) return;

        await resend.emails.send({
          from: 'Crebo <noreply@crebo.io>',
          to: owner.email,
          subject: 'Your Crebo trial has ended — your data is safe',
          html: `
            <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <p>Hi ${owner.name || 'there'},</p>
              
              <p>Your 14-day free trial of Crebo ended today.</p>
              
              <p><strong>Your data is safe.</strong> We will keep everything for 30 days while you decide.</p>
              
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-weight: 600;">What you have built:</p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>${workspace._count.contacts} contacts added</li>
                  <li>${workspace._count.invoices} invoices created</li>
                  <li>${workspace._count.tasks} tasks completed</li>
                </ul>
              </div>
              
              <p>To keep everything and continue:</p>
              
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings#billing" 
                   style="display: inline-block; background: #1e6926; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Choose a plan →
                </a>
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
                If you need more time or have questions, just reply to this email or WhatsApp us. 
                We are a small team and we read every message.
              </p>
              
              <p style="color: #6b7280;">
                — The Crebo Team
              </p>
            </div>
          `,
        });
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: expiredWorkspaces.length,
    });
  } catch (error) {
    console.error('Trial expiry cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process trial expiry' },
      { status: 500 }
    );
  }
}
