// src/app/tasks/page.tsx - Redirect to dashboard tasks
import { redirect } from 'next/navigation';

export default function TasksRedirect() {
  redirect('/dashboard/kanban?view=tasks');
}
