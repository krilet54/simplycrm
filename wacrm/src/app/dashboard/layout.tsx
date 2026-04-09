// src/app/dashboard/layout.tsx
import { db } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import DashboardLayoutClient from './DashboardLayoutClient';
import { getTrialStatus } from '@/lib/trial';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { dbUser, workspace } = await getAuthenticatedUser();

  const [kanbanStages, tags] = await Promise.all([
    db.kanbanStage
      .findMany({
        where: { workspaceId: workspace.id },
        select: { id: true, name: true, position: true },
        orderBy: { position: 'asc' },
      })
      .catch((error) => {
        console.error('Failed to load kanban stages for dashboard layout:', error);
        return [];
      }),
    db.tag
      .findMany({
        where: { workspaceId: workspace.id },
        select: { id: true, name: true, color: true },
      })
      .catch((error) => {
        console.error('Failed to load tags for dashboard layout:', error);
        return [];
      }),
  ]);

  // Get trial status - workspace already includes trialEndsAt and stripeSubscriptionId from schema
  const trialStatus = getTrialStatus({
    trialEndsAt: workspace.trialEndsAt ?? null,
    plan: workspace.plan,
    stripeSubscriptionId: workspace.stripeSubscriptionId ?? null,
  });

  const userWithWorkspaceData = {
    ...dbUser,
    workspace: {
      ...workspace,
      kanbanStages,
      tags,
    },
  };

  return (
    <DashboardLayoutClient user={userWithWorkspaceData} trialStatus={trialStatus}>
      {children}
    </DashboardLayoutClient>
  );
}
