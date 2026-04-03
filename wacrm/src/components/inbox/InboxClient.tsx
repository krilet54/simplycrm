// src/components/inbox/InboxClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import ConversationClassifier from './ConversationClassifier';
import ActivityTab from './ActivityTab';
import EmailModal from '@/components/emails/EmailModal';
import type { ContactType, MessageType2, NoteType, QuickReplyType, InvoiceType } from '@/types';

interface Props {
  initialContacts: ContactType[];
  quickReplies:    QuickReplyType[];
  agents:          { id: string; name: string; avatarUrl?: string | null }[];
  currentUser:     { id: string; name: string; role: string };
  workspace:       { id: string; kanbanStages?: Array<{ id: string; position?: number }> };
  tags:            Array<{ id: string; name: string }>;
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM');
}

function formatMsgTime(date: Date | string) {
  return format(new Date(date), 'HH:mm');
}

function StatusTick({ status }: { status: string }) {
  if (status === 'SENDING') return <span className="text-gray-300">🕐</span>;
  if (status === 'SENT')     return <span className="tick-sent">✓</span>;
  if (status === 'DELIVERED') return <span className="tick-delivered">✓✓</span>;
  if (status === 'READ')      return <span className="tick-read">✓✓</span>;
  if (status === 'FAILED')    return <span className="text-red-400">!</span>;
  return null;
}

