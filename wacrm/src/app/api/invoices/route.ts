import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

const createSchema = z.object({
  contactId: z.string().uuid(),
  invoiceNumber: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  amount: z.number().positive(),
  dueDate: z.string().datetime().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).optional(),
});

const updateSchema = createSchema.partial();

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');
    const status = searchParams.get('status');

    const where: any = { workspaceId: dbUser.workspaceId };
    if (contactId) where.contactId = contactId;
    if (status) where.status = status;

    const invoices = await db.invoice.findMany({
      where,
      include: { contact: true, items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('GET /api/invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { contactId, invoiceNumber, description, amount, dueDate, items } = createSchema.parse(body);

    // Verify contact belongs to workspace
    const contact = await db.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check invoice number is unique
    const existing = await db.invoice.findFirst({
      where: { workspaceId: dbUser.workspaceId, invoiceNumber },
    });
    if (existing) {
      return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 });
    }

    const invoice = await db.invoice.create({
      data: {
        workspaceId: dbUser.workspaceId,
        contactId,
        invoiceNumber,
        description,
        amount,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: items ? {
          create: items.map(item => ({
            ...item,
            total: item.quantity * item.unitPrice,
          })),
        } : undefined,
      },
      include: { contact: true, items: true },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('POST /api/invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
