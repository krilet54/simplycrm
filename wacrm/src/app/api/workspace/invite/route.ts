import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['AGENT', 'ADMIN']).default('AGENT'),
});

export async function POST(req: NextRequest) {
  // Strict rate limiting for invites
  const rateLimitResponse = await checkRateLimit(req, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json();
    
    // Handle invite acceptance during onboarding (create user + mark accept)
    if (body.acceptInvite && body.inviteId && body.supabaseId) {
      const { inviteId, supabaseId, name, phoneNumber } = body;

      // Get the invite
      const invite = await db.invite.findUnique({
        where: { id: inviteId },
      });

      if (!invite) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }

      if (invite.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 });
      }

      if (new Date() > invite.expiresAt) {
        return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
      }

      // Create user with phone number and name
      try {
        const user = await db.user.create({
          data: {
            workspaceId: invite.workspaceId,
            supabaseId,
            email: invite.email,
            name: name || invite.email.split('@')[0],
            phoneNumber: phoneNumber || '',
            role: invite.role as any,
          },
        });

        // Mark invite as accepted
        await db.invite.update({
          where: { id: inviteId },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        });

        return NextResponse.json({ success: true, user });
      } catch (err: any) {
        // If phoneNumber field doesn't exist in database, create without it
        if (err.code === 'P1047' || err.message?.includes('phoneNumber')) {
          console.log('Note: phoneNumber field not yet in database, creating user without it');
          const user = await db.user.create({
            data: {
              workspaceId: invite.workspaceId,
              supabaseId,
              email: invite.email,
              name: name || invite.email.split('@')[0],
              role: invite.role as any,
            },
          });

          // Mark invite as accepted
          await db.invite.update({
            where: { id: inviteId },
            data: {
              status: 'ACCEPTED',
              acceptedAt: new Date(),
            },
          });

          return NextResponse.json({ success: true, user });
        }
        throw err;
      }
    }
    
    // Handle legacy invite acceptance marking (if needed)
    if (body.markAccepted && body.inviteId) {
      await db.invite.update({
        where: { id: body.inviteId },
        data: { 
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true });
    }

    // Original invite creation logic
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ 
      where: { supabaseId: user.id },
      include: { workspace: true },
    });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Only OWNER and ADMIN can invite
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const result = inviteSchema.safeParse(body);
    
    if (!result.success) {
      const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: message || 'Validation error' }, { status: 400 });
    }

    const { email, role } = result.data;

    // Role-based invitation permissions
    // Only OWNER can invite ADMIN
    if (role === 'ADMIN' && dbUser.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only workspace owners can invite admins' }, { status: 403 });
    }

    // Check if user already exists in workspace
    const existingUser = await db.user.findFirst({
      where: {
        email,
        workspaceId: dbUser.workspaceId,
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists in workspace' }, { status: 400 });
    }

    // Create invitation email link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Generate unique invite ID
    const inviteId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Create invite record in database (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await db.invite.create({
      data: {
        id: inviteId,
        workspaceId: dbUser.workspaceId,
        email,
        role,
        status: 'PENDING',
        expiresAt,
      },
    });
    
    const inviteLink = `${appUrl}/auth/join-workspace?inviteId=${inviteId}`;

    // Send invitation email via Resend
    let emailSent = false;
    let emailError: string | null = null;
    
    // Determine if development environment
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_APP_URL?.includes('localhost');

    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
      }

      // For local development, use Resend's test domain
      // For production, use your verified domain
      const fromEmail = isDevelopment 
        ? 'onboarding@resend.dev'  // Resend's test email (works for testing)
        : (process.env.RESEND_FROM_EMAIL || 'noreply@crebo.io');
      
      console.log('📧 Sending invitation email:', {
        to: email,
        from: fromEmail,
        isDevelopment,
        role: role,
        workspaceName: dbUser.workspace?.businessName,
        appUrl,
      });

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `🎉 You're invited to join ${dbUser.workspace?.businessName || 'Crebo'}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">
              <h2 style="color: #1F2937; margin-bottom: 12px;">You're invited to join ${dbUser.workspace?.businessName || 'Crebo'}! 🎉</h2>
              
              <p style="margin-bottom: 16px; line-height: 1.5;">
                Hi there,
              </p>
              
              <p style="margin-bottom: 16px; line-height: 1.5;">
                <strong>${dbUser.name}</strong> at <strong>${dbUser.workspace?.businessName || 'Crebo'}</strong> has invited you to join their team as an <strong>${role}</strong>.
              </p>

              <div style="margin: 32px 0;">
                <a href="${inviteLink}" style="display: inline-block; padding: 14px 32px; background-color: #25D366; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ✅ Accept Invitation & Create Account
                </a>
              </div>

              <p style="margin-bottom: 16px; line-height: 1.5; font-size: 14px; color: #666;">
                <strong>What happens when you click the button:</strong>
              </p>
              <ul style="margin-bottom: 24px; font-size: 14px; color: #666; line-height: 1.6;">
                <li>✓ Set up your account with an email and password</li>
                <li>✓ Sign in to the workspace</li>
                <li>✓ Complete your profile</li>
              </ul>

              <p style="margin-bottom: 8px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px;">
                Questions? Reply to this email or contact support.
              </p>
              
              <p style="margin-bottom: 0; font-size: 12px; color: #999;">
                This invite link will expire in 7 days.
              </p>
            </div>
          `,
        }),
      });

      const responseData = await emailResponse.json();
      
      console.log('✅ Email API response:', {
        status: emailResponse.status,
        success: emailResponse.ok,
        responseData,
      });

      if (!emailResponse.ok) {
        throw new Error(`Email API error (${emailResponse.status}): ${responseData.message || emailResponse.statusText}`);
      }

      emailSent = true;
      console.log('✅ Invitation email sent successfully to:', email);
    } catch (err) {
      emailError = (err as Error).message;
      console.error('❌ Error sending invitation email:', {
        error: emailError,
        recipientEmail: email,
        senderEmail: isDevelopment ? 'onboarding@resend.dev' : process.env.RESEND_FROM_EMAIL,
        apiKeyConfigured: !!process.env.RESEND_API_KEY,
      });
    }

    // Store pending invitation record in DB for tracking
    // (This helps track who was invited but hasn't accepted yet)
    try {
      await db.user.create({
        data: {
          workspaceId: dbUser.workspaceId,
          supabaseId: `pending_${email}_${Date.now()}`, // Temporary ID for pending users
          name: email.split('@')[0],
          email,
          role,
        },
      });
    } catch (err) {
      // If user creation fails due to unique constraint, they might already be pending
      console.error('Error creating pending user record:', err);
    }

    console.log('📋 Invitation created:', {
      email,
      role,
      emailSent,
      hasError: !!emailError,
    });

    return NextResponse.json({ 
      success: true,
      message: emailSent 
        ? '✅ Invitation sent successfully via email! Check your inbox (or spam folder).' 
        : `⚠️ Email failed to send (${emailError}). But don't worry - use the invite link below to share with the team member.`,
      emailSent,
      emailError,
      // ALWAYS return the invite link for local development and testing
      inviteLink,
      role,
      workspaceName: dbUser.workspace?.businessName,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/workspace/invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET list of team members OR validate invite OR get pending invites
export async function GET(req: NextRequest) {
  try {
    // Check if this is pending invites request
    const pending = req.nextUrl.searchParams.get('pending');
    
    if (pending === 'true') {
      // Get pending invitations (requires auth)
      const supabase = createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
      if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      // Only OWNER and ADMIN can view pending invites
      if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const invites = await db.invite.findMany({
        where: {
          workspaceId: dbUser.workspaceId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        invites: invites.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${inv.id}`,
        })),
      });
    }

    // Check if this is an invite validation request
    const inviteId = req.nextUrl.searchParams.get('inviteId');
    
    if (inviteId) {
      // Validate invite (public endpoint - no auth required)
      const invite = await db.invite.findUnique({
        where: { id: inviteId },
        include: { workspace: true },
      });

      if (!invite) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }

      // Check if invite has expired
      if (new Date() > invite.expiresAt) {
        await db.invite.update({
          where: { id: inviteId },
          data: { status: 'EXPIRED' },
        });
        return NextResponse.json(
          { error: 'Invitation has expired. Please contact your workspace admin to send a new invite.' },
          { status: 410 }
        );
      }

      // Check if already accepted
      if (invite.status === 'ACCEPTED') {
        return NextResponse.json(
          { error: 'This invitation has already been used.' },
          { status: 400 }
        );
      }

      // Return invite details
      return NextResponse.json({
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          workspaceName: invite.workspace.businessName,
          workspaceId: invite.workspaceId,
        },
      });
    }

    // Otherwise, get team members (requires auth)
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    console.log('GET /api/workspace/invite - fetching team members for workspace:', dbUser.workspaceId);

    const users = await db.user.findMany({
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
      orderBy: { createdAt: 'asc' },
    });

    console.log('GET /api/workspace/invite - found team members:', users.length);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('GET /api/workspace/invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update user role
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Only OWNER can change roles
    if (dbUser.role !== 'OWNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
    }

    // Verify target user belongs to workspace
    const targetUser = await db.user.findFirst({
      where: { id: userId, workspaceId: dbUser.workspaceId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Can't remove OWNER role
    if (targetUser.role === 'OWNER' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Cannot remove OWNER role' }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('PATCH /api/workspace/invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE remove user from workspace OR revoke invitation
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Only OWNER and ADMIN can remove users or revoke invites
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    console.log('DELETE /api/workspace/invite - attempting to delete/revoke ID:', id);

    // First, try to find and revoke an invite
    const invite = await db.invite.findFirst({
      where: { id, workspaceId: dbUser.workspaceId },
    });

    if (invite) {
      // It's an invite - revoke it by marking as expired
      console.log('Found invite to revoke:', id);
      await db.invite.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      console.log('Invite revoked successfully:', id);
      return NextResponse.json({ success: true, type: 'invite', message: 'Invitation revoked' });
    }

    // Otherwise, try to find and remove a user
    const targetUser = await db.user.findFirst({
      where: { id, workspaceId: dbUser.workspaceId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User or invitation not found' }, { status: 404 });
    }

    // Can't delete OWNER
    if (targetUser.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot delete workspace owner' }, { status: 400 });
    }

    // Can't delete yourself
    if (targetUser.id === dbUser.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from workspace' }, { status: 400 });
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/workspace/invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