export default function InboxClient({ initialContacts, quickReplies, agents, currentUser, workspace, tags }: Props) {
  const [contacts,         setContacts]         = useState<ContactType[]>(initialContacts);
  const [selectedContact,  setSelectedContact]  = useState<ContactType | null>(null);
  const [messages,         setMessages]         = useState<MessageType2[]>([]);
  const [notes,            setNotes]            = useState<NoteType[]>([]);
  const [invoices,         setInvoices]         = useState<InvoiceType[]>([]);
  const [allContactInvoices, setAllContactInvoices] = useState<{ [contactId: string]: InvoiceType[] }>({});
  const [newMessage,       setNewMessage]       = useState('');
  const [newNote,          setNewNote]          = useState('');
  const [loadingMsgs,      setLoadingMsgs]      = useState(false);
  const [sending,          setSending]          = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickFilter,      setQuickFilter]      = useState('');
  const [rightPanel,       setRightPanel]       = useState<'info' | 'notes' | 'invoices' | 'activity'>('info');
  const [search,           setSearch]           = useState('');
  const [showEmailModal,   setShowEmailModal]   = useState(false);
  const [emailInvoice,     setEmailInvoice]     = useState<InvoiceType | null>(null);
  const [dismissedZeroMsgWarnings, setDismissedZeroMsgWarnings] = useState<Set<string>>(new Set());
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupTitle, setFollowupTitle] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [followupPriority, setFollowupPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [creatingFollowup, setCreatingFollowup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load dismissed zero-message warnings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wa_warned_dismissed');
      if (stored) {
        try {
          setDismissedZeroMsgWarnings(new Set(JSON.parse(stored)));
        } catch (e) {
          console.error('Failed to parse dismissed warnings:', e);
        }
      }
    }
  }, []);

  // Helper: Check if conversation needs classification (Situation A - zero messages)
  const hasZeroMessages = messages.length === 0;
  const isZeroMsgWarningDismissed = selectedContact ? dismissedZeroMsgWarnings.has(selectedContact.id) : false;
  const shouldShowZeroMsgWarning = hasZeroMessages && !isZeroMsgWarningDismissed && selectedContact;

  // Helper: Check 24-hour window (Situation B)
  const getLastCustomerMessage = () => messages.filter((m) => m.senderType === 'CUSTOMER').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  const lastCustomerMsg = getLastCustomerMessage();
  const is24hrWindowClosed = lastCustomerMsg
    ? new Date().getTime() - new Date(lastCustomerMsg.timestamp).getTime() > 24 * 60 * 60 * 1000
    : false;
  const shouldShow24hrWarning = hasZeroMessages === false && is24hrWindowClosed && selectedContact;

  // Dismiss zero-message warning
  const dismissZeroMsgWarning = () => {
    if (selectedContact) {
      const updated = new Set(dismissedZeroMsgWarnings);
      updated.add(selectedContact.id);
      setDismissedZeroMsgWarnings(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wa_warned_dismissed', JSON.stringify(Array.from(updated)));
      }
    }
  };

  // Load messages when contact selected
  useEffect(() => {
    if (!selectedContact) return;
    setLoadingMsgs(true);
    fetch(`/api/messages?contactId=${selectedContact.id}`)
      .then((r) => r.json())
      .then(({ messages }) => setMessages(messages ?? []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingMsgs(false));

    fetch(`/api/notes?contactId=${selectedContact.id}`)
      .then((r) => r.json())
      .then(({ notes }) => setNotes(notes ?? []))
      .catch(console.error);

    fetch(`/api/invoices?contactId=${selectedContact.id}`)
      .then((r) => r.json())
      .then(({ invoices }) => setInvoices(invoices ?? []))
      .catch(console.error);

    // Mark contact as read in UI
    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedContact.id ? { ...c, _count: { messages: 0 } } : c
      )
    );
  }, [selectedContact?.id]);

  // Poll for new messages every 5s when a contact is open
  useEffect(() => {
    if (!selectedContact) return;
    const interval = setInterval(() => {
      fetch(`/api/messages?contactId=${selectedContact.id}`)
        .then((r) => r.json())
        .then(({ messages: newMsgs }) => {
          if (newMsgs?.length > messages.length) {
            setMessages(newMsgs);
          }
        })
        .catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedContact?.id, messages.length]);

  // Quick-reply trigger: watch for "/" in textarea
  useEffect(() => {
    if (newMessage.startsWith('/') && newMessage.length > 0) {
      setShowQuickReplies(true);
      setQuickFilter(newMessage.slice(1).toLowerCase());
    } else {
      setShowQuickReplies(false);
    }
  }, [newMessage]);

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q)
    );
  });

  // Load unpaid invoices for all contacts
  useEffect(() => {
    const loadUnpaidInvoices = async () => {
      try {
        const invoiceCounts: { [contactId: string]: InvoiceType[] } = {};
        for (const contact of filteredContacts) {
          const res = await fetch(`/api/invoices?contactId=${contact.id}&status=SENT&status=OVERDUE`);
          if (res.ok) {
            const { invoices } = await res.json();
            if (invoices?.length > 0) {
              invoiceCounts[contact.id] = invoices;
            }
          }
        }
        setAllContactInvoices(invoiceCounts);
      } catch (error) {
        console.error('Failed to load unpaid invoices:', error);
      }
    };

    if (filteredContacts.length > 0) {
      loadUnpaidInvoices();
    }
  }, [filteredContacts]);

  async function sendMessage() {
    if (!selectedContact || !newMessage.trim()) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const optimistic: MessageType2 = {
      id: `tmp-${Date.now()}`,
      contactId: selectedContact.id,
      agentId: currentUser.id,
      senderType: 'AGENT',
      type: 'TEXT',
      content,
      status: 'SENDING',
      isRead: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContact.id, content }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { message } = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? message : m)));

      // Update contact list order
      setContacts((prev) => {
        const c = prev.find((x) => x.id === selectedContact.id)!;
        return [
          { ...c, lastMessageAt: new Date() },
          ...prev.filter((x) => x.id !== selectedContact.id),
        ];
      });
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to send');
      setMessages((prev) => prev.map((m) =>
        m.id === optimistic.id ? { ...m, status: 'FAILED' } : m
      ));
    } finally {
      setSending(false);
    }
  }

  async function postNote() {
    if (!selectedContact || !newNote.trim()) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContact.id, content: newNote.trim() }),
      });
      if (!res.ok) throw new Error();
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewNote('');
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    }
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function createFollowup() {
    if (!selectedContact || !followupTitle.trim() || !followupDate) return;
    
    setCreatingFollowup(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          title: followupTitle.trim(),
          description: `Follow-up reminder for ${selectedContact.name || selectedContact.phoneNumber}`,
          dueDate: new Date(followupDate).toISOString(),
          priority: followupPriority,
          type: 'MANUAL',
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create follow-up');
      }
      
      toast.success('Follow-up reminder created!');
      setShowFollowupModal(false);
      setFollowupTitle('');
      setFollowupDate('');
      setFollowupPriority('MEDIUM');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreatingFollowup(false);
    }
  }

  async function moveStage(stageId: string) {
    if (!selectedContact) return;
    await fetch('/api/kanban', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: selectedContact.id, stageId }),
    });
    toast.success('Stage updated');
  }

  function applyQuickReply(qr: QuickReplyType) {
    setNewMessage(qr.content);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const filteredQR = quickReplies.filter(
    (qr) =>
      qr.shortcut.includes(quickFilter) ||
      qr.title.toLowerCase().includes(quickFilter)
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Contact list ──────────────────────────────────────────────────── */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Inbox
          </h2>
          <div className="relative">
            <svg className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-400"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Contact rows */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-gray-500 text-sm">No conversations yet.</p>
              <p className="text-gray-400 text-xs mt-1">Messages from customers will appear here.</p>
            </div>
          )}

          {filteredContacts.map((contact) => {
            const unread    = (contact._count as any)?.messages ?? 0;
            const unpaid    = allContactInvoices[contact.id]?.length ?? 0;
            const lastMsg   = contact.messages?.[0];
            const isActive  = selectedContact?.id === contact.id;

            return (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${isActive ? 'bg-forest-50 border-l-2 border-l-forest-500' : ''}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center text-white font-semibold text-sm">
                    {(contact.name ?? contact.phoneNumber).charAt(0).toUpperCase()}
                  </div>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#25D366] text-white text-[10px] flex items-center justify-center font-bold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  {unpaid > 0 && !unread && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold" title={`${unpaid} unpaid invoice${unpaid > 1 ? 's' : ''}`}>
                      {unpaid > 9 ? '9+' : unpaid}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm truncate ${unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {contact.name ?? contact.phoneNumber}
                    </span>
                    {lastMsg && (
                      <span className="text-[11px] text-gray-400 shrink-0 ml-2" suppressHydrationWarning>
                        {formatTime(lastMsg.timestamp)}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-gray-500 truncate">
                      {lastMsg.senderType === 'AGENT' ? '✓ ' : ''}{lastMsg.content}
                    </p>
                  )}
                  {contact.kanbanStage && (
                    <span
                      className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: `${contact.kanbanStage.color}20`,
                        color: contact.kanbanStage.color,
                      }}
                    >
                      {contact.kanbanStage.name}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat window ────────────────────────────────────────────────────── */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
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
                onClick={() => setRightPanel('info')}
                className={`btn-ghost text-xs ${rightPanel === 'info' ? 'bg-gray-100' : ''}`}
              >
                Info
              </button>
              <button
                onClick={() => setRightPanel('activity')}
                className={`btn-ghost text-xs ${rightPanel === 'activity' ? 'bg-gray-100' : ''}`}
              >
                Activity
              </button>
              <button
                onClick={() => setRightPanel('notes')}
                className={`btn-ghost text-xs ${rightPanel === 'notes' ? 'bg-gray-100' : ''}`}
              >
                Notes {notes.length > 0 && `(${notes.length})`}
              </button>
              <button
                onClick={() => setRightPanel('invoices')}
                className={`btn-ghost text-xs ${rightPanel === 'invoices' ? 'bg-gray-100' : ''}`}
              >
                Invoices {invoices.length > 0 && `(${invoices.length})`}
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-ghost text-xs"
                title="Send email"
              >
                Email
              </button>
              {selectedContact.contactTags?.map((ct) => (
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

          {/* Situation A: Zero-message warning */}
          {shouldShowZeroMsgWarning && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3.5 flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">⚡</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      This customer hasn't messaged you yet. Sending the first message will be charged by Meta (~$0.04).
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Free alternative: share your QR code so they message you first.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.location.href = '/dashboard/settings?tab=qr-code'}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Go to QR Code
                </button>
                <button
                  onClick={dismissZeroMsgWarning}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Conversation Classifier Banner */}
          {selectedContact && (
            <ConversationClassifier
              contact={selectedContact}
              workspace={workspace as any}
              tags={tags as any}
              onClassify={(updated) => {
                setSelectedContact(updated);
                setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
              }}
            />
          )}

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-6 py-4 space-y-2"
            style={{ background: '#EFE8DB' }}
          >
            {/* WhatsApp-style background pattern */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />

            {loadingMsgs && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-forest-400 border-t-transparent rounded-full animate-spin"/>
              </div>
            )}

            {messages.map((msg, i) => {
              const isAgent     = msg.senderType === 'AGENT';
              const showDate    = i === 0 || format(new Date(messages[i-1].timestamp), 'yyyy-MM-dd') !== format(new Date(msg.timestamp), 'yyyy-MM-dd');

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="bg-white/70 text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm" suppressHydrationWarning>
                        {isToday(new Date(msg.timestamp)) ? 'Today'
                          : isYesterday(new Date(msg.timestamp)) ? 'Yesterday'
                          : format(new Date(msg.timestamp), 'dd MMM yyyy')}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                    <div className={isAgent ? 'bubble-out' : 'bubble-in'}>
                      {msg.agent && !isAgent && (
                        <p className="text-[11px] text-forest-600 font-semibold mb-0.5">{msg.agent.name}</p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[11px] text-gray-400" suppressHydrationWarning>{formatMsgTime(msg.timestamp)}</span>
                        {isAgent && <StatusTick status={msg.status} />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies dropdown */}
          {showQuickReplies && filteredQR.length > 0 && (
            <div className="border-t border-gray-200 bg-white">
              <div className="px-4 py-2 text-xs text-gray-500 font-medium border-b border-gray-100">
                Quick Replies — press Tab or click to insert
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredQR.map((qr) => (
                  <button
                    key={qr.id}
                    onClick={() => applyQuickReply(qr)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50"
                  >
                    <span className="text-xs font-mono text-forest-600 mt-0.5 shrink-0">{qr.shortcut}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{qr.title}</p>
                      <p className="text-xs text-gray-500 truncate">{qr.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Situation B: 24-hour window warning */}
          {shouldShow24hrWarning && (
            <div className="bg-amber-50 border-t border-amber-200 px-5 py-2 text-center">
              <p className="text-xs font-medium text-amber-800">
                ⚡ 24hr window closed — this reply will be charged by Meta (~$0.04)
              </p>
            </div>
          )}

          {/* Composer */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (type / for quick replies)"
                  rows={1}
                  style={{ resize: 'none', maxHeight: '120px', overflowY: 'auto' }}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:bg-[#20ba5a] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {sending ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8" style={{ background: '#EFE8DB' }}>
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Select a conversation
          </h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Click any contact from the left to view their messages and start chatting.
          </p>
        </div>
      )}

      {/* ── Right info / notes panel ────────────────────────────────────────── */}
      {selectedContact && (
        <div className="w-[280px] shrink-0 flex flex-col border-l border-gray-200 bg-white overflow-y-auto">
          {rightPanel === 'info' ? (
            <div className="p-4 space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</h4>
                <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center text-white text-2xl font-bold mb-2">
                    {(selectedContact.name ?? selectedContact.phoneNumber).charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-gray-900">{selectedContact.name ?? 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{selectedContact.phoneNumber}</p>
                  {selectedContact.email && (
                    <p className="text-xs text-gray-400 mt-0.5">{selectedContact.email}</p>
                  )}
                </div>
              </div>

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

              {selectedContact.contactTags?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.contactTags.map((ct) => (
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

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Details</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Messages</span>
                    <span className="text-gray-800 font-medium">{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Notes</span>
                    <span className="text-gray-800 font-medium">{notes.length}</span>
                  </div>
                </div>
              </div>

              {selectedContact.interest && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Interested in</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedContact.interest}</p>
                </div>
              )}

              {selectedContact.estimatedValue && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deal value</h4>
                  <p className="text-lg font-bold text-emerald-600" suppressHydrationWarning>₦{selectedContact.estimatedValue.toLocaleString('en-US')}</p>
                </div>
              )}

              {selectedContact.sourceNote && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">How we met</h4>
                  <p className="text-sm text-gray-700">{selectedContact.sourceNote}</p>
                </div>
              )}

              {selectedContact.source && selectedContact.source !== 'WHATSAPP' && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Source</h4>
                  <p className="text-sm text-gray-700 capitalize">{selectedContact.source.replace(/_/g, ' ')}</p>
                </div>
              )}

              {/* Follow-up Reminder */}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h4>
                <button
                  onClick={() => {
                    setFollowupTitle(`Follow up with ${selectedContact.name || selectedContact.phoneNumber}`);
                    // Set default to tomorrow at 10am
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(10, 0, 0, 0);
                    setFollowupDate(tomorrow.toISOString().slice(0, 16));
                    setShowFollowupModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-700 text-sm font-medium transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Set Follow-up Reminder
                </button>
              </div>
            </div>
          ) : rightPanel === 'activity' ? (
            <ActivityTab contactId={selectedContact.id} />
          ) : rightPanel === 'notes' ? (
            /* Notes panel */
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Private Notes</h4>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a private note (not visible to customer)..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
                />
                <button
                  onClick={postNote}
                  disabled={!newNote.trim()}
                  className="btn-primary w-full justify-center mt-2 py-2 text-sm"
                >
                  Save Note
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notes.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-8">No notes yet.</p>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-amber-700">{note.author.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400" suppressHydrationWarning>{format(new Date(note.createdAt), 'dd MMM, HH:mm')}</span>
                        {note.authorId === currentUser.id && (
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-gray-300 hover:text-red-400 ml-1 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Invoices panel */
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invoices</h4>
                <button
                  onClick={() => {
                    const invoiceID = `INV-${Date.now()}`;
                    const invoiceNumber = invoiceID.slice(0, 10);
                    const amount = parseFloat(prompt('Invoice amount (₦):', '') || '0');
                    if (amount > 0) {
                      fetch('/api/invoices', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contactId: selectedContact!.id,
                          invoiceNumber,
                          amount,
                        }),
                      })
                        .then((r) => r.json())
                        .then(() => {
                          setInvoices((prev) => [...prev, ...[]]);
                          fetch(`/api/invoices?contactId=${selectedContact!.id}`)
                            .then((r) => r.json())
                            .then(({ invoices }) => setInvoices(invoices ?? []))
                            .catch(console.error);
                          toast.success('Invoice created');
                        })
                        .catch(() => toast.error('Failed to create invoice'));
                    }
                  }}
                  className="btn-primary w-full justify-center py-2 text-sm"
                >
                  + Create Invoice
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {invoices.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-8">No invoices yet.</p>
                )}
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-900">{invoice.invoiceNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                        invoice.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                        invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-gray-900 mb-1" suppressHydrationWarning>₦{invoice.amount.toLocaleString('en-US')}</div>
                    {invoice.description && (
                      <p className="text-xs text-gray-600 mb-1.5">{invoice.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
                      <button
                        onClick={() => {
                          if (invoice.status === 'DRAFT') {
                            toast.loading('Sending invoice...');
                            fetch('/api/invoices/send', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ invoiceId: invoice.id }),
                            }).then((res) => {
                              if (res.ok) {
                                setInvoices((prev) =>
                                  prev.map((inv) => inv.id === invoice.id ? { ...inv, status: 'SENT', sentAt: new Date() } : inv)
                                );
                                toast.dismiss();
                                toast.success('Invoice sent via WhatsApp');
                              } else {
                                throw new Error();
                              }
                            }).catch(() => {
                              toast.dismiss();
                              toast.error('Failed to send invoice');
                            });
                          }
                        }}
                        disabled={invoice.status !== 'DRAFT'}
                        className="text-[11px] text-forest-600 hover:underline disabled:text-gray-300 disabled:cursor-not-allowed font-medium"
                      >
                        Send WhatsApp
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        onClick={() => {
                          setEmailInvoice(invoice);
                          setShowEmailModal(true);
                        }}
                        disabled={!selectedContact?.email}
                        className="text-[11px] text-purple-600 hover:underline disabled:text-gray-300 disabled:cursor-not-allowed font-medium"
                        title={selectedContact?.email ? 'Send invoice via email' : 'Contact has no email'}
                      >
                        Send Email
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        onClick={() => {
                          // Open PDF in new window for print/save
                          window.open(`/api/invoices/${invoice.id}?format=pdf`, '_blank');
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-medium"
                      >
                        Download PDF
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        onClick={() => {
                          if (invoice.status === 'SENT' || invoice.status === 'OVERDUE') {
                            fetch(`/api/invoices/${invoice.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'PAID', paidAt: new Date() }),
                            }).then(() => {
                              setInvoices((prev) =>
                                prev.map((inv) => inv.id === invoice.id ? { ...inv, status: 'PAID', paidAt: new Date() } : inv)
                              );
                              toast.success('Marked as paid');
                            }).catch(() => toast.error('Failed to update invoice'));
                          }
                        }}
                        disabled={invoice.status === 'PAID' || invoice.status === 'DRAFT'}
                        className="text-[11px] text-emerald-600 hover:underline disabled:text-gray-300 disabled:cursor-not-allowed font-medium"
                      >
                        Paid
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this invoice?')) {
                            fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
                              .then(() => {
                                setInvoices((prev) => prev.filter((inv) => inv.id !== invoice.id));
                                toast.success('Invoice deleted');
                              })
                              .catch(() => toast.error('Failed to delete invoice'));
                          }
                        }}
                        className="text-[11px] text-red-500 hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && selectedContact && (
        <EmailModal
          contactId={selectedContact.id}
          contactEmail={selectedContact.email || ''}
          contactName={selectedContact.name || selectedContact.phoneNumber}
          onClose={() => {
            setShowEmailModal(false);
            setEmailInvoice(null);
          }}
          onEmailSent={() => {
            toast.success('Email sent!');
            setShowEmailModal(false);
            setEmailInvoice(null);
          }}
          initialSubject={emailInvoice ? `Invoice ${emailInvoice.invoiceNumber}` : ''}
          initialBody={emailInvoice ? `Dear ${selectedContact.name || 'Customer'},\n\nPlease find attached invoice ${emailInvoice.invoiceNumber} for ₦${emailInvoice.amount.toLocaleString('en-US')}.\n\n${emailInvoice.description || ''}\n\nThank you for your business.\n\nBest regards` : ''}
        />
      )}

      {/* Follow-up Reminder Modal */}
      {showFollowupModal && selectedContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Set Follow-up Reminder</h2>
              <button
                onClick={() => setShowFollowupModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Title
                </label>
                <input
                  type="text"
                  value={followupTitle}
                  onChange={(e) => setFollowupTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                  placeholder="e.g., Call to discuss proposal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remind me on
                </label>
                <input
                  type="datetime-local"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <div className="flex gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFollowupPriority(p)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        followupPriority === p
                          ? p === 'HIGH'
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : p === 'MEDIUM'
                            ? 'bg-amber-100 border-amber-300 text-amber-700'
                            : 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFollowupModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createFollowup}
                  disabled={creatingFollowup || !followupTitle.trim() || !followupDate}
                  className="flex-1 px-4 py-2.5 bg-forest-600 text-white rounded-lg hover:bg-forest-700 font-medium disabled:opacity-50"
                >
                  {creatingFollowup ? 'Creating...' : 'Create Reminder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
