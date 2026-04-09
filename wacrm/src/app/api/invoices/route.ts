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
  notes: z.string().max(2000).optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).optional(),
});

const recurringCreateSchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().min(1).max(200),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  amount: z.number().positive(),
  nextInvoiceDate: z.string().datetime(),
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
    const type = searchParams.get('type'); // 'recurring' for recurring invoices

    // Handle recurring invoices
    if (type === 'recurring') {
      const isActive = searchParams.get('isActive');
      const where: any = { workspaceId: dbUser.workspaceId };
      if (contactId) where.contactId = contactId;
      if (isActive !== null) where.isActive = isActive === 'true';

      const recurringInvoices = await db.recurringInvoice.findMany({
        where,
        include: { 
          contact: { select: { id: true, name: true, phoneNumber: true, email: true } },
          items: true,
        },
        orderBy: { nextInvoiceDate: 'asc' },
      });

      return NextResponse.json({ recurringInvoices });
    }

    // Regular invoices
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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    // Handle recurring invoice creation
    if (type === 'recurring') {
      const body = await req.json();
      const { contactId, title, frequency, amount, nextInvoiceDate, items } = recurringCreateSchema.parse(body);

      // Verify contact belongs to workspace
      const contact = await db.contact.findUnique({ where: { id: contactId } });
      if (!contact || contact.workspaceId !== dbUser.workspaceId) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }

      const recurringInvoice = await db.recurringInvoice.create({
        data: {
          workspaceId: dbUser.workspaceId,
          contactId,
          title,
          frequency,
          amount,
          nextInvoiceDate: new Date(nextInvoiceDate),
          items: items ? {
            create: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          } : undefined,
        },
        include: { 
          contact: { select: { id: true, name: true, phoneNumber: true, email: true } },
          items: true,
        },
      });

      return NextResponse.json({ recurringInvoice }, { status: 201 });
    }

    // Regular invoice creation
    const body = await req.json();
    const { contactId, invoiceNumber, description, amount, dueDate, notes, items } = createSchema.parse(body);

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
        notes,
        items: items ? {
          create: items.map(item => ({
            ...item,
            total: item.quantity * item.unitPrice,
          })),
        } : undefined,
      },
      include: { contact: true, items: true },
    });

    // Update contact's lastActivityAt and create activity
    await Promise.all([
      db.contact.update({
        where: { id: contactId },
        data: { lastActivityAt: new Date() },
      }),
      db.activity.create({
        data: {
          workspaceId: dbUser.workspaceId,
          contactId,
          type: 'INVOICE_SENT',
          content: `Invoice ${invoiceNumber} created — ₹${amount.toLocaleString('en-US')}${description ? ` for ${description}` : ''}`,
          authorId: dbUser.id,
        },
      }),
    ]);

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ error: message || 'Validation error' }, { status: 400 });
    }
    console.error('POST /api/invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Handle recurring invoice deletion
    if (type === 'recurring') {
      const existing = await db.recurringInvoice.findUnique({ where: { id } });
      if (!existing || existing.workspaceId !== dbUser.workspaceId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      await db.recurringInvoice.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Use DELETE /api/invoices/[id] for regular invoices' }, { status: 400 });
  } catch (error) {
    console.error('DELETE /api/invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    // Handle recurring invoice update
    if (type === 'recurring') {
      const body = await req.json();
      const { id, isActive, title, frequency, amount, nextInvoiceDate } = body;

      if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

      const existing = await db.recurringInvoice.findUnique({ where: { id } });
      if (!existing || existing.workspaceId !== dbUser.workspaceId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      const data: any = {};
      if (isActive !== undefined) data.isActive = isActive;
      if (title !== undefined) data.title = title;
      if (frequency !== undefined) data.frequency = frequency;
      if (amount !== undefined) data.amount = amount;
      if (nextInvoiceDate !== undefined) data.nextInvoiceDate = new Date(nextInvoiceDate);

      const recurringInvoice = await db.recurringInvoice.update({
        where: { id },
        data,
        include: { 
          contact: { select: { id: true, name: true, phoneNumber: true, email: true } },
          items: true,
        },
      });

      return NextResponse.json({ recurringInvoice });
    }

    return NextResponse.json({ error: 'Use PATCH /api/invoices/[id] for regular invoices' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
