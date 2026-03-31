// src/lib/csv.ts
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import Papa from 'papaparse';

export interface CSVContact {
  phoneNumber: string;
  name?: string;
  email?: string;
  source?: string;
  interest?: string;
  estimatedValue?: string;
}

/**
 * Parse CSV file content into contact records
 */
export function parseCSV(content: string): Promise<CSVContact[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
      complete: (results) => {
        resolve(results.data as CSVContact[]);
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}

/**
 * Validate and import contacts from CSV
 */
export async function importContactsFromCSV(
  workspaceId: string,
  userId: string,
  contacts: CSVContact[]
) {
  const results = {
    imported: 0,
    duplicates: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    // Validate phone number
    if (!contact.phoneNumber || contact.phoneNumber.trim().length < 6) {
      results.errors.push(`Row ${i + 2}: Missing or invalid phone number`);
      continue;
    }

    // Check for duplicates
    const existing = await db.contact.findUnique({
      where: {
        workspaceId_phoneNumber: {
          workspaceId,
          phoneNumber: contact.phoneNumber.trim(),
        },
      },
    });

    if (existing) {
      results.duplicates++;
      continue;
    }

    try {
      const created = await db.contact.create({
        data: {
          workspaceId,
          phoneNumber: contact.phoneNumber.trim(),
          name: contact.name?.trim() || null,
          email: contact.email?.trim() || null,
          interest: contact.interest?.trim() || null,
          estimatedValue: contact.estimatedValue
            ? parseFloat(contact.estimatedValue)
            : null,
          source: contact.source?.toUpperCase() as any || 'OTHER',
        },
        include: { contactTags: { include: { tag: true } } },
      });

      // Log activity
      await logActivity({
        workspaceId,
        contactId: created.id,
        activityType: 'CONTACT_CREATED',
        actorId: userId,
        title: `Contact imported: ${created.name || created.phoneNumber}`,
        description: 'Imported from CSV',
        metadata: { source: 'csv_import' },
      });

      results.imported++;
    } catch (error) {
      results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

/**
 * Export workspace contacts as CSV
 */
export async function exportContactsAsCSV(workspaceId: string) {
  const contacts = await db.contact.findMany({
    where: { workspaceId },
    include: { contactTags: { include: { tag: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const csvData = contacts.map((c) => ({
    phoneNumber: c.phoneNumber,
    name: c.name || '',
    email: c.email || '',
    source: c.source || 'OTHER',
    interest: c.interest || '',
    estimatedValue: c.estimatedValue || '',
    tags: c.contactTags.map((ct) => ct.tag.name).join(';'),
    createdAt: new Date(c.createdAt).toISOString(),
  }));

  return Papa.unparse(csvData);
}

/**
 * Validate CSV headers
 */
export function validateCSVHeaders(data: CSVContact[]): {
  valid: boolean;
  errors: string[];
} {
  if (!data || data.length === 0) {
    return { valid: false, errors: ['CSV file is empty'] };
  }

  const firstRow = data[0];
  if (!firstRow.phoneNumber) {
    return {
      valid: false,
      errors: ['Missing required column: phoneNumber'],
    };
  }

  return { valid: true, errors: [] };
}
