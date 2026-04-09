// src/app/api/contacts/[id]/intent-badge/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: 'This endpoint is no longer available' },
    { status: 404 }
  );
}
