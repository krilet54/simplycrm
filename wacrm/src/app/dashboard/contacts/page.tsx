// src/app/dashboard/contacts/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import EnhancedContactsClient from '@/components/contacts/EnhancedContactsClient';

export default async function ContactsPage() {
  const { workspace, dbUser } = await getAuthenticatedUser();

  // Role-based filtering for contacts
  // OWNER/ADMIN see all contacts, AGENT only sees assigned or created contacts
  const contactWhere: any = { 
    workspaceId: workspace.id,
    deletedAt: null, // Only show non-deleted contacts
  };
  if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
    contactWhere.OR = [
      { assignedToId: dbUser.id },
      { createdById: dbUser.id },
    ];
  }

  // Only fetch what's actually needed for the contacts list view
  const [contacts, tags, stages] = await Promise.all([
    db.contact.findMany({
      where: contactWhere,
      orderBy: { lastActivityAt: 'desc' },
      take: 200, // Paginate - load first 200
      include: {
        kanbanStage: true,
        contactTags: { include: { tag: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { invoices: true, notes: true, activities: true } },
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

  // Pass empty arrays for data that's loaded on-demand via contact details API
  return (
    <EnhancedContactsClient
      contacts={contacts as any}
      tags={tags}
      stages={stages}
      activities={[]}
      invoices={[]}
      notes={[]}
      emails={[]}
      currentUser={dbUser}
    />
  );
}
