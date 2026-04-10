import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    // Use raw SQL to include phoneNumber (bypasses Prisma type issues)
    const members = await db.$queryRaw<Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      phoneNumber: string | null;
      isOnline: boolean;
      createdAt: Date;
    }>>`
      SELECT "id", "name", "email", "role", "avatarUrl", "phoneNumber", "isOnline", "createdAt"
      FROM "users"
      WHERE "workspaceId" = ${dbUser.workspaceId}
      ORDER BY "name" ASC
    `;

    // Add cache headers - team members list is relatively static
    const response = NextResponse.json({ members });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error: any) {
    console.error('Failed to fetch workspace members:', error);
    
    // If phoneNumber column doesn't exist, try without it
    if (error.message?.includes('phoneNumber') || error.message?.includes('column')) {
      try {
        const members = await db.user.findMany({
          where: { workspaceId: dbUser.workspaceId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            isOnline: true,
            createdAt: true,
          },
          orderBy: { name: 'asc' },
        });
        // Add null phoneNumber to each member
        const membersWithPhone = members.map(m => ({ ...m, phoneNumber: null }));
        const response = NextResponse.json({ members: membersWithPhone });
        response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
        return response;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
