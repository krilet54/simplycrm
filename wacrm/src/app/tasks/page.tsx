// src/app/tasks/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';
import { getWorkspaceTasks, getTaskStats } from '@/lib/tasks';
import TasksClient from '@/components/tasks/TasksClient';

export default async function TasksPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const dbUser = await db.user.findUnique({
    where: { supabaseId: user.id },
    include: { workspace: true },
  });

  if (!dbUser) redirect('/login');

  // Fetch tasks and stats
  const tasks = await getWorkspaceTasks(dbUser.workspaceId);
  const stats = await getTaskStats(dbUser.workspaceId);

  return (
    <TasksClient
      initialTasks={tasks}
      stats={stats}
      currentUser={dbUser}
      workspace={dbUser.workspace}
    />
  );
}
