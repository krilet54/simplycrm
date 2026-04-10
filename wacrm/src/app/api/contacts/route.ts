// src/app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { logActivity } from '@/lib/activity';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// ── GET /api/contacts ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(req, 'general');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const search  = searchParams.get('search') ?? '';
    const stageId = searchParams.get('stageId');
    const tagId   = searchParams.get('tagId');

    // Build base where clause
    let where: any = {
      workspaceId: dbUser.workspaceId,
      deletedAt: null, // Only show non-deleted contacts
    };

    // Role-based access control
    // OWNER and ADMIN see all contacts
    // AGENT/EMPLOYEE see contacts assigned to them OR created by them
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      where.OR = [
        { assignedToId: dbUser.id },  // Assigned to them
        { createdById: dbUser.id },   // Created by them
      ];
      console.log('🔍 AGENT FILTERING CONTACTS:', {
        agentId: dbUser.id,
        agentRole: dbUser.role,
        filterApplied: 'assigned OR created by agent',
      });
    } else {
      console.log('👑 ADMIN/OWNER VIEWING ALL CONTACTS:', {
        userId: dbUser.id,
        role: dbUser.role,
      });
    }

    // Apply search filters (using AND to preserve role filter)
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Apply stage filter
    if (stageId) {
      where.kanbanStageId = stageId;
    }

    // Apply tag filter
    if (tagId) {
      where.contactTags = { some: { tagId } };
    }

    // Optimized query: use select instead of include for better performance
    const contacts = await db.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        workspaceId: true,
        phoneNumber: true,
        name: true,
        email: true,
        avatarUrl: true,
        kanbanStageId: true,
        isBlocked: true,
        source: true,
        sourceNote: true,
        interest: true,
        estimatedValue: true,
        confidenceLevel: true,
        lastActivityAt: true,
        assignedToId: true,
        assignedById: true,
        delegationNote: true,
        assignmentStatus: true,
        assignedAt: true,
        completedAt: true,
        createdById: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        kanbanStage: {
          select: { id: true, name: true, color: true, position: true },
        },
      },
    });

    // Fetch tags separately with optimized query
    const contactIds = contacts.map(c => c.id);
    const tags = contactIds.length > 0 ? await db.contactTag.findMany({
      where: { contactId: { in: contactIds } },
      select: {
        contactId: true,
        tag: { select: { id: true, name: true, color: true } },
      },
    }) : [];

    // Build tag map
    const tagsByContactId = new Map<string, any[]>();
    tags.forEach(t => {
      if (!tagsByContactId.has(t.contactId)) {
        tagsByContactId.set(t.contactId, []);
      }
      tagsByContactId.get(t.contactId)!.push(t.tag);
    });

    // Get invoice counts
    const invoiceCounts = contactIds.length > 0 ? await db.invoice.groupBy({
      by: ['contactId'],
      where: { contactId: { in: contactIds } },
      _count: { id: true },
    }) : [];

    const invoiceCountMap = new Map(
      invoiceCounts.map(ic => [ic.contactId, ic._count.id])
    );

    // Enrich contacts with tags and counts
    const enrichedContacts = contacts.map(contact => ({
      ...contact,
      contactTags: (tagsByContactId.get(contact.id) || []).map(tag => ({ tag })),
      _count: { invoices: invoiceCountMap.get(contact.id) || 0 },
    }));

    console.log('📊 CONTACTS QUERY RESULT:', {
      userId: dbUser.id,
      userRole: dbUser.role,
      whereClause: where,
      contactsFound: enrichedContacts.length,
      contacts: enrichedContacts.map(c => ({
        id: c.id,
        name: c.name,
        assignedToId: c.assignedToId,
      })),
    });

    // Add cache headers for contacts list
    const response = NextResponse.json({ contacts: enrichedContacts });
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error: any) {
    console.error('❌ GET /api/contacts error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts', details: error?.message },
      { status: 500 }
    );
  }
}

// ── POST /api/contacts ────────────────────────────────────────────────────────
const createSchema = z.object({
  phoneNumber: z.string().min(6).max(20),
  name: z.string().optional(),
  email: z.string().email().nullable().optional(),
  kanbanStageId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  source: z.enum(['WHATSAPP', 'WALK_IN', 'PHONE_CALL', 'REFERRAL', 'SOCIAL_MEDIA', 'EVENT', 'OTHER']).optional(),
  sourceNote: z.string().max(200).nullable().optional(),
  interest: z.string().max(500).nullable().optional(),
  estimatedValue: z.number().positive().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(req, 'general');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Only OWNER and ADMIN can create contacts
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Only OWNER/ADMIN can create contacts.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { phoneNumber, name, email, kanbanStageId, tagIds = [], source, sourceNote, interest, estimatedValue, assignedToId } = parsed.data;

    // Check duplicate
    const existing = await db.contact.findUnique({
      where: {
        workspaceId_phoneNumber: { workspaceId: dbUser.workspaceId, phoneNumber },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Contact with this number already exists' }, { status: 409 });
    }

    // Verify assignedTo user belongs to workspace if provided
    if (assignedToId) {
      const assignedUser = await db.user.findFirst({
        where: { id: assignedToId, workspaceId: dbUser.workspaceId },
      });
      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned user not found in workspace' }, { status: 404 });
      }
    }

    const contact = await db.contact.create({
      data: {
        workspaceId: dbUser.workspaceId,
        phoneNumber,
        name,
        email,
        kanbanStageId,
        source,
        sourceNote,
        interest,
        estimatedValue,
        createdById: dbUser.id,  // Track who added the contact
        assignedToId: assignedToId || null,
        assignedById: assignedToId ? dbUser.id : null,
        assignedAt: assignedToId ? new Date() : null,
        assignmentStatus: assignedToId ? 'ACTIVE' : null,
        contactTags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: { kanbanStage: true, contactTags: { include: { tag: true } } },
    });

    // Log activity: Contact created
    await logActivity({
      workspaceId: dbUser.workspaceId,
      contactId: contact.id,
      type: 'CONTACT_ADDED',
      authorId: dbUser.id,
      content: `Contact created: ${contact.name || contact.phoneNumber}${source ? ` via ${source}` : ''}`,
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST /api/contacts error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to create contact', details: error?.message },
      { status: 500 }
    );
  }
}
