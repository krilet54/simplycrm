'use client';

import { useState } from 'react';
import type { ContactType, TagType, KanbanStageType } from '@/types';
import { classifyContact, needsClassification, type Classification } from '@/lib/classify-contact';

interface Props {
  contact: ContactType;
  workspace: { id: string; kanbanStages?: KanbanStageType[] };
  tags: TagType[];
  onClassify: (updatedContact: ContactType) => void;
}

export default function ConversationClassifier({ contact, workspace, tags, onClassify }: Props) {
  const [loading, setLoading] = useState(false);

  if (!needsClassification(contact)) {
    return null;
  }

  const classifications = [
    { id: 'order', icon: '🛒', label: 'Order / Lead', color: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
    { id: 'supplier', icon: '🔧', label: 'Supplier', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
    { id: 'support', icon: '🙋', label: 'Support', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
    { id: 'enquiry', icon: '❓', label: 'Just Enquiring', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
    { id: 'spam', icon: '🚫', label: 'Spam', color: 'bg-red-50 border-red-200 hover:bg-red-100' },
  ];

  async function handleClassify(classification: Classification) {
    setLoading(true);
    try {
      const updated = await classifyContact(contact.id, workspace, tags, classification);
      if (updated) {
        onClassify(updated);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-800">
          👋 New contact! How would you like to classify this conversation?
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {classifications.map(({ id, icon, label, color }) => (
          <button
            key={id}
            onClick={() => handleClassify(id as Classification)}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${color} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
