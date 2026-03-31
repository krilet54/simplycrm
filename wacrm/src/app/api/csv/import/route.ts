// src/app/api/csv/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { parseCSV, validateCSVHeaders, importContactsFromCSV } from '@/lib/csv';

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only OWNER and ADMIN can import
  if (dbUser.role !== 'OWNER' && dbUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const body = await req.json();
  const csvContent = body.csvContent as string;

  if (!csvContent) {
    return NextResponse.json({ error: 'CSV content required' }, { status: 400 });
  }

  try {
    // Parse CSV
    const parsedContacts = await parseCSV(csvContent);

    // Validate headers
    const validation = validateCSVHeaders(parsedContacts);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 }
      );
    }

    // Import contacts
    const results = await importContactsFromCSV(
      dbUser.workspaceId,
      dbUser.id,
      parsedContacts
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('CSV import failed:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}
