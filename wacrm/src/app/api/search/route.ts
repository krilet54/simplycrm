// src/app/api/search/route.ts
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request, 'general');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { workspace } = await getAuthenticatedUser();
    const query = request.nextUrl.searchParams.get('q')?.trim();

    // Sanitize query - remove special characters that could cause issues
    const sanitizedQuery = query?.replace(/[%_\\]/g, '');

    if (!sanitizedQuery || sanitizedQuery.length < 2 || sanitizedQuery.length > 100) {
      return NextResponse.json({ results: [] });
    }

    // Search in parallel
    const [contacts, invoices, tasks] = await Promise.all([
      // Search contacts
      db.contact.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { name: { contains: sanitizedQuery, mode: 'insensitive' } },
            { phoneNumber: { contains: sanitizedQuery, mode: 'insensitive' } },
            { email: { contains: sanitizedQuery, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      // Search invoices
      db.invoice.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { invoiceNumber: { contains: sanitizedQuery, mode: 'insensitive' } },
            { description: { contains: sanitizedQuery, mode: 'insensitive' } },
          ],
        },
        include: { contact: true },
        take: 5,
      }),
      // Search tasks
      db.task.findMany({
        where: {
          workspaceId: workspace.id,
          title: { contains: sanitizedQuery, mode: 'insensitive' },
        },
        include: { contact: true },
        take: 5,
      }),
    ]);

    const results = [
      ...contacts.map(c => ({
        type: 'contact',
        id: c.id,
        title: c.name || c.phoneNumber,
        subtitle: c.phoneNumber,
        link: `/dashboard/contacts`,
      })),
      ...invoices.map(i => ({
        type: 'invoice',
        id: i.id,
        title: i.invoiceNumber,
        subtitle: i.contact?.name || 'Unknown contact',
        link: `/dashboard/money`,
      })),
      ...tasks.map(t => ({
        type: 'task',
        id: t.id,
        title: t.title,
        subtitle: `${t.status} • ${t.contact?.name || 'No contact'}`,
        link: `/dashboard/tasks`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ results: [] });
  }
}
