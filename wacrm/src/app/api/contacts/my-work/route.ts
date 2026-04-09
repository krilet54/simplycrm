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

export async function GET(request: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const status = (searchParams.get("status") || "ACTIVE") as "ACTIVE" | "COMPLETED";
    const userRole = searchParams.get("userRole") || dbUser.role;

    // Special action for owners/admins - get delegated contacts
    if (action === "delegated") {
      if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Get contacts that this user has assigned to others
      const contacts = await db.contact.findMany({
        where: {
          workspaceId: dbUser.workspaceId,
          assignedById: dbUser.id,
          assignedToId: { not: null },
          deletedAt: null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          kanbanStage: true,
        },
        orderBy: {
          assignedAt: 'desc',
        },
      });

      return NextResponse.json({
        contacts,
        count: contacts.length,
      });
    }

    // Default behavior - get my assignments
    let where: any = {
      workspaceId: dbUser.workspaceId,
      assignmentStatus: status,
      deletedAt: null,
    };

    // Role-based visibility:
    // - OWNER/ADMIN: This endpoint now just returns agent's assigned contacts
    // - AGENT: see only contacts assigned to them
    where.assignedToId = dbUser.id;

    // Get assignments
    const assignments = await db.contact.findMany({
      where,
      include: {
        kanbanStage: true,
        assignedBy: true,
        assignedTo: true,
      } as any,
      orderBy: {
        assignedAt: "desc",
      } as any,
    });

    // Count active vs completed for this user
    const activeCounts = await db.contact.count({
      where: {
        workspaceId: dbUser.workspaceId,
        assignedToId: dbUser.id,
        assignmentStatus: "ACTIVE",
        deletedAt: null,
      },
    });

    const completedCounts = await db.contact.count({
      where: {
        workspaceId: dbUser.workspaceId,
        assignedToId: dbUser.id,
        assignmentStatus: "COMPLETED",
        deletedAt: null,
      },
    });

    return NextResponse.json({
      assignments,
      stats: {
        active: activeCounts,
        completed: completedCounts,
      },
    });
  } catch (error: any) {
    console.error("Get my work error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST method for unassign action
export async function POST(request: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, contactId } = body;

    if (action === "unassign") {
      // Only OWNER and ADMIN can unassign contacts
      if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
        return NextResponse.json(
          { error: "Only admins can unassign contacts" },
          { status: 403 }
        );
      }

      if (!contactId) {
        return NextResponse.json(
          { error: "Contact ID is required" },
          { status: 400 }
        );
      }

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

      // Clear the assignment
      const updated = await db.contact.update({
        where: { id: contactId },
        data: {
          assignedToId: null,
          assignedById: null,
          delegationNote: null,
          assignmentStatus: null,
          assignedAt: null,
          completedAt: null,
        } as any,
      });

      return NextResponse.json({
        success: true,
        contact: updated,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("My work action error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
