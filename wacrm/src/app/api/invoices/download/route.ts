import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('id');
    const format = searchParams.get('format') || 'pdf'; // pdf, html, or json

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
    }

    // Get invoice with all related data
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        contact: true,
        workspace: true,
        items: true,
      },
    });

    if (!invoice || invoice.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Generate invoice HTML
    const invoiceHtml = generateInvoiceHtml(invoice);

    if (format === 'html') {
      return new NextResponse(invoiceHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.html"`,
        },
      });
    }

    if (format === 'pdf') {
      // Return HTML that client will convert to PDF using html2pdf
      // Or return PDF binary if we have a server-side converter
      return NextResponse.json({
        html: invoiceHtml,
        invoiceNumber: invoice.invoiceNumber,
      });
    }

    if (format === 'json') {
      return NextResponse.json({ invoice });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/invoices/download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateInvoiceHtml(invoice: any): string {
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

  // Use workspace branding settings with fallbacks
  const primaryColor = invoice.workspace.invoicePrimaryColor || '#22c55e';
  const footerText = invoice.workspace.invoiceFooterText || 'Thank you for your business!';
  const businessAddress = invoice.workspace.invoiceBusinessAddress || '';
  const businessPhone = invoice.workspace.invoiceBusinessPhone || '';
  const businessEmail = invoice.workspace.invoiceBusinessEmail || '';
  const logoUrl = invoice.workspace.invoiceLogo || '';

  const invoiceHtml = `
    <div class="invoice">
      <div class="header">
        <div class="company-section">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
          <div class="company" style="color: ${primaryColor};">${invoice.workspace.businessName}</div>
        </div>
        <div class="invoice-title">
          <h1>INVOICE</h1>
          <div class="invoice-number">${invoice.invoiceNumber}</div>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-label">From</div>
          <div class="party-name">${invoice.workspace.businessName}</div>
          ${businessAddress ? `<div class="party-detail">${businessAddress}</div>` : ''}
          ${businessPhone ? `<div class="party-detail">${businessPhone}</div>` : ''}
          ${businessEmail ? `<div class="party-detail">${businessEmail}</div>` : ''}
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

      ${invoice.items && invoice.items.length > 0 ? `
        <div class="items-table">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item: any) => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unitPrice.toLocaleString('en-US')}</td>
                  <td>₹${item.total.toLocaleString('en-US')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="amount-section" style="border-color: ${primaryColor}20;">
        <div class="amount" style="color: ${primaryColor};">₹${invoice.amount.toLocaleString('en-US')}</div>
        <div class="amount-label">Amount Due</div>
      </div>

      ${invoice.description ? `
        <div class="description">
          <div class="description-label">Description</div>
          <div class="description-text">${invoice.description}</div>
        </div>
      ` : ''}

      <div class="footer" style="border-color: ${primaryColor}30;">
        <p>${footerText}</p>
        <p style="margin-top: 8px; opacity: 0.6;">Generated by Crebo</p>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #333; background: white; }
          .invoice { max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
          .company-section { display: flex; flex-direction: column; gap: 8px; }
          .logo { max-width: 120px; max-height: 60px; object-fit: contain; }
          .company { font-size: 24px; font-weight: bold; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 28px; color: #111; margin-bottom: 8px; }
          .invoice-number { color: #666; font-size: 14px; }
          .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .party { width: 45%; }
          .party-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
          .party-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
          .party-detail { font-size: 14px; color: #666; line-height: 1.5; }
          .details { margin-bottom: 40px; }
          .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .detail-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
          .detail-value { font-size: 14px; font-weight: 500; }
          .items-table { margin-bottom: 30px; }
          .items-table table { width: 100%; border-collapse: collapse; }
          .items-table th { text-align: left; padding: 12px; background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e5e7eb; }
          .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          .items-table th:last-child, .items-table td:last-child { text-align: right; }
          .items-table th:nth-child(2), .items-table td:nth-child(2) { text-align: center; width: 60px; }
          .items-table th:nth-child(3), .items-table td:nth-child(3) { text-align: right; width: 120px; }
          .amount-section { background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 40px; border: 2px solid; }
          .amount { font-size: 36px; font-weight: bold; text-align: center; }
          .amount-label { text-align: center; color: #666; margin-top: 8px; }
          .description { margin-bottom: 40px; }
          .description-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
          .description-text { font-size: 14px; line-height: 1.6; }
          .footer { text-align: center; padding-top: 20px; border-top: 2px solid; color: #666; font-size: 13px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .status-draft { background: #f3f4f6; color: #6b7280; }
          .status-sent { background: #dbeafe; color: #2563eb; }
          .status-paid { background: #d1fae5; color: #059669; }
          .status-overdue { background: #fef3c7; color: #d97706; }
        </style>
      </head>
      <body>
        ${invoiceHtml}
      </body>
    </html>
  `;
}
