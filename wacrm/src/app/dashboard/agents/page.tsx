// src/app/dashboard/agents/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import AgentsClient from '@/components/AgentsClient';

export default async function AgentsPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  const agents = await db.user.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, email: true, role: true,
      avatarUrl: true, isOnline: true, createdAt: true,
    },
  });

  const planLimits: Record<string, number> = { TRIAL: 2, STARTER: 3, PRO: 999 };
  const limit = planLimits[workspace.plan] ?? 3;

  return (
    <AgentsClient
      agents={agents as any}
      currentUser={dbUser}
      plan={workspace.plan}
      agentLimit={limit}
    />
  );
}
