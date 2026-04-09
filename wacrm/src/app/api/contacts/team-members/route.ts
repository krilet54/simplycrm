import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { supabaseId: user.id } });
}

export async function GET(request: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all team members in workspace
    const teamMembers = await db.user.findMany({
      where: {
        workspaceId: dbUser.workspaceId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(teamMembers);
  } catch (error: any) {
    console.error("Get team members error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
