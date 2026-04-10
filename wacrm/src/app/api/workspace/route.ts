// src/app/api/workspace/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const schema = z.object({
  businessName:          z.string().min(1).max(100).optional(),
  whatsappPhoneNumberId: z.string().optional().nullable(),
  whatsappAccessToken:   z.string().optional().nullable(),
  // Invoice branding
  invoiceLogo:           z.string().url().optional().nullable(),
  invoicePrimaryColor:   z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  invoiceFooterText:     z.string().max(500).optional().nullable(),
  invoiceBusinessAddress: z.string().max(300).optional().nullable(),
  invoiceBusinessPhone:  z.string().max(30).optional().nullable(),
  invoiceBusinessEmail:  z.string().email().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();

    // Handle profile updates (name, phone number)
    if (body.updateProfile) {
      const { name, phoneNumber } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      const trimmedName = name.trim();
      const trimmedPhone = phoneNumber ? phoneNumber.trim() : null;

      try {
        // Use raw SQL to bypass Prisma's type checking for phoneNumber
        // This works even if Prisma client hasn't been regenerated
        await db.$executeRaw`
          UPDATE "users" 
          SET "name" = ${trimmedName}, 
              "phoneNumber" = ${trimmedPhone},
              "updatedAt" = NOW()
          WHERE "id" = ${dbUser.id}
        `;

        // Fetch the updated user using raw query to get phoneNumber
        const updatedUsers = await db.$queryRaw<Array<{
          id: string;
          name: string;
          email: string;
          phoneNumber: string | null;
        }>>`
          SELECT "id", "name", "email", "phoneNumber" 
          FROM "users" 
          WHERE "id" = ${dbUser.id}
        `;

        const updatedUser = updatedUsers[0];

        console.log('✅ User profile updated:', {
          userId: dbUser.id,
          name: updatedUser?.name,
          phoneNumber: updatedUser?.phoneNumber,
          hasPhone: !!updatedUser?.phoneNumber,
        });

        return NextResponse.json({ 
          success: true, 
          user: {
            id: updatedUser?.id || dbUser.id,
            name: updatedUser?.name || trimmedName,
            email: updatedUser?.email || dbUser.email,
            phoneNumber: updatedUser?.phoneNumber || undefined,
          }
        });
      } catch (err: any) {
        console.error('❌ Error updating user profile:', {
          errorCode: err.code,
          errorMessage: err.message,
          userId: dbUser.id,
          name: trimmedName,
          phoneNumber: trimmedPhone,
        });

        // Log the full error for debugging
        console.error('Full error object:', err);

        // Check for column doesn't exist error (PostgreSQL)
        if (err.message?.includes('column') && err.message?.includes('does not exist')) {
          // The phoneNumber column doesn't exist - try to create it automatically
          console.log('⚠️ phoneNumber column does not exist, attempting to create it...');
          
          try {
            // Create the phoneNumber column automatically
            await db.$executeRaw`
              ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT
            `;
            console.log('✅ phoneNumber column created successfully');
            
            // Now try to update again with the phone number
            await db.$executeRaw`
              UPDATE "users" 
              SET "name" = ${trimmedName}, 
                  "phoneNumber" = ${trimmedPhone},
                  "updatedAt" = NOW()
              WHERE "id" = ${dbUser.id}
            `;
            
            return NextResponse.json({ 
              success: true, 
              user: {
                id: dbUser.id,
                name: trimmedName,
                email: dbUser.email,
                phoneNumber: trimmedPhone || undefined,
              },
              message: 'Profile updated (phoneNumber column was auto-created)'
            });
          } catch (createErr: any) {
            console.error('❌ Failed to create phoneNumber column:', createErr.message);
            
            // If we can't create the column, just save the name
            await db.$executeRaw`
              UPDATE "users" 
              SET "name" = ${trimmedName},
                  "updatedAt" = NOW()
              WHERE "id" = ${dbUser.id}
            `;
            
            return NextResponse.json({ 
              success: true, 
              user: {
                id: dbUser.id,
                name: trimmedName,
                email: dbUser.email,
                phoneNumber: undefined,
              },
              warning: 'Phone number not saved - database migration pending. Run: npx prisma migrate deploy'
            });
          }
        }

        // Check for specific error codes
        if (err.code === 'P1008') {
          // Connection error
          return NextResponse.json({ 
            error: 'Database connection failed',
            details: 'Unable to reach database. Check your connection.'
          }, { status: 503 });
        }

        // Generic error - but include the actual message for debugging
        console.error('Generic error details:', {
          code: err.code,
          message: err.message,
          meta: err.meta,
        });

        return NextResponse.json({ 
          error: 'Failed to update profile: ' + (err.message || 'Unknown error'),
          details: 'Check the server logs for more information'
        }, { status: 500 });
      }
    }

    // Handle workspace updates (only for OWNER/ADMIN)
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Only update access token if explicitly provided (non-empty string)
    const data: Record<string, unknown> = {};
    if (parsed.data.businessName !== undefined)          data.businessName          = parsed.data.businessName;
    if (parsed.data.whatsappPhoneNumberId !== undefined) data.whatsappPhoneNumberId = parsed.data.whatsappPhoneNumberId;
    if (parsed.data.whatsappAccessToken)                 data.whatsappAccessToken   = parsed.data.whatsappAccessToken;
    // Invoice branding
    if (parsed.data.invoiceLogo !== undefined)           data.invoiceLogo           = parsed.data.invoiceLogo;
    if (parsed.data.invoicePrimaryColor !== undefined)   data.invoicePrimaryColor   = parsed.data.invoicePrimaryColor;
    if (parsed.data.invoiceFooterText !== undefined)     data.invoiceFooterText     = parsed.data.invoiceFooterText;
    if (parsed.data.invoiceBusinessAddress !== undefined) data.invoiceBusinessAddress = parsed.data.invoiceBusinessAddress;
    if (parsed.data.invoiceBusinessPhone !== undefined)  data.invoiceBusinessPhone  = parsed.data.invoiceBusinessPhone;
    if (parsed.data.invoiceBusinessEmail !== undefined)  data.invoiceBusinessEmail  = parsed.data.invoiceBusinessEmail;

    const workspace = await db.workspace.update({
      where: { id: dbUser.workspaceId },
      data,
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('PATCH /api/workspace error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('id');

  // Allow fetching workspace info by ID (for invite flow)
  if (workspaceId) {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        businessName: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  }

  // For authenticated requests, return full workspace data
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const workspace = await db.workspace.findUnique({
    where: { id: dbUser.workspaceId },
    select: {
      id: true,
      businessName: true,
      plan: true,
      // Invoice branding
      invoiceLogo: true,
      invoicePrimaryColor: true,
      invoiceFooterText: true,
      invoiceBusinessAddress: true,
      invoiceBusinessPhone: true,
      invoiceBusinessEmail: true,
      // Never expose access token
    },
  });

  return NextResponse.json({ workspace });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/workspace - Export all workspace data as ZIP
// ═══════════════════════════════════════════════════════════════════════════════

// Helper to convert array of objects to CSV string
function arrayToCSV(data: any[], columns: { key: string; header: string }[]): string {
  if (data.length === 0) {
    return columns.map(c => c.header).join(',') + '\n';
  }

  const header = columns.map(c => c.header).join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      let value = row[col.key];
      if (value === null || value === undefined) {
        return '';
      }
      if (value instanceof Date) {
        value = value.toISOString();
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

// Simple ZIP file creator
function createZipFile(files: { name: string; content: string }[]): ArrayBuffer {
  const entries: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const content = Buffer.from(file.content, 'utf-8');
    const fileName = Buffer.from(file.name, 'utf-8');
    
    const localHeader = Buffer.alloc(30 + fileName.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileName.copy(localHeader, 30);
    
    entries.push(localHeader);
    entries.push(content);
    
    const centralEntry = Buffer.alloc(46 + fileName.length);
    centralEntry.writeUInt32LE(0x02014b50, 0);
    centralEntry.writeUInt16LE(20, 4);
    centralEntry.writeUInt16LE(20, 6);
    centralEntry.writeUInt16LE(0, 8);
    centralEntry.writeUInt16LE(0, 10);
    centralEntry.writeUInt16LE(0, 12);
    centralEntry.writeUInt16LE(0, 14);
    centralEntry.writeUInt32LE(0, 16);
    centralEntry.writeUInt32LE(content.length, 20);
    centralEntry.writeUInt32LE(content.length, 24);
    centralEntry.writeUInt16LE(fileName.length, 28);
    centralEntry.writeUInt16LE(0, 30);
    centralEntry.writeUInt16LE(0, 32);
    centralEntry.writeUInt16LE(0, 34);
    centralEntry.writeUInt16LE(0, 36);
    centralEntry.writeUInt32LE(0, 38);
    centralEntry.writeUInt32LE(offset, 42);
    fileName.copy(centralEntry, 46);
    
    centralDirectory.push(centralEntry);
    offset += localHeader.length + content.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralDirectory.reduce((sum, buf) => sum + buf.length, 0);

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirSize, 12);
  endRecord.writeUInt32LE(centralDirOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  const zipBytes = Buffer.concat([...entries, ...centralDirectory, endRecord]);
  const zipArrayBuffer = new ArrayBuffer(zipBytes.byteLength);
  new Uint8Array(zipArrayBuffer).set(zipBytes);
  return zipArrayBuffer;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    // Handle data export
    if (body.action === 'export') {
      if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
        return NextResponse.json({ error: 'Only owner and admin can export data' }, { status: 403 });
      }

      const workspaceId = dbUser.workspaceId;

      try {
        const [contacts, invoices, workspace] = await Promise.all([
        db.contact.findMany({
          where: { workspaceId },
          include: {
            assignedTo: { select: { name: true, email: true } },
            kanbanStage: { select: { name: true } },
            contactTags: { include: { tag: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        db.invoice.findMany({
          where: { workspaceId },
          include: {
            contact: { select: { name: true, phoneNumber: true, email: true } },
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        db.workspace.findUnique({ where: { id: workspaceId } }),
      ]);

      const contactsCSV = arrayToCSV(contacts.map(c => ({
        id: c.id,
        name: c.name || '',
        phoneNumber: c.phoneNumber,
        email: c.email || '',
        source: c.source || '',
        stage: c.kanbanStage?.name || '',
        assignedTo: c.assignedTo?.name || '',
        tags: c.contactTags.map(ct => ct.tag.name).join('; '),
        createdAt: c.createdAt,
      })), [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'phoneNumber', header: 'Phone Number' },
        { key: 'email', header: 'Email' },
        { key: 'source', header: 'Source' },
        { key: 'stage', header: 'Pipeline Stage' },
        { key: 'assignedTo', header: 'Assigned To' },
        { key: 'tags', header: 'Tags' },
        { key: 'createdAt', header: 'Created At' },
      ]);

      const invoicesCSV = arrayToCSV(invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        contactName: inv.contact?.name || '',
        contactPhone: inv.contact?.phoneNumber || '',
        description: inv.description || '',
        status: inv.status,
        amount: inv.amount,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        items: inv.items.map(i => `${i.description} (${i.quantity} x ${i.unitPrice})`).join('; '),
        createdAt: inv.createdAt,
      })), [
        { key: 'id', header: 'ID' },
        { key: 'invoiceNumber', header: 'Invoice Number' },
        { key: 'contactName', header: 'Contact Name' },
        { key: 'contactPhone', header: 'Contact Phone' },
        { key: 'description', header: 'Description' },
        { key: 'status', header: 'Status' },
        { key: 'amount', header: 'Amount' },
        { key: 'dueDate', header: 'Due Date' },
        { key: 'paidAt', header: 'Paid At' },
        { key: 'items', header: 'Items' },
        { key: 'createdAt', header: 'Created At' },
      ]);

      const zipBuffer = createZipFile([
        { name: 'contacts.csv', content: contactsCSV },
        { name: 'invoices.csv', content: invoicesCSV },
      ]);

      const businessName = workspace?.businessName?.replace(/[^a-zA-Z0-9]/g, '_') || 'crebo';
      const fileName = `${businessName}_export_${new Date().toISOString().split('T')[0]}.zip`;

      return new NextResponse(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': zipBuffer.byteLength.toString(),
        },
      });
      } catch (exportError) {
        console.error('Export error:', exportError);
        throw exportError;
      }
    }

    // Handle onboarding completion
    if (body.action === 'completeOnboarding') {
      if (dbUser.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only workspace owner can update onboarding' }, { status: 403 });
      }

      try {
        await db.$executeRaw`
          UPDATE "workspaces" 
          SET "onboardingCompleted" = true, "updatedAt" = NOW()
          WHERE "id" = ${dbUser.workspaceId}
        `;
        return NextResponse.json({ success: true });
      } catch (err) {
        // Column might not exist yet, that's okay - treat as completed
        console.log('Note: onboardingCompleted column may not exist yet');
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/workspace error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/workspace - Delete entire workspace and all data
// ═══════════════════════════════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Only OWNER can delete workspace
    if (dbUser.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the workspace owner can delete the account' }, { status: 403 });
    }

    const body = await req.json();
    const { confirmationName } = body;

    const workspace = await db.workspace.findUnique({ 
      where: { id: dbUser.workspaceId },
      select: { businessName: true, id: true }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Verify confirmation
    if (confirmationName !== workspace.businessName) {
      return NextResponse.json({ 
        error: 'Confirmation does not match. Please type your business name exactly to confirm deletion.' 
      }, { status: 400 });
    }

    const workspaceId = workspace.id;

    console.log(`🗑️ Starting workspace deletion for: ${workspace.businessName} (${workspaceId})`);

    // Capture Supabase user IDs before deleting workspace users from DB.
    const users = await db.user.findMany({
      where: { workspaceId },
      select: { supabaseId: true },
    });

    // Delete all related data in correct order (respecting foreign keys)
    await db.$transaction(async (tx) => {
      // 1. Delete invoice items
      await tx.invoiceItem.deleteMany({
        where: { invoice: { workspaceId } }
      });
      console.log('  ✓ Deleted invoice items');

      // 2. Delete recurring invoice items
      await tx.recurringInvoiceItem.deleteMany({
        where: { recurringInvoice: { workspaceId } }
      });
      console.log('  ✓ Deleted recurring invoice items');

      // 3. Delete invoices
      await tx.invoice.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted invoices');

      // 4. Delete recurring invoices
      await tx.recurringInvoice.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted recurring invoices');

      // 5. Delete emails
      await tx.email.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted emails');

      // 6. Delete notes
      await tx.note.deleteMany({ where: { contact: { workspaceId } } });
      console.log('  ✓ Deleted notes');

      // 7. Delete activities  
      await tx.activity.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted activities');

      // 8. Delete follow-ups
      await tx.followUp.deleteMany({ where: { contact: { workspaceId } } });
      console.log('  ✓ Deleted follow-ups');

      // 9. Delete tasks
      await tx.task.deleteMany({ 
        where: { 
          OR: [
            { createdBy: { workspaceId } },
            { assignedTo: { workspaceId } },
          ]
        }
      });
      console.log('  ✓ Deleted tasks');

      // 10. Delete contact tags (join table) - use Prisma model instead of raw SQL
      await tx.contactTag.deleteMany({
        where: { contact: { workspaceId } }
      });
      console.log('  ✓ Deleted contact tags');

      // 11. Delete contacts
      await tx.contact.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted contacts');

      // 12. Delete notifications
      await tx.notification.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted notifications');

      // 13. Delete invites
      await tx.invite.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted invites');

      // 14. Delete quick replies
      await tx.quickReply.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted quick replies');

      // 15. Delete tags
      await tx.tag.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted tags');

      // 16. Delete kanban stages
      await tx.kanbanStage.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted kanban stages');

      // 17. Delete Meta OAuth token
      await tx.metaOAuthToken.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted Meta OAuth tokens');

      // 18. Delete all users in workspace
      await tx.user.deleteMany({ where: { workspaceId } });
      console.log('  ✓ Deleted users');

      // 19. Delete workspace
      await tx.workspace.delete({ where: { id: workspaceId } });
      console.log('  ✓ Deleted workspace');
    }, {
      timeout: 120000,
      maxWait: 10000,
    });

    // Delete Supabase auth users after the DB transaction commits.
    const { createSupabaseServiceClient } = await import('@/lib/supabase-server');
    const supabaseAdmin = createSupabaseServiceClient();
    for (const u of users) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(u.supabaseId);
      } catch (e) {
        console.warn(`  ⚠️ Failed to delete Supabase user ${u.supabaseId}:`, e);
      }
    }
    console.log('  ✓ Deleted Supabase auth users');

    console.log(`✅ Workspace "${workspace.businessName}" deleted successfully`);

    return NextResponse.json({ 
      success: true, 
      message: 'Account and all data have been permanently deleted' 
    });
  } catch (error) {
    console.error('DELETE /api/workspace error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete account' 
    }, { status: 500 });
  }
}
