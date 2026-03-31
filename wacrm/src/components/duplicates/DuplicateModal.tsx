'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Loader, Merge } from 'lucide-react';

interface Duplicate {
  contacts: Array<{ id: string; name?: string; phoneNumber: string; email?: string }>;
  similarity: number;
}

interface DuplicateModalProps {
  onClose: () => void;
  onMergeSuccess?: () => void;
}

export default function DuplicateModal({ onClose, onMergeSuccess }: DuplicateModalProps) {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  async function fetchDuplicates() {
    setLoading(true);
    try {
      const res = await fetch('/api/duplicates/detect');
      if (!res.ok) throw new Error('Failed to detect duplicates');

      const data = await res.json();
      setDuplicates(data.duplicates || []);
      if (data.duplicates?.length === 0) {
        toast.success('No duplicates found');
      }
    } catch (err) {
      toast.error('Failed to detect duplicates');
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge(keepId: string, mergeId: string) {
    if (!window.confirm('Merge these contacts? This cannot be undone.')) return;

    setMerging(keepId);
    try {
      const res = await fetch('/api/duplicates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, mergeId }),
      });

      if (!res.ok) throw new Error('Merge failed');

      toast.success('Contacts merged successfully');
      setDuplicates((prev) =>
        prev.filter(
          (dup) => !(dup.contacts.some((c) => c.id === keepId) && dup.contacts.some((c) => c.id === mergeId))
        )
      );

      if (onMergeSuccess) onMergeSuccess();
    } catch (err) {
      toast.error('Failed to merge contacts');
    } finally {
      setMerging(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Duplicate Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="text-forest-500 animate-spin" />
            </div>
          ) : duplicates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No duplicates found in your contacts.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">
                      Match #{idx + 1}
                    </h3>
                    <span className="text-sm font-semibold text-emerald-600">
                      {Math.round(dup.similarity * 100)}% match
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {dup.contacts.map((contact) => (
                      <div key={contact.id} className="bg-gray-50 rounded p-3">
                        <p className="font-medium text-gray-900">
                          {contact.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600">{contact.phoneNumber}</p>
                        {contact.email && (
                          <p className="text-sm text-gray-600">{contact.email}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {dup.contacts.map((contact, i) => (
                      <button
                        key={contact.id}
                        onClick={() =>
                          handleMerge(
                            contact.id,
                            dup.contacts[1 - i].id
                          )
                        }
                        disabled={merging !== null}
                        className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2"
                      >
                        <Merge size={16} />
                        Keep {contact.name ? `"${contact.name}"` : 'this'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={fetchDuplicates}
                className="btn-secondary w-full justify-center"
              >
                Re-scan for duplicates
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {duplicates.length > 0 && (
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
