// src/lib/tasks.ts
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

/**
 * Create auto-task for invoice payment due
 */
export async function createPaymentDueTask(
  workspaceId: string,
  contactId: string,
  invoiceId: string,
  dueDate: Date
) {
  try {
    const taskDueDate = new Date(dueDate);
    taskDueDate.setDate(taskDueDate.getDate() - 1);

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: { users: { where: { role: { in: ['OWNER', 'ADMIN'] } }, take: 1 } },
    });

    if (!workspace?.users[0]) return;

    const task = await db.task.create({
      data: {
        workspaceId,
        contactId,
        createdBy: workspace.users[0].id,
        title: `Payment due for invoice #${invoiceId}`,
        description: `Follow up on invoice payment due on ${dueDate.toLocaleDateString()}`,
        dueDate: taskDueDate,
        priority: 'HIGH',
        type: 'AUTO_PAYMENT_DUE',
      },
    });

    await logActivity({
      workspaceId,
      contactId,
      activityType: 'CONTACT_UPDATED',
      actorId: workspace.users[0].id,
      title: 'Auto-task created: Payment reminder',
      description: `Invoice #${invoiceId}`,
      metadata: { taskId: task.id, invoiceId },
    });

    return task;
  } catch (error) {
    console.error('Failed to create payment due task:', error);
  }
}

/**
 * Create auto-task for no-reply after 24h
 */
export async function createNoReplyTask(
  workspaceId: string,
  contactId: string,
  lastMessageId: string
) {
  try {
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);

    const contact = await db.contact.findUnique({ where: { id: contactId } });
    if (!contact) return;

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: { users: { where: { role: { in: ['OWNER', 'ADMIN'] } }, take: 1 } },
    });

    if (!workspace?.users[0]) return;

    const task = await db.task.create({
      data: {
        workspaceId,
        contactId,
        createdBy: workspace.users[0].id,
        title: `Follow up with ${contact.name || contact.phoneNumber}`,
        description: 'No response in 24 hours. Send follow-up message.',
        dueDate,
        priority: 'MEDIUM',
        type: 'AUTO_NO_REPLY_24H',
      },
    });

    await logActivity({
      workspaceId,
      contactId,
      activityType: 'CONTACT_UPDATED',
      actorId: workspace.users[0].id,
      title: 'Auto-task created: No-reply follow-up',
      description: '24 hours since last message',
      metadata: { taskId: task.id, lastMessageId },
    });

    return task;
  } catch (error) {
    console.error('Failed to create no-reply task:', error);
  }
}

/**
 * Get workspace tasks with filters
 */
export async function getWorkspaceTasks(
  workspaceId: string,
  status?: string,
  priority?: string
) {
  const where: any = { workspaceId };
  if (status) where.status = status;
  if (priority) where.priority = priority;

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
 * Get task statistics
 */
export async function getTaskStats(workspaceId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalTasks, completedToday, pastDue, overdue] = await Promise.all([
    db.task.count({ where: { workspaceId, status: { not: 'COMPLETED' } } }),
    db.task.count({
      where: {
        workspaceId,
        status: 'COMPLETED',
        completedAt: { gte: today, lt: tomorrow },
      },
    }),
    db.task.count({
      where: {
        workspaceId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: today },
      },
    }),
    db.task.count({
      where: {
        workspaceId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { gte: today, lt: tomorrow },
      },
    }),
  ]);

  return { totalTasks, completedToday, pastDue, overdue };
}
