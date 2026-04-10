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
    const countOnly = searchParams.get("countOnly") === "true";
    const limitParam = Number(searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 100;

    if (action === "delegated") {
      if (!["OWNER", "ADMIN"].includes(dbUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const delegatedWhere = {
        workspaceId: dbUser.workspaceId,
        assignedById: dbUser.id,
        assignedToId: { not: null },
        deletedAt: null,
      };

      if (countOnly) {
        const count = await db.contact.count({ where: delegatedWhere });
        return NextResponse.json({ count });
      }

      const contacts = await db.contact.findMany({
        where: delegatedWhere,
        select: {
          id: true,
          workspaceId: true,
          phoneNumber: true,
          name: true,
          email: true,
          avatarUrl: true,
          kanbanStageId: true,
          isBlocked: true,
          source: true,
          sourceNote: true,
          interest: true,
          estimatedValue: true,
          confidenceLevel: true,
          lastActivityAt: true,
          assignedToId: true,
          assignedById: true,
          delegationNote: true,
          assignmentStatus: true,
          assignedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
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
          kanbanStage: {
            select: {
              id: true,
              name: true,
              color: true,
              position: true,
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
        take: limit,
      });

      return NextResponse.json({
        contacts,
        count: contacts.length,
      });
    }

    const where: any = {
      workspaceId: dbUser.workspaceId,
      assignmentStatus: status,
      deletedAt: null,
      assignedToId: dbUser.id,
    };

    if (countOnly) {
      const count = await db.contact.count({ where });
      return NextResponse.json({ count });
    }

    const assignments = await db.contact.findMany({
      where,
      select: {
        id: true,
        workspaceId: true,
        phoneNumber: true,
        name: true,
        email: true,
        avatarUrl: true,
        kanbanStageId: true,
        isBlocked: true,
        source: true,
        sourceNote: true,
        interest: true,
        estimatedValue: true,
        confidenceLevel: true,
        lastActivityAt: true,
        assignedToId: true,
        assignedById: true,
        delegationNote: true,
        assignmentStatus: true,
        assignedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        kanbanStage: {
          select: {
            id: true,
            name: true,
            color: true,
            position: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
      take: limit,
    });

    const [activeCounts, completedCounts] = await Promise.all([
      db.contact.count({
        where: {
          workspaceId: dbUser.workspaceId,
          assignedToId: dbUser.id,
          assignmentStatus: "ACTIVE",
          deletedAt: null,
        },
      }),
      db.contact.count({
        where: {
          workspaceId: dbUser.workspaceId,
          assignedToId: dbUser.id,
          assignmentStatus: "COMPLETED",
          deletedAt: null,
        },
      }),
    ]);

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
      { error: "Failed to fetch assignments", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, contactId } = body;

    if (action === "unassign") {
      if (!["OWNER", "ADMIN"].includes(dbUser.role)) {
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

      const contact = await db.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      if (dbUser.workspaceId !== contact.workspaceId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("My work action error:", error);
    return NextResponse.json(
      { error: "Failed to perform action", details: error?.message },
      { status: 500 }
    );
  }
}
