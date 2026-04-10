// src/app/dashboard/layout.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import DashboardLayoutClient from './DashboardLayoutClient';
import { getTrialStatus } from '@/lib/trial';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { dbUser, workspace } = await getAuthenticatedUser();

  // Get trial status - workspace already includes trialEndsAt and stripeSubscriptionId from schema
  const trialStatus = getTrialStatus({
    trialEndsAt: workspace.trialEndsAt ?? null,
    plan: workspace.plan,
    stripeSubscriptionId: workspace.stripeSubscriptionId ?? null,
  });

  const userWithWorkspaceData = {
    ...dbUser,
    workspace,
  };

  return (
    <DashboardLayoutClient
      user={userWithWorkspaceData}
      trialStatus={trialStatus}
      initialBadgeCount={0}
    >
      {children}
    </DashboardLayoutClient>
  );
}
