import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const updateSchema = z.object({
  description: z.string().max(500).optional().nullable(),
  amount: z.number().positive().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  sentAt: z.string().datetime().optional().nullable(),
  paidAt: z.string().datetime().optional().nullable(),
});

// GET /api/invoices/[id] - Get invoice or generate PDF
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    // Get invoice with contact and workspace
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        contact: true,
        workspace: true,
        items: true,
      },
    });

    if (!invoice || invoice.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // If PDF format requested
    if (format === 'pdf') {
      const html = generateInvoicePdfHtml(invoice);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.html"`,
        },
      });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('GET /api/invoices/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id } = params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Verify invoice belongs to workspace
    const invoice = await db.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.sentAt !== undefined) updateData.sentAt = data.sentAt ? new Date(data.sentAt) : null;
    if (data.paidAt !== undefined) updateData.paidAt = data.paidAt ? new Date(data.paidAt) : null;

    const updatedInvoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: { contact: true, items: true },
    });

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('PATCH /api/invoices/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id } = params;

    // Verify invoice belongs to workspace
    const invoice = await db.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Can only delete DRAFT invoices
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Can only delete draft invoices' }, { status: 400 });
    }

    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/invoices/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Generate HTML for PDF invoice
function generateInvoicePdfHtml(invoice: any): string {
  const statusClass: Record<string, string> = {
    DRAFT: 'status-draft',
    SENT: 'status-sent',
    PAID: 'status-paid',
    OVERDUE: 'status-overdue',
    CANCELLED: 'status-draft',
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const invoiceHtml = `
    <div class="invoice">
      <div class="header">
        <div class="company">${invoice.workspace.businessName}</div>
        <div class="invoice-title">
          <h1>INVOICE</h1>
          <div class="invoice-number">${invoice.invoiceNumber}</div>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-label">From</div>
          <div class="party-name">${invoice.workspace.businessName}</div>
        </div>
        <div class="party">
          <div class="party-label">Bill To</div>
          <div class="party-name">${invoice.contact.name || invoice.contact.phoneNumber}</div>
          ${invoice.contact.email ? `<div class="party-detail">${invoice.contact.email}</div>` : ''}
          <div class="party-detail">${invoice.contact.phoneNumber}</div>
        </div>
      </div>

      <div class="details">
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Invoice Date</div>
            <div class="detail-value">${formatDate(invoice.createdAt)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Due Date</div>
            <div class="detail-value">${formatDate(invoice.dueDate)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Status</div>
            <div class="detail-value"><span class="status ${statusClass[invoice.status] || 'status-draft'}">${invoice.status}</span></div>
          </div>
        </div>
      </div>

      <div class="amount-section">
        <div class="amount">₦${invoice.amount.toLocaleString('en-US')}</div>
        <div class="amount-label">Amount Due</div>
      </div>

      ${invoice.description ? `
        <div class="description">
          <div class="description-label">Description</div>
          <div class="description-text">${invoice.description}</div>
        </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        <p style="margin-top: 8px;">Generated by WACRM</p>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #333; }
          .invoice { max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
          .company { font-size: 24px; font-weight: bold; color: #2e8535; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 28px; color: #111; margin-bottom: 8px; }
          .invoice-number { color: #666; font-size: 14px; }
          .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .party { width: 45%; }
          .party-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
          .party-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
          .party-detail { font-size: 14px; color: #666; }
          .details { margin-bottom: 40px; }
          .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .detail-item { }
          .detail-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
          .detail-value { font-size: 14px; font-weight: 500; }
          .amount-section { background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 40px; }
          .amount { font-size: 36px; font-weight: bold; color: #2e8535; text-align: center; }
          .amount-label { text-align: center; color: #666; margin-top: 8px; }
          .description { margin-bottom: 40px; }
          .description-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
          .description-text { font-size: 14px; line-height: 1.6; }
          .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .status-draft { background: #f3f4f6; color: #6b7280; }
          .status-sent { background: #dbeafe; color: #2563eb; }
          .status-paid { background: #d1fae5; color: #059669; }
          .status-overdue { background: #fef3c7; color: #d97706; }
        </style>
      </head>
      <body>
        ${invoiceHtml}
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `;
}
