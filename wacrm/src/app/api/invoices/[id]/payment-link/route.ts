// src/app/api/invoices/[id]/payment-link/route.ts
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { workspace } = await getAuthenticatedUser();
    const { id } = params;

    // Fetch the invoice
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!invoice || invoice.workspaceId !== workspace.id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    // Generate Paystack authorization URL
    const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;
    if (!paystackPublicKey) {
      return NextResponse.json(
        { error: 'Payment provider not configured' },
        { status: 500 }
      );
    }

    // Create Paystack payment link
    const paymentData = {
      email: invoice.contact.email || 'customer@example.com',
      amount: Math.round(invoice.amount * 100), // In kobo (cents)
      reference: `INV-${invoice.id}`,
      metadata: {
        invoiceId: invoice.id,
        contactId: invoice.contact.id,
      },
    };

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify(paymentData),
    });

    const paystackData = (await paystackRes.json()) as any;

    if (!paystackData.status) {
      return NextResponse.json(
        { error: 'Failed to generate payment link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      paymentLink: paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code,
      reference: paystackData.data.reference,
    });
  } catch (error) {
    console.error('Error generating payment link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
