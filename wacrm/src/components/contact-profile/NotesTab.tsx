'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface NotesTabProps {
  notes: any[];
  contactId: string;
  currentUser: any;
  onNoteAdded?: () => void;
}

export default function NotesTab({ notes, contactId, currentUser, onNoteAdded }: NotesTabProps) {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Note cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          content: newNote,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Note added');
        setNewNote('');
        
        // Trigger the callback to refresh notes - when used in EnhancedContactsClient
        onNoteAdded?.();
      } else {
        toast.error('Failed to add note');
      }
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Add Note Form */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Add a note</label>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Type a private note..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAddNote}
          disabled={isSubmitting || !newNote.trim()}
          className="mt-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-600">No notes yet</p>
        </div>
      ) : (
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Notes</h3>
          <div className="space-y-4">
            {notes.map(note => (
              <div key={note.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-900">{note.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-600">{note.author?.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
