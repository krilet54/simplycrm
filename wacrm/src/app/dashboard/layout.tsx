// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';
import Sidebar from '@/components/shared/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const dbUser = await db.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      workspace: {
        include: {
          kanbanStages: {
            select: { id: true, name: true, position: true },
            orderBy: { position: 'asc' },
          },
          tags: {
            select: { id: true, name: true, color: true },
          },
        },
      },
    },
  });

  if (!dbUser) redirect('/onboarding');

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar 
        user={dbUser} 
        workspace={dbUser.workspace} 
        tags={dbUser.workspace.tags}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
