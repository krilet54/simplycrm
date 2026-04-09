// src/app/api/kanban/stages/route.ts
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getAuthenticatedUser();

    const stages = await db.kanbanStage.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ stages });
  } catch (error) {
    console.error('Error fetching stages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getAuthenticatedUser();
    const { name, color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });
    }

    // Get the next position
    const lastStage = await db.kanbanStage.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { position: 'desc' },
    });

    const nextPosition = (lastStage?.position ?? -1) + 1;

    const stage = await db.kanbanStage.create({
      data: {
        workspaceId: workspace.id,
        name: name.trim(),
        color: color || '#6366f1',
        position: nextPosition,
        isDefault: false,
      },
    });

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    console.error('Error creating stage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
