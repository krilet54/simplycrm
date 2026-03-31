// src/app/dashboard/inbox/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import InboxClient from '@/components/inbox/InboxClient';

export default async function InboxPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  // Fetch contacts with latest messages
  const contacts = await db.contact.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    take: 50,
    include: {
      kanbanStage: true,
      contactTags: { include: { tag: true } },
      messages: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: { content: true, timestamp: true, senderType: true, isRead: true },
      },
      _count: {
        select: {
          messages: { where: { isRead: false, senderType: 'CUSTOMER' } },
        },
      },
    },
  });

  const quickReplies = await db.quickReply.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { shortcut: 'asc' },
  });

  const agents = await db.user.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, avatarUrl: true },
  });

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
      quickReplies={quickReplies}
      agents={agents}
      currentUser={dbUser}
      workspace={wsData || { id: workspace.id, kanbanStages: [] }}
      tags={tags}
    />
  );
}
