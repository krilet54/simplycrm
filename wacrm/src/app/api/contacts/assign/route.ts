import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { notifyContactAssignment } from "@/lib/notifications";

interface AssignPayload {
  contactId: string;
  assignToId: string;
  delegationNote?: string;
}

async function getUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { supabaseId: user.id } });
}

export async function POST(request: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and ADMIN can assign contacts
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      console.warn('🚫 Non-admin user attempted to assign contact:', {
        userId: dbUser.id,
        role: dbUser.role,
      });
      return NextResponse.json(
        { error: "Only admins can assign contacts" },
        { status: 403 }
      );
    }

    const payload: AssignPayload = await request.json();
    const { contactId, assignToId: assignedToId, delegationNote } = payload;

    if (!contactId || !assignedToId) {
      return NextResponse.json(
        { error: "Missing required fields: contactId and assignToId" },
        { status: 400 }
      );
    }

    // Get the contact
    const contact = await db.contact.findUnique({
      where: { id: contactId },
      include: {
        workspace: true,
        assignedTo: true,
      } as any,
    });

    if (!contact) {
      console.warn('❌ Contact not found during assignment:', { contactId });
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Verify user belongs to workspace
    if (dbUser.workspaceId !== contact.workspaceId) {
      console.warn('❌ Workspace mismatch during assignment:', {
        userId: dbUser.id,
        userWorkspace: dbUser.workspaceId,
        contactWorkspace: contact.workspaceId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get and verify the assignee exists and is in same workspace
    const assignee = await db.user.findUnique({
      where: { id: assignedToId },
    });

    if (!assignee) {
      console.warn('❌ Assignee not found:', { assignedToId });
      return NextResponse.json(
        { error: "Assignee not found" },
        { status: 404 }
      );
    }

    if (assignee.workspaceId !== contact.workspaceId) {
      console.warn('❌ Assignee workspace mismatch:', {
        assigneeWorkspace: assignee.workspaceId,
        contactWorkspace: contact.workspaceId,
      });
      return NextResponse.json(
        { error: "Assignee is not in the same workspace" },
        { status: 403 }
      );
    }

    // Update contact with assignment
    console.log('🔵 ASSIGNMENT DEBUG:', {
      contactId,
      assignedToId,
      assignedById: dbUser.id,
      beforeUpdate: {
        name: contact.name,
        currentAssignedToId: contact.assignedToId,
      },
    });

    const updatedContact = await db.contact.update({
      where: { id: contactId },
      data: {
        assignedToId,
        assignedById: dbUser.id,
        delegationNote: delegationNote || null,
        assignedAt: new Date(),
        assignmentStatus: "ACTIVE",
      } as any,
      include: {
        assignedTo: true,
        assignedBy: true,
      } as any,
    }) as any;

    console.log('✅ ASSIGNMENT UPDATED:', {
      contactId: updatedContact.id,
      contactName: updatedContact.name,
      assignedToId: updatedContact.assignedToId,
      assignedToName: updatedContact.assignedTo?.name,
      assignedById: updatedContact.assignedById,
      assignmentStatus: updatedContact.assignmentStatus,
    });

    // Send email to assignee via Resend
    if (assignee.email && assignee.email !== dbUser.email) {
      try {
        const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #22c55e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
      .note-box { background: white; border-left: 4px solid #22c55e; padding: 12px; margin: 15px 0; }
      .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
      .footer { color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2 style="margin: 0;">New Assignment</h2>
      </div>
      <div class="content">
        <p>Hi ${assignee.name},</p>
        <p><strong>${dbUser.name}</strong> has assigned a contact to you.</p>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="margin-top: 0;">${contact.name || contact.phoneNumber}</h3>
          <p style="margin: 5px 0;"><strong>Phone:</strong> ${contact.phoneNumber}</p>
          ${contact.email ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${contact.email}</p>` : ""}
          ${contact.interest ? `<p style="margin: 5px 0;"><strong>Interest:</strong> ${contact.interest}</p>` : ""}
        </div>

        ${
          delegationNote
            ? `
        <div class="note-box">
          <strong style="color: #22c55e;">Note from ${dbUser.name}:</strong>
          <p style="margin: 8px 0 0 0;">${delegationNote}</p>
        </div>
        `
            : ""
        }

        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/followups" class="button">Open in Crebo →</a></p>

        <div class="footer">
          <p>This contact is now in your "My Work" queue. Mark it complete when done.</p>
          <p>— Crebo Team</p>
        </div>
      </div>
    </div>
  </body>
</html>
        `;

        const resend = (await import("resend")).Resend;
        const client = new resend(process.env.RESEND_API_KEY);
        
        await client.emails.send({
          from: "Crebo <assignments@notify.crebo.io>",
          to: assignee.email,
          subject: `${dbUser.name} assigned you a new contact — ${
            contact.name || contact.phoneNumber
          }`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("Failed to send assignment email:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Create in-app notification
    try {
      await notifyContactAssignment(
        contact.workspaceId,
        contact.id,
        assignee.id,
        assignee.name,
        assignee.email,
        contact.name || contact.phoneNumber || 'Unnamed Contact',
        delegationNote
      );
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError);
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      assignment: updatedContact,
    });
  } catch (error: any) {
    console.error("❌ Assignment error:", error);
    const errorMessage = error?.message || "Failed to assign contact";
    return NextResponse.json(
      { 
        error: "Failed to assign contact",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
