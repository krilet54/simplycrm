// src/lib/activity.ts
import { db } from '@/lib/db';
import { ActivityType } from '@prisma/client';

export interface LogActivityParams {
  workspaceId: string;
  contactId: string;
  type: ActivityType;
  authorId: string;
  content: string;
}

/**
 * Log an activity for a contact
 * Called whenever something happens to a contact (call, meeting, email, note, etc.)
 */
export async function logActivity({
  workspaceId,
  contactId,
  type,
  authorId,
  content,
}: LogActivityParams) {
  try {
    await db.activity.create({
      data: {
        workspaceId,
        contactId,
        type,
        authorId,
        content,
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
      author: {
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
      author: {
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
    select: { type: true },
  });

  const stats = {
    calls: 0,
    meetings: 0,
    emails: 0,
    notes: 0,
    invoices: 0,
    total: activities.length,
  };

  for (const activity of activities) {
    if (activity.type === 'CALL') {
      stats.calls++;
    } else if (activity.type === 'MEETING') {
      stats.meetings++;
    } else if (activity.type === 'EMAIL') {
      stats.emails++;
    } else if (activity.type === 'NOTE') {
      stats.notes++;
    } else if (activity.type === 'INVOICE_SENT') {
      stats.invoices++;
    }
  }

  return stats;
}
