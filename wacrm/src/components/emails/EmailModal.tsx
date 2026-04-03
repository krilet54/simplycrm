'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Paperclip, FileText, Image, Trash2 } from 'lucide-react';

interface EmailModalProps {
  contactId: string;
  contactEmail?: string | null;
  contactName: string;
  onClose: () => void;
  onEmailSent: () => void;
  initialSubject?: string;
  initialBody?: string;
}

interface Attachment {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export default function EmailModal({
  contactId,
  contactEmail,
  contactName,
  onClose,
  onEmailSent,
  initialSubject = '',
  initialBody = '',
}: EmailModalProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sendNow, setSendNow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 10 * 1024 * 1024; // 10MB limit
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} has unsupported format`);
        continue;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments((prev) => [
          ...prev,
          { name: file.name, type: file.type, size: file.size, base64 },
        ]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          attachments: attachments.length > 0 ? attachments : undefined,
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

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Attachments</label>
            
            {/* File list */}
            {attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200"
                  >
                    {file.type.startsWith('image/') ? (
                      <Image size={16} className="text-blue-500" />
                    ) : (
                      <FileText size={16} className="text-gray-500" />
                    )}
                    <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add attachment button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-forest-400 hover:text-forest-600 transition w-full justify-center"
            >
              <Paperclip size={16} />
              Add attachment (PDF, images, documents)
            </button>
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
