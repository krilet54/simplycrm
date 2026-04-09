// src/app/api/kanban/stages/[id]/route.ts
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { workspace } = await getAuthenticatedUser();
    const { id } = params;

    // Fetch the stage to verify it exists in user's workspace
    const stage = await db.kanbanStage.findUnique({
      where: { id },
    });

    if (!stage || stage.workspaceId !== workspace.id) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    // Don't allow deleting if it's the default stage and it's the only one
    const stageCount = await db.kanbanStage.count({
      where: { workspaceId: workspace.id },
    });

    if (stage.isDefault && stageCount === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only stage' },
        { status: 400 }
      );
    }

    // Delete the stage
    await db.kanbanStage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
