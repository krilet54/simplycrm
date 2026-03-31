// src/lib/activity.ts
import { db } from '@/lib/db';
import { ActivityType } from '@prisma/client';

export interface LogActivityParams {
  workspaceId: string;
  contactId: string;
  activityType: ActivityType;
  actorId: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Log an activity for a contact
 * Called whenever something happens to a contact (message, invoice, note, etc.)
 */
export async function logActivity({
  workspaceId,
  contactId,
  activityType,
  actorId,
  title,
  description,
  metadata,
}: LogActivityParams) {
  try {
    await db.activity.create({
      data: {
        workspaceId,
        contactId,
        activityType,
        actorId,
        title,
        description,
        metadata: metadata || ({} as any),
      },
    });
  } catch (error) {
    // Log but don't fail if activity logging fails
    console.error('Failed to log activity:', error);
  }
}

/**
 * Get recent activities for dashboard
 * Returns last N activities across all contacts in workspace
 */
export async function getRecentActivities(workspaceId: string, limit: number = 10) {
  return db.activity.findMany({
    where: { workspaceId },
    include: {
      contact: true,
      actor: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

/**
 * Get activities for a specific contact (paginated)
 */
export async function getContactActivities(
  contactId: string,
  workspaceId: string,
  limit: number = 50,
  cursor?: string
) {
  return db.activity.findMany({
    where: { contactId, workspaceId },
    include: {
      actor: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

/**
 * Get activity counts by type for a contact (for analytics)
 */
export async function getActivityStats(contactId: string, workspaceId: string) {
  const activities = await db.activity.findMany({
    where: { contactId, workspaceId },
    select: { activityType: true },
  });

  const stats = {
    messages: 0,
    notes: 0,
    invoices: 0,
    stageChanges: 0,
    total: activities.length,
  };

  for (const activity of activities) {
    if (activity.activityType === 'MESSAGE_SENT' || activity.activityType === 'MESSAGE_RECEIVED') {
      stats.messages++;
    } else if (activity.activityType === 'NOTE_ADDED') {
      stats.notes++;
    } else if (
      activity.activityType === 'INVOICE_CREATED' ||
      activity.activityType === 'INVOICE_SENT' ||
      activity.activityType === 'INVOICE_PAID'
    ) {
      stats.invoices++;
    } else if (activity.activityType === 'STAGE_CHANGED') {
      stats.stageChanges++;
    }
  }

  return stats;
}
