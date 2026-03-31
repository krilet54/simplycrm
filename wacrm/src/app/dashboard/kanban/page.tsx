// src/app/dashboard/kanban/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import KanbanClient from '@/components/kanban/KanbanClient';

export default async function KanbanPage() {
  const { workspace } = await getAuthenticatedUser();

  const stages = await db.kanbanStage.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { position: 'asc' },
    include: {
      contacts: {
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        include: {
          contactTags: { include: { tag: true } },
          _count: { select: { messages: true } },
          messages: {
            take: 1,
            orderBy: { timestamp: 'desc' },
            select: { content: true, timestamp: true },
          },
        },
      },
    },
  });

  return <KanbanClient stages={stages as any} />;
}
