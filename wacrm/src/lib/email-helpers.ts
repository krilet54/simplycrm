// src/lib/email-helpers.ts
// Helper functions for common email scenarios

import {
  sendTemplateEmail,
  welcomeEmailTemplate,
  verificationEmailTemplate,
  passwordResetEmailTemplate,
  teamInviteEmailTemplate,
  invoiceSentEmailTemplate,
  followupReminderEmailTemplate,
  taskAssignmentEmailTemplate,
  contactAssignmentEmailTemplate,
  trialEndingSoonEmailTemplate,
} from '@/lib/email';

interface WorkspaceContext {
  businessName: string;
  appUrl: string;
  supportEmail?: string;
  domain?: string;
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  workspace: WorkspaceContext
) {
  const html = welcomeEmailTemplate({
    recipientName: userName,
    businessName: workspace.businessName,
    email: userEmail,
    actionUrl: `${workspace.appUrl}/dashboard`,
    supportEmail: workspace.supportEmail || 'support@simplycrm.io',
  });

  return sendTemplateEmail({
    to: userEmail,
    subject: 'Welcome to SimplyCRM! 🎉',
    html,
    replyTo: workspace.supportEmail,
  });
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(
  userEmail: string,
  userName: string,
  verificationToken: string,
  workspace: WorkspaceContext
) {
  const verificationUrl = `${workspace.appUrl}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const html = verificationEmailTemplate({
    recipientName: userName,
    businessName: workspace.businessName,
    email: userEmail,
    verificationUrl,
    supportEmail: workspace.supportEmail,
  });

  return sendTemplateEmail({
    to: userEmail,
    subject: 'Verify Your Email Address',
    html,
    replyTo: workspace.supportEmail,
  });
}

/**
 * Send password reset link
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetToken: string,
  workspace: WorkspaceContext
) {
  const resetUrl = `${workspace.appUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

  const html = passwordResetEmailTemplate({
    recipientName: userName,
    resetUrl,
    supportEmail: workspace.supportEmail,
  });

  return sendTemplateEmail({
    to: userEmail,
    subject: 'Reset Your Password',
    html,
    replyTo: workspace.supportEmail,
  });
}

/**
 * Send team member invitation
 */
export async function sendTeamInvitation(
  inviteeEmail: string,
  inviteeName: string,
  inviterName: string,
  inviteToken: string,
  workspace: WorkspaceContext
) {
  const inviteUrl = `${workspace.appUrl}/auth/accept-invite?token=${encodeURIComponent(inviteToken)}`;

  const html = teamInviteEmailTemplate({
    recipientName: inviteeName,
    businessName: workspace.businessName,
    inviterName,
    inviteUrl,
    role: 'Team Member',
    supportEmail: workspace.supportEmail,
  });

  return sendTemplateEmail({
    to: inviteeEmail,
    subject: `${inviterName} invited you to join ${workspace.businessName}`,
    html,
    replyTo: workspace.supportEmail,
  });
}

/**
 * Send invoice to customer
 */
export async function sendInvoiceEmail(
  customerEmail: string,
  customerName: string,
  invoiceData: {
    number: string;
    amount: string;
    dueDate: string;
    id: string;
  },
  workspace: WorkspaceContext
) {
  const viewUrl = `${workspace.appUrl}/invoices/${invoiceData.id}`;

  const html = invoiceSentEmailTemplate({
    recipientName: customerName,
    businessName: workspace.businessName,
    invoiceNumber: invoiceData.number,
    amount: invoiceData.amount,
    dueDate: invoiceData.dueDate,
    viewUrl,
    supportEmail: workspace.supportEmail,
  });

  return sendTemplateEmail({
    to: customerEmail,
    subject: `Invoice: #${invoiceData.number} from ${workspace.businessName}`,
    html,
    replyTo: workspace.supportEmail,
  });
}

/**
 * Send follow-up reminder
 */
export async function sendFollowUpReminder(
  agentEmail: string,
  agentName: string,
  followupData: {
    contactName: string;
    dueDate: string;
    followupId: string;
  },
  workspace: WorkspaceContext
) {
  const actionUrl = `${workspace.appUrl}/followups/${followupData.followupId}`;

  const html = followupReminderEmailTemplate({
    recipientName: agentName,
    contactName: followupData.contactName,
    followupDate: followupData.dueDate,
    actionUrl,
    supportEmail: workspace.supportEmail,
  });

  return sendTemplateEmail({
    to: agentEmail,
    subject: `Follow-up reminder: ${followupData.contactName}`,
    html,
    replyTo: workspace.supportEmail,
  });
}

/**
 * Send task assignment notification
 */
export async function sendTaskAssignmentEmail(
  assigneeEmail: string,
  assigneeName: string,
  assignerName: string,
  taskData: {
    title: string;
    dueDate?: string;
    id: string;
  },
  workspace: WorkspaceContext
) {
  const taskUrl = `${workspace.appUrl}/tasks/${taskData.id}`;

  const html = taskAssignmentEmailTemplate({
    recipientName: assigneeName,
    taskTitle: taskData.title,
    assignerName,
    dueDate: taskData.dueDate,
    taskUrl,
    supportEmail: workspace.supportEmail,
  });

  return sendTemplateEmail({
    to: assigneeEmail,
    subject: `Task assigned: ${taskData.title}`,
    html,
    replyTo: workspace.supportEmail,
  });
}

/**
 * Send contact assignment notification
 */
export async function sendContactAssignmentEmail(
  assigneeEmail: string,
  assigneeName: string,
  assignerName: string,
  contactData: {
    name: string;
    note?: string;
    id: string;
  },
  workspace: WorkspaceContext
) {
  const contactUrl = `${workspace.appUrl}/contacts/${contactData.id}`;

  const html = contactAssignmentEmailTemplate({
    recipientName: assigneeName,
    contactName: contactData.name,
    assignerName,
    note: contactData.note,
    contactUrl,
    supportEmail: workspace.supportEmail,
  });

  return sendTemplateEmail({
    to: assigneeEmail,
    subject: `Contact assigned: ${contactData.name}`,
    html,
    replyTo: workspace.supportEmail,
  });
}

/**
 * Send trial ending soon notification
 */
export async function sendTrialEndingSoonEmail(
  userEmail: string,
  userName: string,
  daysLeft: number,
  workspace: WorkspaceContext
) {
  const upgradeUrl = `${workspace.appUrl}/billing/upgrade`;

  const html = trialEndingSoonEmailTemplate({
    recipientName: userName,
    businessName: workspace.businessName,
    daysLeft,
    upgradeUrl,
    supportEmail: workspace.supportEmail,
  });

  return sendTemplateEmail({
    to: userEmail,
    subject: `⏰ Your trial ends in ${daysLeft} days`,
    html,
    replyTo: workspace.supportEmail,
  });
}
