// src/lib/duplicates.ts
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy name matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}

/**
 * Similarity score between 0-1
 */
function stringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

/**
 * Normalize phone number for exact matching
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-11);
}

/**
 * Find potential duplicate contacts
 */
export async function findDuplicates(workspaceId: string, threshold = 0.8) {
  const contacts = await db.contact.findMany({
    where: { workspaceId, deletedAt: null },
    select: {
      id: true,
      phoneNumber: true,
      name: true,
      email: true,
    },
  });

  const duplicates: Array<{ contacts: typeof contacts; similarity: number }> = [];
  const checked = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    const contact1 = contacts[i];
    const key1 = `${i}`;

    for (let j = i + 1; j < contacts.length; j++) {
      const contact2 = contacts[j];
      const key2 = `${i}-${j}`;

      if (checked.has(key2)) continue;
      checked.add(key2);

      let score = 0;
      let matchCount = 0;

      // Phone number exact match
      if (normalizePhone(contact1.phoneNumber) === normalizePhone(contact2.phoneNumber)) {
        score += 1;
        matchCount++;
      }

      // Name fuzzy match
      if (contact1.name && contact2.name) {
        const nameSim = stringSimilarity(contact1.name, contact2.name);
        if (nameSim > 0.7) {
          score += nameSim;
          matchCount++;
        }
      }

      // Email exact match
      if (contact1.email && contact2.email && contact1.email === contact2.email) {
        score += 1;
        matchCount++;
      }

      // Calculate average similarity if we have matches
      if (matchCount > 0) {
        const avgSimilarity = score / matchCount;
        if (avgSimilarity >= threshold) {
          duplicates.push({
            contacts: [contact1, contact2],
            similarity: avgSimilarity,
          });
        }
      }
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Merge two contacts
 */
export async function mergeContacts(
  workspaceId: string,
  keepId: string,
  mergeId: string,
  userId: string
) {
  const keepContact = await db.contact.findFirst({
    where: { id: keepId, workspaceId },
    include: { messages: true, invoices: true },
  });

  const mergeContact = await db.contact.findFirst({
    where: { id: mergeId, workspaceId },
    include: { messages: true, invoices: true },
  });

  if (!keepContact || !mergeContact) {
    throw new Error('Contact not found');
  }

  try {
    // Update all messages from merged contact to kept contact
    await db.message.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    });

    // Update all invoices from merged contact to kept contact
    await db.invoice.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    });

    // Update all tasks from merged contact to kept contact
    await db.task.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    });

    // Update all activities to point to kept contact
    await db.activity.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    });

    // Update all emails to point to kept contact
    await db.email.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    });

    // Merge tags
    const mergedTags = await db.contactTag.findMany({
      where: { contactId: mergeId },
    });

    for (const tag of mergedTags) {
      await db.contactTag.upsert({
        where: {
          contactId_tagId: { contactId: keepId, tagId: tag.tagId },
        },
        create: { contactId: keepId, tagId: tag.tagId },
        update: {},
      });
    }

    // Soft-delete merged contact
    await db.contact.update({
      where: { id: mergeId },
      data: { deletedAt: new Date() },
    });

    // Log activity
    await logActivity({
      workspaceId,
      contactId: keepId,
      activityType: 'CONTACT_UPDATED',
      actorId: userId,
      title: `Merged duplicate contact`,
      description: `Merged: ${mergeContact.name || mergeContact.phoneNumber}`,
      metadata: {
        mergedFromId: mergeId,
        action: 'duplicate_merge',
      },
    });

    return keepContact;
  } catch (error) {
    console.error('Merge failed:', error);
    throw error;
  }
}
