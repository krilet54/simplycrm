import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendTextMessage, getWhatsAppCredentials } from '@/lib/whatsapp';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const sendSchema = z.object({
  invoiceId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { invoiceId } = sendSchema.parse(body);

    // Get invoice with contact info
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { contact: true, items: true, workspace: true },
    });

    if (!invoice || invoice.workspace.id !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get workspace settings
    const workspace = await db.workspace.findUnique({ where: { id: dbUser.workspaceId } });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get credentials (OAuth or legacy)
    const credentials = await getWhatsAppCredentials(workspace);

    // Format invoice message
    const itemsList = invoice.items?.length ?
      invoice.items.map(item => `  • ${item.description}: ₦${item.total.toLocaleString()} (${item.quantity}x @ ₦${item.unitPrice.toLocaleString()})`).join('\n')
      : '';

    const message = `*Invoice #${invoice.invoiceNumber}*\n\n${invoice.description ? `_${invoice.description}_\n\n` : ''}${itemsList ? `Items:\n${itemsList}\n\n` : ''}_Total: ₦${invoice.amount.toLocaleString()}_${invoice.dueDate ? `\n\nDue: ${new Date(invoice.dueDate).toLocaleDateString()}` : ''}`;

    // Send via WhatsApp
    await sendTextMessage({
      phoneNumberId: credentials.phoneNumberId,
      accessToken: credentials.accessToken,
      to: invoice.contact.phoneNumber,
      body: message,
    });

    // Update invoice status to SENT and set sentAt
    const updatedInvoice = await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT', sentAt: new Date() },
      include: { contact: true, items: true },
    });

    // Log activity: Invoice sent
    await logActivity({
      workspaceId: dbUser.workspaceId,
      contactId: invoice.contactId,
      activityType: 'INVOICE_SENT',
      actorId: dbUser.id,
      title: `Invoice #${invoice.invoiceNumber} sent to ${invoice.contact.name || invoice.contact.phoneNumber}`,
      description: `Amount: ₦${invoice.amount.toLocaleString()}`,
      metadata: { invoiceId, amount: invoice.amount, number: invoice.invoiceNumber },
    });

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('POST /api/invoices/send error:', error);
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 });
  }
}
