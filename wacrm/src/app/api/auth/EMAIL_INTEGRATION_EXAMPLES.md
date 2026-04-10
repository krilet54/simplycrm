// EXAMPLE: src/app/api/auth/welcome-example.ts
// This is an EXAMPLE file showing how to use the new email templates
// Copy the patterns to your actual API routes

import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email-helpers';
import { db } from '@/lib/db';

/**
 * EXAMPLE: How to send welcome email after user signs up
 * 
 * Usage:
 * POST /api/auth/welcome-example
 * Body: { userId: "xxx", email: "user@example.com" }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    // Get user and workspace details
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { workspace: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Send welcome email with your custom domain
    await sendWelcomeEmail(
      email,
      user.name,
      {
        businessName: user.workspace.businessName,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.simplycrm.io',
        supportEmail: process.env.SUPPORT_EMAIL,
        domain: process.env.NEXT_PUBLIC_APP_DOMAIN,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
    });
  } catch (error) {
    console.error('Welcome email error:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}

/**
 * EXAMPLE: How to update your existing signup to use new templates
 * 
 * In your signup API (e.g., /api/onboarding):
 */

// OLD CODE:
/*
export async function POST(req: NextRequest) {
  // ... create workspace, user, etc
  
  // Don't do this anymore:
  // await sendEmail({ to: user.email, subject: "Welcome", body: "..." })
}
*/

// NEW CODE (use this pattern):
/*
import { sendWelcomeEmail, sendVerificationEmail } from '@/lib/email-helpers';

export async function POST(req: NextRequest) {
  // ... create workspace and user
  
  const workspace = await db.workspace.create({ ... });
  const user = await db.user.create({ ... });
  
  // OPTION 1: Send welcome email immediately
  try {
    await sendWelcomeEmail(
      user.email,
      user.name,
      {
        businessName: workspace.businessName,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supportEmail: 'support@yourdomain.com',
      }
    );
  } catch (emailError) {
    // Email failed but user was created - log and continue
    console.error('Failed to send welcome email:', emailError);
  }
  
  // OPTION 2: Send verification email first
  const verificationToken = generateToken();
  try {
    await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken,
      {
        businessName: workspace.businessName,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supportEmail: 'support@yourdomain.com',
      }
    );
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
  }
  
  return NextResponse.json({
    workspace,
    user,
    message: 'Account created! Check your email to verify.',
  });
}
*/

/**
 * EXAMPLE: How to send invoice emails
 */

// In your invoice API route (e.g., /api/invoices/send):
/*
import { sendInvoiceEmail } from '@/lib/email-helpers';

export async function POST(req: NextRequest) {
  const { invoiceId, contactId } = await req.json();
  
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { contact: true, workspace: true },
  });
  
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
  
  // Send invoice email
  try {
    await sendInvoiceEmail(
      invoice.contact.email,
      invoice.contact.name,
      {
        number: invoice.number,
        amount: `₹${invoice.total}`,
        dueDate: invoice.dueDate.toLocaleDateString('en-IN'),
        id: invoice.id,
      },
      {
        businessName: invoice.workspace.businessName,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supportEmail: 'billing@yourdomain.com',
      }
    );
    
    // Update invoice status
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT', sentAt: new Date() },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invoice send error:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}
*/

/**
 * EXAMPLE: How to send task assignment notifications
 */

// In your task assignment API:
/*
import { sendTaskAssignmentEmail } from '@/lib/email-helpers';

export async function POST(req: NextRequest) {
  const { taskId, assignedToId } = await req.json();
  
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: true,
      createdBy: true,
      workspace: true,
    },
  });
  
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  
  // Send email to assignee
  try {
    await sendTaskAssignmentEmail(
      task.assignedTo.email,
      task.assignedTo.name,
      task.createdBy.name,
      {
        title: task.title,
        dueDate: task.dueDate
          ? task.dueDate.toLocaleDateString('en-IN')
          : undefined,
        id: task.id,
      },
      {
        businessName: task.workspace.businessName,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supportEmail: 'support@yourdomain.com',
      }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task assignment email error:', error);
    // Don't fail the whole request if email fails
    return NextResponse.json({
      success: true,
      warning: 'Task created but email notification failed',
    });
  }
}
*/

/**
 * EXAMPLE: Cron job for trial expiring soon
 */

// In your cron job (e.g., /api/cron/trial-expiry):
/*
import { sendTrialEndingSoonEmail } from '@/lib/email-helpers';

export async function GET(req: NextRequest) {
  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  // Find workspaces with trials ending in next 3 days
  const expiringTrials = await db.workspace.findMany({
    where: {
      plan: 'TRIAL',
      trialEndsAt: {
        gte: now,
        lte: inThreeDays,
      },
    },
    include: {
      users: { where: { role: 'OWNER' } },
    },
  });
  
  let emailsSent = 0;
  
  for (const workspace of expiringTrials) {
    const owner = workspace.users[0];
    const daysLeft = Math.ceil(
      (workspace.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    try {
      await sendTrialEndingSoonEmail(
        owner.email,
        owner.name,
        daysLeft,
        {
          businessName: workspace.businessName,
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
          supportEmail: 'support@yourdomain.com',
        }
      );
      emailsSent++;
    } catch (error) {
      console.error(`Failed to send trial expiry email to ${owner.email}:`, error);
    }
  }
  
  return NextResponse.json({
    success: true,
    emailsSent,
    message: `Sent ${emailsSent} trial expiry reminders`,
  });
}
*/

export default async function handler(req: NextRequest) {
  return NextResponse.json({
    message: 'This is an example file. Copy the patterns to your actual API routes.',
  });
}
