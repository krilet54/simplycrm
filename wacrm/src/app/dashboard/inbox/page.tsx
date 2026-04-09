// src/app/dashboard/inbox/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import InboxClient from '@/components/inbox/InboxClient';

export const metadata = {
  title: 'Activity Hub | Crebo',
};

export default async function InboxPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  // Fetch contacts with latest activities
  const contacts = await db.contact.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { lastActivityAt: { sort: 'desc', nulls: 'last' } },
    take: 100,
    include: {
      kanbanStage: true,
      contactTags: { include: { tag: true } },
      activities: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: { content: true, timestamp: true, type: true },
      },
      _count: {
        select: {
          activities: true,
        },
      },
    },
  });

  const agents = await db.user.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, avatarUrl: true },
  });
  const normalizedAgents = agents.map((agent) => ({
    ...agent,
    name: agent.name?.trim() || 'Unnamed agent',
  }));

  const tags = await db.tag.findMany({
    where: { workspaceId: workspace.id },
  });

  const wsData = await db.workspace.findUnique({
    where: { id: workspace.id },
    select: { id: true, kanbanStages: { select: { id: true, position: true } } },
  });

  return (
    <InboxClient
      initialContacts={contacts as any}
      agents={normalizedAgents}
      currentUser={dbUser}
      workspace={wsData || { id: workspace.id, kanbanStages: [] }}
      tags={tags}
    />
  );
}
