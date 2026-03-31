import toast from 'react-hot-toast';
import type { ContactType } from '@/types';

export type Classification = 'order' | 'supplier' | 'support' | 'enquiry' | 'spam';

/**
 * Classify a contact and apply the appropriate tags/stage/status
 */
export async function classifyContact(
  contactId: string,
  workspace: { id: string; kanbanStages?: Array<{ id: string; position?: number }> },
  tags: Array<{ id: string; name: string }>,
  classification: Classification
): Promise<ContactType | null> {
  try {
    let kanbanStageId: string | null = null;
    let tagIds: string[] = [];
    let isBlocked = false;

    switch (classification) {
      case 'order':
        // Assign to first Kanban stage (lowest position)
        if (workspace.kanbanStages && workspace.kanbanStages.length > 0) {
          const firstStage = workspace.kanbanStages.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
          kanbanStageId = firstStage.id;
        }
        break;

      case 'supplier':
        // Apply "Supplier" tag
        const supplierTag = tags.find((t) => t.name === 'Supplier');
        if (supplierTag) {
          tagIds = [supplierTag.id];
        }
        break;

      case 'support':
        // Apply "Support" tag
        const supportTag = tags.find((t) => t.name === 'Support');
        if (supportTag) {
          tagIds = [supportTag.id];
        }
        break;

      case 'enquiry':
        // No tag, no stage, just update
        break;

      case 'spam':
        // Block contact
        isBlocked = true;
        break;
    }

    // Call the API to update the contact
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kanbanStageId: kanbanStageId || null,
        tagIds,
        isBlocked,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to classify contact');
    }

    const { contact } = await res.json();

    // Show success toast
    const messages: Record<Classification, string> = {
      order: '✅ Marked as Order/Lead',
      supplier: '✅ Marked as Supplier',
      support: '✅ Marked as Support',
      enquiry: '✅ Marked as Just Enquiring',
      spam: '✅ Marked as Spam - contact blocked',
    };
    toast.success(messages[classification]);

    return contact;
  } catch (err) {
    const message = (err as Error).message || 'Classification failed';
    toast.error(message);
    console.error('Classification error:', err);
    return null;
  }
}

/**
 * Check if a contact needs classification
 */
export function needsClassification(contact: ContactType): boolean {
  return (
    !contact.kanbanStageId &&
    contact.contactTags?.length === 0 &&
    !contact.isBlocked
  );
}
