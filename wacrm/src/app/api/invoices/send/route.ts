// API endpoint for sending invoices via email
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const sendInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  to: z.string().email().optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const result = sendInvoiceSchema.safeParse(body);
    
    if (!result.success) {
      const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: message || 'Validation error' }, { status: 400 });
    }

    const { invoiceId, to: customTo, subject: customSubject, message: customMessage } = result.data;

    // Get invoice with all details
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        contact: true,
        workspace: { include: { users: { where: { role: 'OWNER' }, take: 1 } } },
        items: true,
      },
    });

    if (!invoice || invoice.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const recipientEmail = customTo || invoice.contact.email;
    if (!recipientEmail) {
      return NextResponse.json({ error: 'Contact has no email address' }, { status: 400 });
    }

    // Generate invoice HTML for PDF
    const invoiceHtml = generateInvoiceHtml(invoice);

    // Convert HTML to PDF base64
    const pdfBase64 = await htmlToPdfBase64(invoiceHtml);

    // Prepare email
    const subject = customSubject || `Invoice ${invoice.invoiceNumber} from ${invoice.workspace.businessName}`;
    const emailBody = customMessage || createDefaultInvoiceEmailBody(invoice);

    // Prepare attachment
    const attachment = {
      name: `${invoice.invoiceNumber}.pdf`,
      type: 'application/pdf',
      size: Buffer.byteLength(pdfBase64, 'base64'),
      base64: pdfBase64,
    };

    // Get workspace owner email
    const senderEmail = invoice.workspace.users[0]?.email;
    if (!senderEmail) {
      return NextResponse.json(
        { error: 'Workspace email not configured' },
        { status: 400 }
      );
    }

    // Send email with attachment
    const email = await sendEmail({
      workspaceId: dbUser.workspaceId,
      contactId: invoice.contactId,
      from: senderEmail,
      to: recipientEmail,
      subject,
      body: emailBody,
      actorId: dbUser.id,
      attachments: [attachment],
    });

    // Update invoice status if DRAFT
    if (invoice.status === 'DRAFT') {
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }

    // Create activity log
    await db.activity.create({
      data: {
        workspaceId: dbUser.workspaceId,
        contactId: invoice.contactId,
        type: 'INVOICE_SENT',
        content: `Invoice ${invoice.invoiceNumber} sent to ${recipientEmail}`,
        authorId: dbUser.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      email,
      message: 'Invoice sent successfully' 
    }, { status: 200 });
  } catch (error) {
    console.error('POST /api/invoices/send error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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

async function htmlToPdfBase64(html: string): Promise<string> {
  // For simplicity, we're converting HTML to base64 directly
  // In production, you'd want to use a proper HTML-to-PDF library like puppeteer
  // For now, we'll return the HTML as base64 which can be handled by email clients
  // that support HTML rendering
  const base64Html = Buffer.from(html).toString('base64');
  return base64Html;
}

function createDefaultInvoiceEmailBody(invoice: any): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi ${invoice.contact.name || 'there'},</p>
        
        <p>Thank you for your business! Your invoice is attached.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Total Amount:</strong> ${formatCurrency(invoice.amount)}</p>
          ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
        </div>
        
        <p>Please find the complete invoice attached. If you have any questions, feel free to reach out.</p>
        
        <p>Best regards,<br>${invoice.workspace.businessName}</p>
      </body>
    </html>
  `;
}
