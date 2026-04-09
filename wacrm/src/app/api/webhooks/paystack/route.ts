// src/app/api/webhooks/paystack/route.ts
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
      .update(JSON.stringify(body))
      .digest('hex');

    const signature = request.headers.get('x-paystack-signature');
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Only process successful payments
    if (body.event !== 'charge.success') {
      return NextResponse.json({ status: 'ok' });
    }

    const reference = body.data.reference;
    const amount = body.data.amount / 100; // Convert from kobo to naira

    // Extract invoice ID from reference (format: INV-{invoiceId})
    const invoiceId = reference.replace('INV-', '');

    // Update invoice status to PAID
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      console.error(`Invoice not found: ${invoiceId}`);
      return NextResponse.json({ status: 'ok' });
    }

    // Verify amount matches
    if (Math.abs(invoice.amount - amount) > 0.01) {
      console.error(`Amount mismatch for invoice ${invoiceId}`);
      return NextResponse.json({ status: 'ok' });
    }

    // Mark as paid
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Create activity log
    await db.activity.create({
      data: {
        workspaceId: invoice.workspaceId,
        contactId: invoice.contactId,
        type: 'INVOICE_SENT', // Could create new type 'INVOICE_PAID'
        content: `Invoice ${invoice.invoiceNumber} marked as paid via Paystack`,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ status: 'received' });
  } catch (error) {
    console.error('Error processing Paystack webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
