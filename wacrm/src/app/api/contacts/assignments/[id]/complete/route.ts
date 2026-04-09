import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function getUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { supabaseId: user.id } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactId = params.id;

    // Get the contact
    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Verify user belongs to workspace
    if (dbUser.workspaceId !== contact.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only the assigned user or OWNER/ADMIN can mark assignment complete
    if (contact.assignedToId !== dbUser.id && !['OWNER', 'ADMIN'].includes(dbUser.role)) {
      return NextResponse.json(
        { error: "You can only complete assignments assigned to you" },
        { status: 403 }
      );
    }

    // Mark as completed
    const updated = await db.contact.update({
      where: { id: contactId },
      data: {
        assignmentStatus: "COMPLETED",
        completedAt: new Date(),
      } as any,
      include: {
        assignedTo: true,
        assignedBy: true,
      } as any,
    });

    return NextResponse.json({
      success: true,
      assignment: updated,
    });
  } catch (error: any) {
    console.error("Complete assignment error:", error);
    return NextResponse.json(
      { error: "Failed to complete assignment" },
      { status: 500 }
    );
  }
}
