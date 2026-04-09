// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';
import DashboardLayoutClient from './DashboardLayoutClient';
import { getTrialStatus } from '@/lib/trial';

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

  // Get trial status - workspace already includes trialEndsAt and stripeSubscriptionId from schema
  const trialStatus = getTrialStatus({
    trialEndsAt: dbUser.workspace.trialEndsAt ?? null,
    plan: dbUser.workspace.plan,
    stripeSubscriptionId: dbUser.workspace.stripeSubscriptionId ?? null,
  });

  return (
    <DashboardLayoutClient user={dbUser} trialStatus={trialStatus}>
      {children}
    </DashboardLayoutClient>
  );
}
