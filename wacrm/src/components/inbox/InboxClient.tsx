'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import ConversationClassifier from './ConversationClassifier';
import ActivityTab from './ActivityTab';
import InvoiceCreateModal from '@/components/invoices/InvoiceCreateModal';
import type { ContactType, ActivityRecord, NoteType, InvoiceType } from '@/types';

interface Props {
  initialContacts: ContactType[];
  agents: { id: string; name: string; avatarUrl?: string | null }[];
  currentUser: { id: string; name: string; role: string };
  workspace: { id: string; kanbanStages?: Array<{ id: string; position?: number }> };
  tags: Array<{ id: string; name: string; color: string }>;
}

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE: '📝',
  CALL: '📞',
  MEETING: '🤝',
  EMAIL: '✉️',
  WHATSAPP: '💬',
  INVOICE_SENT: '🧾',
  STAGE_CHANGE: '🔄',
  CONTACT_ADDED: '⭐',
  OTHER: '📌',
};

const AUTO_LOGGED_ACTIVITIES = ['INVOICE_SENT', 'STAGE_CHANGE', 'CONTACT_ADDED'];

export default function InboxClient({
  initialContacts,
  agents,
  currentUser,
  workspace,
  tags,
}: Props) {
  const [contacts, setContacts] = useState<ContactType[]>(initialContacts);
  const [selectedContact, setSelectedContact] = useState<ContactType | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [invoices, setInvoices] = useState<InvoiceType[]>([]);
  const [rightPanel, setRightPanel] = useState<'info' | 'notes' | 'invoices' | 'activity'>('info');
  const [search, setSearch] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<InvoiceType | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // Activity logging form
  const [activityType, setActivityType] = useState<string>('NOTE');
  const [activityContent, setActivityContent] = useState('');
  const [loggingActivity, setLoggingActivity] = useState(false);

  // Load activities, notes, invoices when contact selected
  useEffect(() => {
    if (!selectedContact) {
      setActivities([]);
      setNotes([]);
      setInvoices([]);
      return;
    }

    Promise.all([
      fetch(`/api/activities?contactId=${selectedContact.id}`).then(r => r.json()),
      fetch(`/api/notes?contactId=${selectedContact.id}`).then(r => r.json()),
      fetch(`/api/invoices?contactId=${selectedContact.id}`).then(r => r.json()),
    ]).then(([actData, noteData, invData]) => {
      setActivities(actData.activities ?? []);
      setNotes(noteData.notes ?? []);
      setInvoices(invData.invoices ?? []);
    }).catch(err => {
      console.error('Failed to load contact data:', err);
      toast.error('Failed to load contact details');
    });

    // Mark contact as read
    setContacts(prev =>
      prev.map(c => c.id === selectedContact.id ? { ...c, _count: { activities: c._count?.activities ?? 0 } } : c)
    );
  }, [selectedContact?.id]);

  const handleSendEmail = async () => {
    if (!selectedContact) {
      toast.error('No contact selected');
      return;
    }

    if (!selectedContact.email) {
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
          contactId: selectedContact.id,
          to: selectedContact.email,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
          sendNow: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to send email');
      }

      toast.success('Email sent successfully!');
      setEmailSubject('');
      setEmailBody('');
      setShowEmailModal(false);
      setEmailInvoice(null);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleLogActivity = async () => {
    if (!selectedContact || !activityContent.trim()) {
      toast.error('Please enter activity content');
      return;
    }

    setLoggingActivity(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          type: activityType,
          content: activityContent,
        }),
      });

      if (!res.ok) throw new Error('Failed to log activity');
      
      const { activity } = await res.json();
      setActivities(prev => [...prev, activity]);
      setActivityContent('');
      toast.success('Activity logged ✓');
    } catch (err) {
      toast.error('Failed to log activity');
    } finally {
      setLoggingActivity(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    (c.name?.toLowerCase() ?? c.phoneNumber).includes(search.toLowerCase()) ||
    c.phoneNumber.includes(search)
  );

  const getActivityPlaceholder = () => {
    const placeholders: Record<string, string> = {
      CALL: 'What was discussed on the call?',
      MEETING: 'What happened in the meeting?',
      EMAIL: 'What was the email about?',
      WHATSAPP: 'Summary of the WhatsApp chat...',
      NOTE: 'Add a private note...',
      OTHER: 'What happened?',
    };
    return placeholders[activityType] ?? 'Add activity...';
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Contact List ──────────────────────────────────────────────────── */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Activity</h2>
          <div className="relative">
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-400"
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-gray-500">
              <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15"/>
              </svg>
              <p className="text-sm">{search ? 'No contacts found' : 'No contacts yet'}</p>
            </div>
          ) : (
            filteredContacts.map(contact => {
              const isActive = selectedContact?.id === contact.id;
              const lastActivity = contact.activities?.[0];
              const isRecentActivity = lastActivity && new Date().getTime() - new Date(lastActivity.timestamp).getTime() < 24 * 60 * 60 * 1000;
              
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${isActive ? 'bg-blue-50 border-l-4 border-l-forest-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${isRecentActivity ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{contact.name ?? contact.phoneNumber}</p>
                      <p className="text-xs text-gray-500 truncate">{lastActivity?.content ?? 'No activity'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{lastActivity?.timestamp ? format(new Date(lastActivity.timestamp), 'MMM d, p') : ''}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────────────────────────── */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center text-white font-semibold text-sm">
                {(selectedContact.name ?? selectedContact.phoneNumber).charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                  {selectedContact.name ?? selectedContact.phoneNumber}
                </h3>
                <p className="text-xs text-gray-500">{selectedContact.phoneNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRightPanel('info')}
                className={`btn-ghost text-xs ${rightPanel === 'info' ? 'bg-gray-100' : ''}`}
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => setRightPanel('activity')}
                className={`btn-ghost text-xs ${rightPanel === 'activity' ? 'bg-gray-100' : ''}`}
              >
                Activity
              </button>
              <button
                type="button"
                onClick={() => setRightPanel('notes')}
                className={`btn-ghost text-xs ${rightPanel === 'notes' ? 'bg-gray-100' : ''}`}
              >
                Notes {notes.length > 0 && `(${notes.length})`}
              </button>
              <button
                type="button"
                onClick={() => setRightPanel('invoices')}
                className={`btn-ghost text-xs ${rightPanel === 'invoices' ? 'bg-gray-100' : ''}`}
              >
                Invoices {invoices.length > 0 && `(${invoices.length})`}
              </button>
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="btn-ghost text-xs"
                title="Send email"
              >
                Email
              </button>
            </div>
          </div>

          {/* Conversation Classifier */}
          <ConversationClassifier
            contact={selectedContact}
            workspace={workspace as any}
            tags={tags as any}
            onClassify={(updated) => {
              setSelectedContact(updated);
              setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
          />

          {/* Activity Feed (top section) */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-sm font-medium">No activity yet</p>
                <p className="text-xs">Log your first interaction below</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, idx) => {
                  const isAutoLogged = AUTO_LOGGED_ACTIVITIES.includes(activity.type);
                  
                  return (
                    <div key={activity.id} className="relative">
                      {/* Timeline line */}
                      {idx < activities.length - 1 && (
                        <div className="absolute left-5 top-8 w-0.5 h-12 bg-gray-200"/>
                      )}
                      
                      {/* Activity item */}
                      <div className="flex gap-4 pb-2 rounded-lg border border-gray-200 p-3 bg-gray-50">
                        {/* Timeline dot */}
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-3 h-3 rounded-full bg-forest-400"/>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-700">{ACTIVITY_ICONS[activity.type]} {activity.type.replace(/_/g, ' ')}</p>
                              {!isAutoLogged && activity.author && (
                                <p className="text-xs text-gray-600 mt-0.5">by {activity.author.name}</p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 whitespace-nowrap">{format(new Date(activity.timestamp), 'MMM d, p')}</p>
                          </div>
                          <p className={`text-sm mt-1 ${isAutoLogged ? 'text-gray-600' : 'text-gray-800'}`}>
                            {activity.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Log Interaction Form (bottom, fixed) */}
          <div className="border-t border-gray-200 bg-white p-4 shrink-0">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <select
                  value={activityType}
                  onChange={e => setActivityType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 bg-white"
                >
                  <option value="NOTE">📝 Note</option>
                  <option value="CALL">📞 Phone call</option>
                  <option value="MEETING">🤝 In-person meeting</option>
                  <option value="EMAIL">✉️ Email sent</option>
                  <option value="WHATSAPP">💬 WhatsApp conversation</option>
                  <option value="OTHER">📌 Other</option>
                </select>
                
                <textarea
                  value={activityContent}
                  onChange={e => setActivityContent(e.target.value)}
                  placeholder={getActivityPlaceholder()}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      handleLogActivity();
                    }
                  }}
                />
                
                <button
                  type="button"
                  onClick={handleLogActivity}
                  disabled={loggingActivity || !activityContent.trim()}
                  className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 font-medium text-sm whitespace-nowrap"
                >
                  {loggingActivity ? '...' : 'Log it'}
                </button>
              </div>
              <p className="text-xs text-gray-500">Cmd/Ctrl + Enter</p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Select a contact</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Choose someone from the list to view their activity history and log interactions.
          </p>
        </div>
      )}

      {/* ── Right Panel ────────────────────────────────────────────────────────── */}
      {selectedContact && (
        <div className="w-[280px] shrink-0 flex flex-col border-l border-gray-200 bg-white overflow-y-auto">
          {rightPanel === 'info' ? (
            <div className="p-4 space-y-5">
              {/* Contact Info */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</h4>
                <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center text-white text-2xl font-bold mb-2">
                    {(selectedContact.name ?? selectedContact.phoneNumber).charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-gray-900">{selectedContact.name ?? 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{selectedContact.phoneNumber}</p>
                  {selectedContact.email && <p className="text-xs text-gray-400 mt-0.5">{selectedContact.email}</p>}
                </div>
              </div>

              {/* Pipeline Stage */}
              {selectedContact.kanbanStage && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pipeline Stage</h4>
                  <span
                    className="tag-pill"
                    style={{
                      background: `${selectedContact.kanbanStage.color}20`,
                      color: selectedContact.kanbanStage.color,
                    }}
                  >
                    ● {selectedContact.kanbanStage.name}
                  </span>
                </div>
              )}

              {/* Tags */}
              {selectedContact.contactTags?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.contactTags.map(ct => (
                      <span
                        key={ct.tagId}
                        className="tag-pill"
                        style={{ background: `${ct.tag.color}20`, color: ct.tag.color }}
                      >
                        {ct.tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Details */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Details</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Activities</span>
                    <span className="text-gray-800 font-medium">{activities.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Notes</span>
                    <span className="text-gray-800 font-medium">{notes.length}</span>
                  </div>
                </div>
              </div>

              {/* Other info */}
              {selectedContact.interest && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Interested in</h4>
                  <p className="text-sm text-gray-700">{selectedContact.interest}</p>
                </div>
              )}

              {selectedContact.estimatedValue && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deal value</h4>
                  <p className="text-lg font-bold text-emerald-600">₹{selectedContact.estimatedValue.toLocaleString('en-US')}</p>
                </div>
              )}
            </div>
          ) : rightPanel === 'activity' ? (
            <ActivityTab contactId={selectedContact.id} />
          ) : rightPanel === 'notes' ? (
            /* Notes tab - placeholder since full implementation is in original */
            <div className="p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notes</h4>
              <p className="text-sm text-gray-600">Notes management coming soon.</p>
            </div>
          ) : (
            /* Invoices tab */
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invoices</h4>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="btn-primary w-full justify-center py-2 text-sm"
                >
                  + Create Invoice
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {invoices.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-8">No invoices yet.</p>
                )}
                {invoices.map(invoice => (
                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-xs font-semibold">{invoice.invoiceNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                        invoice.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                        invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-gray-900 mb-1">₹{invoice.amount.toLocaleString('en-US')}</div>
                    {invoice.description && <p className="text-xs text-gray-600">{invoice.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Compose Modal */}
      {showEmailModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Send Email to {selectedContact.name}</h2>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailInvoice(null);
                }}
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
                  value={selectedContact.email || ''}
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
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailInvoice(null);
                }}
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

      {/* Invoice Create Modal */}
      {showInvoiceModal && selectedContact && (
        <InvoiceCreateModal
          contact={selectedContact as any}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={(invoice) => {
            setShowInvoiceModal(false);
            setInvoices((prev) => [invoice, ...prev]);
          }}
        />
      )}
    </div>
  );
}
