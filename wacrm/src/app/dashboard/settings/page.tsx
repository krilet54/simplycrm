// src/app/dashboard/settings/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  const [quickReplies, tags] = await Promise.all([
    db.quickReply.findMany({ where: { workspaceId: workspace.id }, orderBy: { shortcut: 'asc' } }),
    db.tag.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <SettingsClient
      workspace={workspace as any}
      currentUser={dbUser}
      quickReplies={quickReplies}
      tags={tags}
    />
  );
}
