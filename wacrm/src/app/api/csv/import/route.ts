// src/app/api/csv/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { parseCSV, validateCSVHeaders, importContactsFromCSV } from '@/lib/csv';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schema for CSV import
const importSchema = z.object({
  csvContent: z.string()
    .min(1, 'CSV content is required')
    .max(5 * 1024 * 1024, 'CSV file too large (max 5MB)'), // 5MB limit
});

// Maximum rows allowed per import
const MAX_IMPORT_ROWS = 10000;

export async function POST(req: NextRequest) {
  // Strict rate limiting for imports
  const rateLimitResponse = await checkRateLimit(req, 'strict');
  if (rateLimitResponse) return rateLimitResponse;

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
  
  // Validate input
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { csvContent } = parsed.data;

  try {
    // Parse CSV
    const parsedContacts = await parseCSV(csvContent);

    // Check row limit
    if (parsedContacts.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `Too many rows. Maximum ${MAX_IMPORT_ROWS} contacts per import.` },
        { status: 400 }
      );
    }

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
