import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { queueNotification } from '@/lib/redis';
import type { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  recipientEmail?: string;
  sendEmail?: boolean;
}

// Keep track of SSE broadcast function (to be injected from route)
let broadcastNotificationFn: ((userId: string, notification: any) => void) | null = null;

export function setBroadcastFunction(fn: (userId: string, notification: any) => void) {
  broadcastNotificationFn = fn;
}

/**
 * Create a notification in the database and optionally send an email
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    workspaceId,
    userId,
    type,
    title,
    message,
    relatedId,
    relatedType,
    recipientEmail,
    sendEmail: shouldSendEmail = true,
  } = params;

  try {
    // Create notification in database
    const notification = await db.notification.create({
      data: {
        workspaceId,
        userId,
        type,
        title,
        message,
        relatedId,
        relatedType,
        isRead: false,
      },
    });

    // Queue notification in Redis for reliable delivery
    // This ensures notifications aren't lost even if SSE connection is down
    await queueNotification(userId, notification);

    // Also broadcast to SSE clients in real-time (for instant delivery)
    if (broadcastNotificationFn) {
      try {
        broadcastNotificationFn(userId, notification);
      } catch (e) {
        console.error('Error broadcasting notification:', e);
        // Don't fail if broadcast fails - Redis queue is backup
      }
    }

    // Send email if requested and email provided
    if (shouldSendEmail && recipientEmail) {
      try {
        const workspace = await db.workspace.findUnique({
          where: { id: workspaceId },
          select: { businessName: true },
        });

        const emailSubject = `${workspace?.businessName || 'Crebo'} - ${title}`;
        const emailBody = `
          <h2>${title}</h2>
          <p>${message}</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Log in to your CRM dashboard to view more details.
          </p>
        `;

        await sendEmail({
          workspaceId,
          from: workspace?.businessName || 'Crebo',
          to: recipientEmail,
          subject: emailSubject,
          body: emailBody,
        });
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(workspaceId: string, userId: string) {
  try {
    return await db.notification.findMany({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadNotificationCount(workspaceId: string, userId: string) {
  try {
    return await db.notification.count({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    return await db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(workspaceId: string, userId: string) {
  try {
    return await db.notification.updateMany({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Notify agent about contact assignment
 */
export async function notifyContactAssignment(
  workspaceId: string,
  contactId: string,
  assigneeId: string,
  assigneeName: string,
  assigneeEmail: string,
  contactName: string,
  delegationNote?: string
) {
  const title = `New Contact Assigned: ${contactName}`;
  const message = delegationNote
    ? `You have been assigned a new contact: ${contactName}\n\nNote: ${delegationNote}`
    : `You have been assigned a new contact: ${contactName}. Click to view details.`;

  return createNotification({
    workspaceId,
    userId: assigneeId,
    type: 'CONTACT_ASSIGNED',
    title,
    message,
    relatedId: contactId,
    relatedType: 'CONTACT',
    recipientEmail: assigneeEmail,
    sendEmail: true,
  });
}

/**
 * Notify agent about task assignment
 */
export async function notifyTaskAssignment(
  workspaceId: string,
  taskId: string,
  assigneeId: string,
  assigneeName: string,
  assigneeEmail: string,
  taskTitle: string,
  dueDate?: Date
) {
  const dueDateStr = dueDate ? ` - Due ${dueDate.toLocaleDateString()}` : '';
  const title = `New Task Assigned: ${taskTitle}${dueDateStr}`;
  const message = `You have been assigned a task: ${taskTitle}${dueDateStr}. Click to view details.`;

  return createNotification({
    workspaceId,
    userId: assigneeId,
    type: 'TASK_ASSIGNED',
    title,
    message,
    relatedId: taskId,
    relatedType: 'TASK',
    recipientEmail: assigneeEmail,
    sendEmail: true,
  });
}

/**
 * Notify agent about follow-up assignment
 */
export async function notifyFollowUpAssignment(
  workspaceId: string,
  followUpId: string,
  assigneeId: string,
  assigneeName: string,
  assigneeEmail: string,
  contactName: string,
  scheduledFor?: Date
) {
  const scheduledStr = scheduledFor ? ` - Scheduled for ${scheduledFor.toLocaleDateString()}` : '';
  const title = `New Follow-up Assigned: ${contactName}${scheduledStr}`;
  const message = `You have been assigned a follow-up for: ${contactName}${scheduledStr}. Click to view details.`;

  return createNotification({
    workspaceId,
    userId: assigneeId,
    type: 'FOLLOWUP_ASSIGNED',
    title,
    message,
    relatedId: followUpId,
    relatedType: 'FOLLOWUP',
    recipientEmail: assigneeEmail,
    sendEmail: true,
  });
}

/**
 * Notify user about upcoming follow-up due today
 */
export async function notifyFollowUpDue(
  workspaceId: string,
  followUpId: string,
  userId: string,
  userEmail: string,
  contactName: string,
  dueDate: Date
) {
  const title = `Follow-up Due: ${contactName}`;
  const message = `Your follow-up with ${contactName} is due ${dueDate.toLocaleDateString()}. Don't forget to reach out!`;

  return createNotification({
    workspaceId,
    userId,
    type: 'FOLLOWUP_DUE' as any,
    title,
    message,
    relatedId: followUpId,
    relatedType: 'FOLLOWUP',
    recipientEmail: userEmail,
    sendEmail: false, // Don't spam with emails for due reminders
  });
}

/**
 * Notify user about upcoming task due today
 */
export async function notifyTaskDue(
  workspaceId: string,
  taskId: string,
  userId: string,
  userEmail: string,
  taskTitle: string,
  dueDate: Date
) {
  const title = `Task Due: ${taskTitle}`;
  const message = `Your task "${taskTitle}" is due ${dueDate.toLocaleDateString()}. Make sure to complete it!`;

  return createNotification({
    workspaceId,
    userId,
    type: 'TASK_DUE' as any,
    title,
    message,
    relatedId: taskId,
    relatedType: 'TASK',
    recipientEmail: userEmail,
    sendEmail: false, // Don't spam with emails for due reminders
  });
}
