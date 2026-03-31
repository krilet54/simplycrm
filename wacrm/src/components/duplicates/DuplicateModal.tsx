'use client';

import { useState, useEffect } from 'react';
import { X, Merge, Loader } from 'lucide-react';

interface DuplicateModalProps {
  onClose: () => void;
  onMergeSuccess: () => void;
}

interface Duplicate {
  contacts: Array<{ id: string; name?: string; phoneNumber: string; email?: string }>;
  similarity: number;
}

export default function DuplicateModal({ onClose, onMergeSuccess }: DuplicateModalProps) {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/duplicates/detect?threshold=0.75');
      if (!response.ok) throw new Error('Failed to fetch duplicates');

      const data = await response.json();
      setDuplicates(data.duplicates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (keepId: string, mergeId: string) => {
    setMerging(`${keepId}-${mergeId}`);
    setError('');

    try {
      const response = await fetch('/api/duplicates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, mergeId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Merge failed');
      }

      setSuccess('Contacts merged successfully!');
      setTimeout(() => {
        onMergeSuccess();
        fetchDuplicates();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge contacts');
    } finally {
      setMerging(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Find & Merge Duplicates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Scanning for duplicates...</span>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="py-8 text-center text-gray-600">
            <p>No potential duplicates found.</p>
            <p className="text-sm mt-2">Your contact data looks clean!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Found {duplicates.length} potential duplicate pairs. Select which contact to keep.
            </p>

            {duplicates.map((dup, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    Similarity: {(dup.similarity * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {dup.contacts.map((contact, i) => (
                    <div key={contact.id} className="p-3 bg-white rounded border border-gray-200">
                      <p className="font-medium">
                        {contact.name || contact.phoneNumber}
                      </p>
                      <p className="text-xs text-gray-600">{contact.phoneNumber}</p>
                      {contact.email && (
                        <p className="text-xs text-gray-600">{contact.email}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {dup.contacts.map((contact, i) => {
                    const other = dup.contacts[1 - i];
                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleMerge(contact.id, other.id)}
                        disabled={merging === `${contact.id}-${other.id}`}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                      >
                        {merging === `${contact.id}-${other.id}` && (
                          <Loader className="w-3 h-3 animate-spin" />
                        )}
                        Keep {contact.name || 'this'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4 mt-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            Close
          </button>
          {!loading && duplicates.length > 0 && (
            <button
              onClick={fetchDuplicates}
              className="flex-1 bg-blue-100 text-blue-600 px-4 py-2 rounded hover:bg-blue-200 transition"
            >
              Re-scan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
