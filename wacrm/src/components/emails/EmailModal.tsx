'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface EmailModalProps {
  contactId: string;
  contactEmail?: string | null;
  contactName: string;
  onClose: () => void;
  onEmailSent: () => void;
}

export default function EmailModal({
  contactId,
  contactEmail,
  contactName,
  onClose,
  onEmailSent,
}: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendNow, setSendNow] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!contactEmail) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Send Email</h2>
          <p className="text-gray-600 text-sm">This contact doesn't have an email address.</p>
          <button
            onClick={onClose}
            className="mt-4 btn-primary w-full justify-center"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          to: contactEmail,
          subject,
          body,
          sendNow,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send email');
      }

      toast.success(sendNow ? 'Email sent!' : 'Email saved as draft');
      onEmailSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Send Email</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">To</label>
            <p className="mt-1 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
              {contactName} &lt;{contactEmail}&gt;
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email message"
              rows={6}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-400 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendNow"
              checked={sendNow}
              onChange={(e) => setSendNow(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="sendNow" className="text-sm text-gray-700">
              Send immediately (uncheck to save as draft)
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="btn-primary flex-1 justify-center"
          >
            {loading ? 'Sending...' : sendNow ? 'Send' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
