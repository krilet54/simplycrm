// src/lib/tasks.ts
import { db } from '@/lib/db';

/**
 * Mark task reminder as sent
 */
export async function markReminderSent(taskId: string) {
  return db.task.update({
    where: { id: taskId },
    data: { reminderSent: true },
  });
}

/**
 * Create auto-task for invoice payment due
 */
export async function createPaymentDueTask(invoiceId: string, contactId: string, workspaceId: string, dueDate: Date) {
  const config = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { users: { where: { role: 'OWNER' }, take: 1 } },
  });

  const owner = config?.users[0];
  if (!owner) return;

  // Calculate reminder date (1 day before due date)
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 1);

  return db.task.create({
    data: {
      workspaceId,
      contactId,
      createdBy: owner.id,
      title: `Payment due: Invoice #${invoiceId}`,
      description: 'Follow up on invoice payment',
      dueDate: reminderDate,
      type: 'AUTO_PAYMENT_DUE',
      priority: 'HIGH',
    },
  });
}

/**
 * Create auto-task for no reply after 24h
 */
export async function createNoReplyTask(contactId: string, workspaceId: string, lastMessageTime: Date) {
  const config = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { users: { where: { role: 'OWNER' }, take: 1 } },
  });

  const owner = config?.users[0];
  if (!owner) return;

  // Task due 24h after last message
  const dueDate = new Date(lastMessageTime);
  dueDate.setDate(dueDate.getDate() + 1);

  return db.task.create({
    data: {
      workspaceId,
      contactId,
      createdBy: owner.id,
      title: 'Follow up - No reply for 24h',
      description: 'Customer has not responded. Consider sending a follow-up message.',
      dueDate,
      type: 'AUTO_NO_REPLY_24H',
      priority: 'MEDIUM',
    },
  });
}

/**
 * Get tasks with filter options
 */
export async function getWorkspaceTasks(
  workspaceId: string,
  filters?: {
    status?: string;
    priority?: string;
    contactId?: string;
    type?: string;
  }
) {
  const where: any = { workspaceId };

  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.contactId) where.contactId = filters.contactId;
  if (filters?.type) where.type = filters.type;

  return db.task.findMany({
    where,
    include: {
      contact: { select: { id: true, name: true, phoneNumber: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
  });
}

/**
 * Get task statistics for a workspace
 */
export async function getTaskStats(workspaceId: string) {
  const [totalTasks, completedToday, pastDue, overdue] = await Promise.all([
    db.task.count({ where: { workspaceId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
    db.task.count({
      where: {
        workspaceId,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    db.task.count({
      where: {
        workspaceId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() },
      },
    }),
    db.task.count({
      where: {
        workspaceId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: {
          lt: new Date(new Date().setDate(new Date().getDate() - 1)),
        },
      },
    }),
  ]);

  return {
    totalTasks,
    completedToday,
    pastDue,
    overdue,
  };
}
