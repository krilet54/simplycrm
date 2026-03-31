// src/app/dashboard/contacts/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import ContactsClient from '@/components/contacts/ContactsClient';

export default async function ContactsPage() {
  const { workspace } = await getAuthenticatedUser();

  const [contacts, tags, stages] = await Promise.all([
    db.contact.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      include: {
        kanbanStage: true,
        contactTags: { include: { tag: true } },
        _count: { select: { messages: true, notes: true } },
      },
    }),
    db.tag.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: 'asc' },
    }),
    db.kanbanStage.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { position: 'asc' },
    }),
  ]);

  return <ContactsClient contacts={contacts as any} tags={tags} stages={stages} />;
}
