// src/app/tasks/new/page.tsx - Redirect to tasks
import { redirect } from 'next/navigation';

export default function TasksNewRedirect() {
  redirect('/dashboard/kanban?view=tasks');
}

