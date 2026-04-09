// src/components/shared/QuickAddContactModal.tsx
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface KanbanStage {
  id: string;
  name: string;
  position: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface QuickAddContactModalProps {
  kanbanStages: KanbanStage[];
  tags: Tag[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickAddContactModal({
  kanbanStages,
  tags,
  onClose,
  onSuccess,
}: QuickAddContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    interest: '',
    kanbanStageId: kanbanStages[0]?.id || '',
    sourceNote: '',
    estimatedValue: '',
    assignedToId: '',
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Fetch team members on mount
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const res = await fetch('/api/contacts/team-members', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.members || []);
        }
      } catch (err) {
        console.error('Failed to fetch team members:', err);
      }
    };

    fetchTeamMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error('Phone is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          email: formData.email.trim() || null,
          interest: formData.interest.trim() || null,
          kanbanStageId: formData.kanbanStageId || null,
          sourceNote: formData.sourceNote.trim() || null,
          estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
          assignedToId: formData.assignedToId || null,
          tagIds: selectedTags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create contact');
      }

      toast.success('Contact added successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Quick Add Contact</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              placeholder="Contact name"
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              placeholder="+234 800 000 0000"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              placeholder="email@example.com"
            />
          </div>

          {/* Interest */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interest / Service</label>
            <input
              type="text"
              value={formData.interest}
              onChange={e => setFormData({ ...formData, interest: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              placeholder="What are they interested in?"
            />
          </div>

          {/* Pipeline Stage */}
          {kanbanStages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline Stage</label>
              <select
                value={formData.kanbanStageId}
                onChange={e => setFormData({ ...formData, kanbanStageId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              >
                {kanbanStages
                  .sort((a, b) => a.position - b.position)
                  .map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Assign To Team Member */}
          {teamMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To Team Member</label>
              <select
                value={formData.assignedToId}
                onChange={e => setFormData({ ...formData, assignedToId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              >
                <option value="">Not assigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Estimated Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value (₹)</label>
            <input
              type="number"
              value={formData.estimatedValue}
              onChange={e => setFormData({ ...formData, estimatedValue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              placeholder="0"
              min="0"
            />
          </div>

          {/* Source Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source / How did they find you?</label>
            <input
              type="text"
              value={formData.sourceNote}
              onChange={e => setFormData({ ...formData, sourceNote: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              placeholder="Instagram, Referral, Walk-in..."
            />
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      selectedTags.includes(tag.id)
                        ? 'ring-2 ring-offset-1 ring-gray-400'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: tag.color + '20',
                      color: tag.color,
                      borderColor: tag.color,
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-forest-600 text-white rounded-lg hover:bg-forest-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
