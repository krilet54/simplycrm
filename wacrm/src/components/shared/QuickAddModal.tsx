'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useQuickAdd, useContactPanel } from '@/lib/store';

interface QuickAddModalProps {
  stages: Array<{ id: string; name: string; color: string }>;
  agents: Array<{ id: string; name: string; avatarUrl?: string }>;
  currentUserId: string;
}

export default function QuickAddModal({ stages, agents, currentUserId }: QuickAddModalProps) {
  const isOpen = useQuickAdd((state) => state.isOpen);
  const closeQuickAdd = useQuickAdd((state) => state.closeQuickAdd);
  const openContactPanel = useContactPanel((state) => state.openContactPanel);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedStageId, setSelectedStageId] = useState(stages[0]?.id || '');
  const [selectedAgentId, setSelectedAgentId] = useState(currentUserId);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phone.trim(),
          kanbanStageId: selectedStageId,
          assignedToId: selectedAgentId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create contact');
      }

      const { contact } = await res.json();
      toast.success(`${name} added ✓`);
      
      // Reset form
      setName('');
      setPhone('');
      setSelectedStageId(stages[0]?.id || '');
      setSelectedAgentId(currentUserId);
      
      // Close modal and open contact panel
      closeQuickAdd();
      openContactPanel(contact.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={() => closeQuickAdd()}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full space-y-6 p-6 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
              Quick Add
            </h2>
            <button
              onClick={() => closeQuickAdd()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder="Contact name"
                autoFocus
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input w-full"
                placeholder="08012345678"
              />
            </div>

            {/* Stage selection */}
            {stages.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Pipeline Stage</label>
                <div className="flex flex-wrap gap-2">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setSelectedStageId(stage.id)}
                      className={`h-8 w-8 rounded-full transition-all ${
                        selectedStageId === stage.id
                          ? 'ring-2 ring-offset-2 ring-gray-900'
                          : 'hover:ring-2 hover:ring-gray-300'
                      }`}
                      style={{ background: stage.color }}
                      title={stage.name}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: <strong>{stages.find((s) => s.id === selectedStageId)?.name}</strong>
                </p>
              </div>
            )}

            {/* Agent assignment */}
            {agents.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Assign to</label>
                <div className="flex flex-wrap gap-2">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-xs ${
                        selectedAgentId === agent.id
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {agent.avatarUrl ? (
                        <img src={agent.avatarUrl} alt={agent.name} className="w-4 h-4 rounded-full" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                          {agent.name.charAt(0)}
                        </div>
                      )}
                      {agent.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => closeQuickAdd()}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Adding...
                  </span>
                ) : (
                  'Drop onto Board'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
