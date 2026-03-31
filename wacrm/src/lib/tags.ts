import { db } from './db';

// Color constants
export const TAG_COLORS = {
  walkin: '#f97316',   // Orange
  supplier: '#6366f1', // Indigo
  support: '#3b82f6',  // Blue
};

/**
 * Ensures a tag exists in the workspace, creating it if necessary
 */
export async function ensureTagExists(
  workspaceId: string,
  name: string,
  color: string = TAG_COLORS.supplier
) {
  // Check if tag exists
  let tag = await db.tag.findFirst({
    where: { workspaceId, name },
  });

  // If not, create it
  if (!tag) {
    tag = await db.tag.create({
      data: { workspaceId, name, color },
    });
  }

  return tag;
}

/**
 * Ensures the "Walk-in" tag exists
 */
export async function ensureWalkInTag(workspaceId: string) {
  return ensureTagExists(workspaceId, 'Walk-in', TAG_COLORS.walkin);
}

/**
 * Ensures the "Supplier" tag exists
 */
export async function ensureSupplierTag(workspaceId: string) {
  return ensureTagExists(workspaceId, 'Supplier', TAG_COLORS.supplier);
}

/**
 * Ensures the "Support" tag exists
 */
export async function ensureSupportTag(workspaceId: string) {
  return ensureTagExists(workspaceId, 'Support', TAG_COLORS.support);
}
