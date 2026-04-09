// src/app/api/kanban/stages/reorder/route.ts
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    const { workspace } = await getAuthenticatedUser();
    const { stageId, newPosition } = await request.json();

    if (!stageId || newPosition === undefined) {
      return NextResponse.json(
        { error: 'Missing stageId or newPosition' },
        { status: 400 }
      );
    }

    // Fetch the stage to verify it exists in user's workspace
    const stage = await db.kanbanStage.findUnique({
      where: { id: stageId },
    });

    if (!stage || stage.workspaceId !== workspace.id) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    // Get all stages and reorder
    const allStages = await db.kanbanStage.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { position: 'asc' },
    });

    // Remove the stage from its current position
    const otherStages = allStages.filter(s => s.id !== stageId);
    
    // Insert it at the new position
    otherStages.splice(newPosition, 0, allStages.find(s => s.id === stageId)!);

    // Update all positions
    const updates = otherStages.map((s, index) =>
      db.kanbanStage.update({
        where: { id: s.id },
        data: { position: index },
      })
    );

    await Promise.all(updates);

    // Return the reordered stages
    const updated = await db.kanbanStage.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ stages: updated });
  } catch (error) {
    console.error('Error reordering stages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
