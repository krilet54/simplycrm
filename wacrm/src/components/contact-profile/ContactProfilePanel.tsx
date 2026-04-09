'use client';

import { useState, useRef } from 'react';
import { X, Mail, FileText, DollarSign, MessageSquare, User, Paperclip, Trash2, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ContactType } from '@/types';
import InfoTab from './InfoTab';
import ActivityTab from './ActivityTab';
import NotesTab from './NotesTab';
import InvoicesTab from './InvoicesTab';
import EmailsTab from './EmailsTab';
import InvoiceModal from '../invoices/InvoiceModal';

type TabId = 'info' | 'activity' | 'notes' | 'invoices' | 'email';

interface ContactProfilePanelProps {
  contact: ContactType;
  activities: any[];
  notes: any[];
  invoices: any[];
  emails: any[];
  allContacts?: ContactType[];
  currentUser: any;
  onClose: () => void;
  onNoteAdded?: () => void;
  onContactUpdate?: (updated: ContactType) => void;
}

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'info', label: 'Info', icon: <User className="w-4 h-4" /> },
  { id: 'activity', label: 'Activity', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
  { id: 'invoices', label: 'Invoices', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
];

export default function ContactProfilePanel({
  contact,
  activities,
  notes,
  invoices,
  emails,
  allContacts,
  currentUser,
  onClose,
  onNoteAdded,
  onContactUpdate,
}: ContactProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSendEmail = async () => {
    if (!contact.email) {
      toast.error('Contact does not have an email address');
      return;
    }

    if (!emailSubject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!emailBody.trim()) {
      toast.error('Message is required');
      return;
    }

    setIsEmailSending(true);
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          to: contact.email,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
          sendNow: true,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to send email');
      }

      toast.success('Email sent successfully!');
      setEmailSubject('');
      setEmailBody('');
      setAttachments([]);
      setShowEmailCompose(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-[45%] bg-white shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{contact.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{contact.phoneNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'info' && <InfoTab contact={contact} onContactUpdate={onContactUpdate} currentUser={currentUser} />}
          {activeTab === 'activity' && <ActivityTab activities={activities} />}
          {activeTab === 'notes' && (
            <NotesTab
              notes={notes}
              contactId={contact.id}
              currentUser={currentUser}
              onNoteAdded={onNoteAdded}
            />
          )}
          {activeTab === 'invoices' && <InvoicesTab invoices={invoices} contactId={contact.id} onCreateClick={() => setShowInvoiceModal(true)} onSendClick={(invoiceId) => {
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
              setEmailSubject(`Invoice ${invoice.invoiceNumber}`);
              setEmailBody(`Dear ${contact.name},\n\nPlease find attached the invoice for the services rendered.\n\nInvoice Number: ${invoice.invoiceNumber}\nTotal Amount: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(invoice.amount || 0)}\n\nThank you for your business.`);
              setShowEmailCompose(true);
            }
          }} />}
          {activeTab === 'email' && <EmailsTab emails={emails} onSendClick={() => setShowEmailCompose(true)} />}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 space-y-2">
          <button 
            onClick={() => setShowInvoiceModal(true)}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            + Create Invoice
          </button>
          <button 
            onClick={() => setShowEmailCompose(true)}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Send Email
          </button>
          <button 
            onClick={() => {
              const whatsappNumber = contact.phoneNumber.replace(/\D/g, '');
              window.open(`https://wa.me/${whatsappNumber}`, '_blank');
            }}
            className="w-full px-4 py-2 bg-[#25D366] hover:bg-[#1fa857] text-white font-medium rounded-lg transition-colors"
          >
            WhatsApp
          </button>
        </div>
      </div>

      {/* Modals */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onSuccess={() => {
          setShowInvoiceModal(false);
          // Invoices will auto-refresh via the parent's 30-second interval
        }}
        preselectedContactId={contact.id}
        contacts={
          allContacts?.map(c => ({ id: c.id, name: c.name || '', phoneNumber: c.phoneNumber })) || 
          [{ id: contact.id, name: contact.name || '', phoneNumber: contact.phoneNumber }]
        }
      />

      {/* Email Compose Modal */}
      {showEmailCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Send Email to {contact.name}</h2>
              <button
                onClick={() => setShowEmailCompose(false)}
                disabled={isEmailSending}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">To</label>
                <input
                  type="email"
                  value={contact.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                  disabled={isEmailSending}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Type your email message..."
                  rows={6}
                  disabled={isEmailSending}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">Attachments</label>
                
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
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition w-full justify-center"
                >
                  <Paperclip size={16} />
                  Add attachment
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowEmailCompose(false)}
                disabled={isEmailSending}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isEmailSending}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEmailSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
