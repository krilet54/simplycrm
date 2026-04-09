// src/app/dashboard/settings/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  const [quickReplies, tags, kanbanStages] = await Promise.all([
    db.quickReply.findMany({ where: { workspaceId: workspace.id }, orderBy: { shortcut: 'asc' } }),
    db.tag.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: 'asc' } }),
    db.kanbanStage.findMany({ where: { workspaceId: workspace.id }, orderBy: { position: 'asc' } }),
  ]);

  return (
    <SettingsClient
      workspace={workspace as any}
      currentUser={dbUser}
      quickReplies={quickReplies}
      tags={tags}
      kanbanStages={kanbanStages}
    />
  );
}
