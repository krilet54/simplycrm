// src/app/api/tasks/send-reminder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskIds } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'No task IDs provided' }, { status: 400 });
    }

    const remindersSent: string[] = [];
    const errors: string[] = [];

    for (const taskId of taskIds) {
      try {
        // Get task with creator and contact info
        const task = await db.task.findUnique({
          where: { id: taskId },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            contact: { select: { id: true, name: true, phoneNumber: true } },
            workspace: { select: { id: true, businessName: true } },
          },
        });

        if (!task) {
          errors.push(`Task ${taskId} not found`);
          continue;
        }

        // Only send if reminder hasn't been sent yet
        if (task.reminderSent) {
          errors.push(`Reminder already sent for task ${taskId}`);
          continue;
        }

        // Don't send if task is already completed
        if (task.status === 'DONE') {
          errors.push(`Task ${taskId} is already completed`);
          continue;
        }

        // Check if creator has an email
        if (!task.createdBy.email) {
          errors.push(`No email found for task creator of ${taskId}`);
          continue;
        }

        // Check if due date exists
        if (!task.dueDate) {
          errors.push(`No due date set for task ${taskId}`);
          continue;
        }

        // Check if contact exists
        if (!task.contact) {
          errors.push(`No contact associated with task ${taskId}`);
          continue;
        }

        // Check if contactId exists
        if (!task.contactId) {
          errors.push(`No contact ID for task ${taskId}`);
          continue;
        }

        const dueDate = new Date(task.dueDate);
        const formattedDueDate = dueDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const emailBody = `
          <h2>Task Reminder</h2>
          <p>Hi ${task.createdBy.name},</p>
          <p>This is a reminder that you have an upcoming task:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>${task.title}</h3>
            <p><strong>Contact:</strong> ${task.contact.name || task.contact.phoneNumber}</p>
            <p><strong>Due:</strong> ${formattedDueDate}</p>
            <p><strong>Priority:</strong> ${task.priority}</p>
            ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
          </div>
          
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/kanban?view=tasks" style="background-color: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Task</a></p>
          
          <p>Best regards,<br>Crebo</p>
        `;

        // Send email via Resend
        await sendEmail({
          workspaceId: task.workspaceId,
          contactId: task.contactId,
          from: task.createdBy.email,
          to: task.createdBy.email,
          subject: `Task Reminder: ${task.title}`,
          body: emailBody,
          actorId: task.createdBy.id,
        });

        // Mark reminder as sent
        await db.task.update({
          where: { id: taskId },
          data: { reminderSent: true },
        });

        // Log activity
        await logActivity({
          workspaceId: task.workspaceId,
          contactId: task.contactId,
          type: 'NOTE',
          authorId: task.createdBy.id,
          content: `Task reminder sent: ${task.title} (due on ${formattedDueDate})`,
        });

        remindersSent.push(taskId);
      } catch (error) {
        console.error(`Failed to send reminder for task ${taskId}:`, error);
        errors.push(`Failed to send reminder for task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      remindersSent,
      errors,
      summary: {
        sent: remindersSent.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error('Task reminder batch send failed:', error);
    return NextResponse.json(
      { error: 'Failed to send task reminders' },
      { status: 500 }
    );
  }
}
