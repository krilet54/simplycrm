// src/hooks/useTaskReminders.ts
import { useEffect, useRef } from 'react';

export function useTaskReminders() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for upcoming tasks every 60 seconds
    const checkReminders = async () => {
      try {
        const response = await fetch('/api/tasks/upcoming?hoursAhead=24');
        if (!response.ok) return;

        const data = await response.json();
        const upcomingTasks = data.tasks || [];

        // Filter only tasks where reminderSent is false and due in next 1 hour
        const urgentTasks = upcomingTasks.filter((task: any) => {
          if (task.reminderSent) return false;
          const dueDateObj = new Date(task.dueDate);
          const now = new Date();
          const timeDiff = dueDateObj.getTime() - now.getTime();
          const hoursUntilDue = timeDiff / (1000 * 60 * 60);
          return hoursUntilDue <= 1 && hoursUntilDue > 0;
        });

        if (urgentTasks.length > 0) {
          // Send email reminders via API
          try {
            await fetch('/api/tasks/send-reminder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskIds: urgentTasks.map((task: any) => task.id),
              }),
            });
          } catch (emailError) {
            console.error('Failed to send email reminders:', emailError);
          }

          // Show desktop notification
          showNotification(urgentTasks);
        }
      } catch (error) {
        console.error('Task reminder check failed:', error);
      }
    };

    // Initial check
    checkReminders();

    // Set up recurring check every 60 seconds
    intervalRef.current = setInterval(checkReminders, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}

function showNotification(tasks: any[]) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const title = `${tasks.length} task${tasks.length > 1 ? 's' : ''} due soon`;
    const body = tasks
      .slice(0, 3)
      .map((t) => `${t.title} - ${t.contact.name || t.contact.phoneNumber}`)
      .join('\n');

    new Notification(title, {
      body,
      icon: '/crebo logo 2.png',
      tag: 'task-reminder',
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}
