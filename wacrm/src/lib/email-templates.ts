// src/lib/email-templates.ts
// Beautiful, professional email templates

export interface EmailTemplateContext {
  recipientName?: string;
  businessName?: string;
  actionUrl?: string;
  supportEmail?: string;
  year?: number;
}

// Base email wrapper with your branding
function emailWrapper(content: string, context: EmailTemplateContext = {}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
          }
          .header {
            background: linear-gradient(135deg, #1a7f64 0%, #15634f 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px 30px;
          }
          .button {
            display: inline-block;
            background: #1a7f64;
            color: white;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
            transition: background 0.2s;
          }
          .button:hover {
            background: #15634f;
          }
          .button-secondary {
            background: #f0f0f0;
            color: #333;
          }
          .button-secondary:hover {
            background: #e0e0e0;
          }
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            font-size: 13px;
            color: #666;
            border-top: 1px solid #e0e0e0;
          }
          .divider {
            height: 1px;
            background: #e0e0e0;
            margin: 30px 0;
          }
          .highlight {
            background: #f0f9f7;
            padding: 20px;
            border-left: 4px solid #1a7f64;
            border-radius: 4px;
            margin: 20px 0;
          }
          h1 { font-size: 24px; margin-bottom: 20px; color: #1a1a1a; }
          h2 { font-size: 18px; margin-bottom: 15px; color: #1a1a1a; }
          p { margin-bottom: 15px; }
          .signature { margin-top: 30px; }
          .social { margin-top: 20px; }
          .social a {
            display: inline-block;
            margin: 0 10px;
            color: #1a7f64;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">C</div>
            <div style="font-size: 14px; opacity: 0.9;">${context.businessName || 'SimplyCRM'}</div>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>© ${context.year || new Date().getFullYear()} ${context.businessName || 'SimplyCRM'}. All rights reserved.</p>
            <p>Questions? <a href="mailto:${context.supportEmail || 'support@simplycrm.io'}" style="color: #1a7f64; text-decoration: none;">${context.supportEmail || 'support@simplycrm.io'}</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// 1. Welcome Email (New Signup)
export function welcomeEmailTemplate(context: EmailTemplateContext & { email: string }) {
  const content = `
    <h1>Welcome to SimplyCRM! 🎉</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p>Your account has been created successfully. You're ready to manage your business relationships like never before.</p>
    
    <div class="highlight">
      <strong>Here's what you can do:</strong>
      <ul style="margin-left: 20px; margin-top: 10px;">
        <li>Manage all your contacts in one place</li>
        <li>Track conversations and follow-ups</li>
        <li>Create and send invoices instantly</li>
        <li>Collaborate with your team</li>
        <li>Never miss a follow-up with smart reminders</li>
      </ul>
    </div>

    <p style="text-align: center; margin-top: 30px;">
      <a href="${context.actionUrl || 'https://app.simplycrm.io/dashboard'}" class="button">Get Started →</a>
    </p>

    <p style="margin-top: 30px;">Need help? Check out our <a href="https://docs.simplycrm.io" style="color: #1a7f64;">documentation</a> or reach out to support.</p>

    <div class="signature">
      <p>Cheers,<br>The SimplyCRM Team</p>
    </div>
  `;
  return emailWrapper(content, context);
}

// 2. Email Verification
export function verificationEmailTemplate(context: EmailTemplateContext & { verificationUrl: string }) {
  const content = `
    <h1>Verify Your Email Address</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p>We received a signup request for this email address. Click the button below to verify and activate your account.</p>

    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.verificationUrl}" class="button">Verify Email Address</a>
    </p>

    <p style="font-size: 13px; color: #666;">If the button doesn't work, copy this link: <br><span style="word-break: break-all; color: #999;">${context.verificationUrl}</span></p>

    <p style="margin-top: 30px; font-size: 13px; color: #999;">Didn't create this account? You can ignore this email.</p>
  `;
  return emailWrapper(content, context);
}

// 3. Password Reset
export function passwordResetEmailTemplate(context: EmailTemplateContext & { resetUrl: string }) {
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p>We received a request to reset your password. Click the button below to create a new password.</p>

    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.resetUrl}" class="button">Reset Password</a>
    </p>

    <div class="highlight">
      <strong>⏱️ This link expires in 1 hour.</strong>
    </div>

    <p style="margin-top: 30px; font-size: 13px; color: #999;">If you didn't request this, please ignore this email. Your account is secure.</p>
  `;
  return emailWrapper(content, context);
}

// 4. Team Invitation
export function teamInviteEmailTemplate(context: EmailTemplateContext & { inviterName: string; inviteUrl: string; role?: string }) {
  const content = `
    <h1>You're Invited to Join a Team! 👋</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p><strong>${context.inviterName}</strong> has invited you to join <strong>${context.businessName}</strong> on SimplyCRM${context.role ? ` as a ${context.role}` : ''}.</p>

    <p>You'll be able to:</p>
    <ul style="margin-left: 20px; margin-top: 10px;">
      <li>Collaborate on contacts and follow-ups</li>
      <li>Share invoices and customer information</li>
      <li>Track team activities and progress</li>
      <li>Work together in real-time</li>
    </ul>

    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.inviteUrl}" class="button">Accept Invitation</a>
    </p>

    <p style="font-size: 13px; color: #666;">Or copy this link: <br><span style="word-break: break-all; color: #999;">${context.inviteUrl}</span></p>
  `;
  return emailWrapper(content, context);
}

// 5. Invoice Sent
export function invoiceSentEmailTemplate(context: EmailTemplateContext & { invoiceNumber: string; amount: string; dueDate?: string; viewUrl: string }) {
  const content = `
    <h1>Invoice Sent: #${context.invoiceNumber}</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p>An invoice has been sent to you from <strong>${context.businessName}</strong>.</p>

    <div class="highlight">
      <h2 style="margin-top: 0;">Invoice Details</h2>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0;"><strong>Invoice #:</strong></td>
          <td>${context.invoiceNumber}</td>
        </tr>
        <tr style="border-top: 1px solid #e0e0e0;">
          <td style="padding: 8px 0;"><strong>Amount Due:</strong></td>
          <td style="font-size: 16px; font-weight: 600; color: #1a7f64;">${context.amount}</td>
        </tr>
        ${context.dueDate ? `
        <tr style="border-top: 1px solid #e0e0e0;">
          <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
          <td>${context.dueDate}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.viewUrl}" class="button">View Invoice</a>
    </p>

    <p style="font-size: 13px; color: #666;">Thank you for your business!</p>
  `;
  return emailWrapper(content, context);
}

// 6. Follow-up Reminder
export function followupReminderEmailTemplate(context: EmailTemplateContext & { contactName: string; followupDate: string; actionUrl: string }) {
  const content = `
    <h1>⏰ Upcoming Follow-up Reminder</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p>You have a follow-up scheduled with <strong>${context.contactName}</strong> on <strong>${context.followupDate}</strong>.</p>

    <div class="highlight">
      <strong>Don't forget!</strong> Make sure to reach out on time to maintain the relationship.
    </div>

    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.actionUrl}" class="button">View Follow-up</a>
    </p>

    <p style="font-size: 13px; color: #999;">You can manage your reminders in your SimplyCRM dashboard.</p>
  `;
  return emailWrapper(content, context);
}

// 7. Task Assignment
export function taskAssignmentEmailTemplate(context: EmailTemplateContext & { taskTitle: string; assignerName: string; dueDate?: string; taskUrl: string }) {
  const content = `
    <h1>🎯 New Task Assigned to You</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p><strong>${context.assignerName}</strong> has assigned you a task in SimplyCRM.</p>

    <div class="highlight">
      <h3 style="margin-top: 0;">${context.taskTitle}</h3>
      ${context.dueDate ? `<p><strong>Due:</strong> ${context.dueDate}</p>` : ''}
    </div>

    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.taskUrl}" class="button">View Task</a>
    </p>

    <p>Log in to SimplyCRM to see all your assigned tasks and update the status.</p>
  `;
  return emailWrapper(content, context);
}

// 8. Contact Assignment
export function contactAssignmentEmailTemplate(context: EmailTemplateContext & { contactName: string; assignerName: string; note?: string; contactUrl: string }) {
  const content = `
    <h1>👤 New Contact Assigned</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p><strong>${context.assignerName}</strong> has assigned you a contact in SimplyCRM.</p>

    <div class="highlight">
      <h3 style="margin-top: 0;">${context.contactName}</h3>
      ${context.note ? `<p>${context.note}</p>` : ''}
    </div>

    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.contactUrl}" class="button">View Contact</a>
    </p>

    <p>Start engaging with the contact and log all of your interactions in SimplyCRM.</p>
  `;
  return emailWrapper(content, context);
}

// 9. Notification/Alert
export function notificationEmailTemplate(context: EmailTemplateContext & { title: string; message: string; actionUrl?: string; actionText?: string }) {
  const content = `
    <h1>${context.title}</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p>${context.message}</p>

    ${context.actionUrl ? `
    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.actionUrl}" class="button">${context.actionText || 'View Details'} →</a>
    </p>
    ` : ''}
  `;
  return emailWrapper(content, context);
}

// 10. Trial Ending Soon
export function trialEndingSoonEmailTemplate(context: EmailTemplateContext & { daysLeft: number; upgradeUrl: string }) {
  const content = `
    <h1>⏰ Your Trial Ends in ${context.daysLeft} Days</h1>
    <p>Hi ${context.recipientName || 'there'},</p>
    <p>Your SimplyCRM trial ends in <strong>${context.daysLeft} day${context.daysLeft !== 1 ? 's' : ''}</strong>. Choose a plan to keep using SimplyCRM and unlock all features.</p>

    <div class="highlight">
      <strong>Choose your plan:</strong>
      <ul style="margin-left: 20px; margin-top: 10px;">
        <li><strong>Starter</strong> - Perfect for solopreneurs (₹999/month)</li>
        <li><strong>Pro</strong> - Best for growing teams (₹4,999/month)</li>
      </ul>
    </div>

    <p style="text-align: center; margin: 40px 0;">
      <a href="${context.upgradeUrl}" class="button">Upgrade Now</a>
    </p>

    <p style="font-size: 13px; color: #666;">Lock in your plan and continue where you left off. No data will be lost.</p>
  `;
  return emailWrapper(content, context);
}
