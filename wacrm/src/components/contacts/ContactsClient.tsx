// src/components/contacts/ContactsClient.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import CSVModal from '@/components/csv/CSVModal';
import DuplicateModal from '@/components/duplicates/DuplicateModal';
import type { ContactType, TagType, KanbanStageType, ContactSource } from '@/types';

interface Props {
  contacts: ContactType[];
  tags:     TagType[];
  stages:   KanbanStageType[];
}

const SOURCE_OPTIONS: { value: ContactSource; label: string; emoji: string }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp', emoji: '💬' },
  { value: 'WALK_IN', label: 'Walk-in customer', emoji: '🚶' },
  { value: 'PHONE_CALL', label: 'Phone call', emoji: '📞' },
  { value: 'REFERRAL', label: 'Referral', emoji: '👥' },
  { value: 'SOCIAL_MEDIA', label: 'Social media', emoji: '📱' },
  { value: 'EVENT', label: 'Event / Exhibition', emoji: '🎪' },
  { value: 'OTHER', label: 'Other', emoji: '❓' },
];

export default function ContactsClient({ contacts: init, tags, stages }: Props) {
  const [contacts,    setContacts]    = useState<ContactType[]>(init);
  const [search,      setSearch]      = useState('');
  const [filterTag,   setFilterTag]   = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [showCSVModal,  setShowCSVModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [editTarget,  setEditTarget]  = useState<ContactType | null>(null);

  // Form state
  const [fName,           setFName]           = useState('');
  const [fPhone,          setFPhone]          = useState('');
  const [fEmail,          setFEmail]          = useState('');
  const [fSource,         setFSource]         = useState<ContactSource>('WHATSAPP');
  const [fSourceNote,     setFSourceNote]     = useState('');
  const [fInterest,       setFInterest]       = useState('');
  const [fEstimatedValue, setFEstimatedValue] = useState('');
  const [fStage,          setFStage]          = useState('');
  const [fTags,           setFTags]           = useState<string[]>([]);
  const [fWalkIn,         setFWalkIn]         = useState(false);
  const [fLoading,        setFLoading]        = useState(false);

  function openCreate() {
    setEditTarget(null);
    setFName('');
    setFPhone('');
    setFEmail('');
    setFSource('WHATSAPP');
    setFSourceNote('');
    setFInterest('');
    setFEstimatedValue('');
    setFStage('');
    setFTags([]);
    setFWalkIn(false);
    setShowModal(true);
  }

  function openEdit(c: ContactType) {
    setEditTarget(c);
    setFName(c.name ?? '');
    setFPhone(c.phoneNumber);
    setFEmail(c.email ?? '');
    setFSource(c.source ?? 'WHATSAPP');
    setFSourceNote(c.sourceNote ?? '');
    setFInterest(c.interest ?? '');
    setFEstimatedValue(c.estimatedValue ? String(c.estimatedValue) : '');
    setFStage(c.kanbanStageId ?? '');
    setFTags(c.contactTags?.map((ct) => ct.tagId) ?? []);
    setFWalkIn(c.contactTags?.some((ct) => ct.tag?.name === 'Walk-in') ?? false);
    setShowModal(true);
  }

  async function saveContact() {
    if (!fPhone.trim()) { toast.error('Phone number is required'); return; }
    setFLoading(true);
    try {
      // Handle Walk-in
      let tagIdsToSave = [...fTags];
      let stageToSave = fSource === 'WALK_IN' ? '' : fStage;
      let sourceToSave: ContactSource = fSource;

      if (fSource === 'WALK_IN' || fWalkIn) {
        const walkInTag = tags.find((t) => t.name === 'Walk-in');
        if (walkInTag && !tagIdsToSave.includes(walkInTag.id)) {
          tagIdsToSave = [...tagIdsToSave, walkInTag.id];
        }
        sourceToSave = 'WALK_IN';
        stageToSave = '';
      } else {
        // Remove Walk-in tag if not walk-in
        const walkInTag = tags.find((t) => t.name === 'Walk-in');
        if (walkInTag) {
          tagIdsToSave = tagIdsToSave.filter((id) => id !== walkInTag.id);
        }
      }

      const payload = {
        name: fName || undefined,
        email: fEmail || null,
        source: sourceToSave,
        sourceNote: fSourceNote || null,
        interest: fInterest || null,
        estimatedValue: fEstimatedValue ? parseFloat(fEstimatedValue) : null,
        kanbanStageId: stageToSave || null,
        tagIds: tagIdsToSave,
      };

      if (editTarget) {
        const res = await fetch(`/api/contacts/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
        }
        const { contact } = await res.json();
        setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
        toast.success('Contact updated');
      } else {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: fPhone.trim(),
            ...payload,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
        }
        const { contact } = await res.json();
        setContacts((prev) => [contact, ...prev]);
        toast.success('Contact added');
      }
      setShowModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save contact';
      toast.error(message);
    } finally {
      setFLoading(false);
    }
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact and all their messages? This cannot be undone.')) return;
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contact deleted');
    } else {
      toast.error('Failed to delete');
    }
  }

  function toggleTag(id: string) {
    setFTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q) ||
      c.email?.toLowerCase().includes(q);
    const matchTag   = !filterTag   || c.contactTags?.some((ct) => ct.tagId === filterTag);
    const matchStage = !filterStage || c.kanbanStageId === filterStage;
    return matchSearch && matchTag && matchStage;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Contacts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} total contacts</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Contact
        </button>
        <button onClick={() => setShowCSVModal(true)} className="btn-secondary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          CSV
        </button>
        <button onClick={() => setShowDuplicateModal(true)} className="btn-secondary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM17 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/><path d="M9 9h6M9 15h6"/>
          </svg>
          Duplicates
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-400"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="input max-w-[160px] py-2"
        >
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="input max-w-[160px] py-2"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {(search || filterTag || filterStage) && (
          <button
            onClick={() => { setSearch(''); setFilterTag(''); setFilterStage(''); }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-5xl mb-3">👥</div>
            <h3 className="text-lg font-bold text-gray-700 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              {contacts.length === 0 ? 'No contacts yet' : 'No contacts match'}
            </h3>
            <p className="text-gray-400 text-sm">
              {contacts.length === 0
                ? 'Contacts appear automatically when customers message you, or add them manually.'
                : 'Try adjusting your search or filters.'}
            </p>
            {contacts.length === 0 && (
              <button onClick={openCreate} className="btn-primary mt-4">Add your first contact</button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {['Contact', 'Phone', 'Stage', 'Tags', 'Value', 'Messages', 'Last Active', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {(contact.name ?? contact.phoneNumber).charAt(0).toUpperCase()}
                        </div>
                        {contact.source && contact.source !== 'WHATSAPP' && (
                          <div className="absolute -bottom-1 -right-1 text-lg" title={contact.source.replace(/_/g, ' ')}>
                            {SOURCE_OPTIONS.find(opt => opt.value === contact.source)?.emoji || '❓'}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {contact.name ?? <span className="text-gray-400 italic">No name</span>}
                        </p>
                        {contact.email && (
                          <p className="text-xs text-gray-500">{contact.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600 font-mono">{contact.phoneNumber}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {contact.kanbanStage ? (
                      <span
                        className="tag-pill"
                        style={{
                          background: `${contact.kanbanStage.color}20`,
                          color: contact.kanbanStage.color,
                        }}
                      >
                        {contact.kanbanStage.name}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {contact.contactTags?.length > 0
                        ? contact.contactTags.map((ct) => (
                            <span
                              key={ct.tagId}
                              className="tag-pill"
                              style={{ background: `${ct.tag.color}20`, color: ct.tag.color }}
                            >
                              {ct.tag.name}
                            </span>
                          ))
                        : <span className="text-gray-300 text-sm">—</span>
                      }
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600 font-semibold">
                      {contact.estimatedValue
                        ? `₦${contact.estimatedValue.toLocaleString()}`
                        : <span className="text-gray-300">—</span>
                      }
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{(contact._count as any)?.messages ?? 0}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-500">
                      {contact.lastMessageAt
                        ? format(new Date(contact.lastMessageAt), 'dd MMM yyyy')
                        : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(contact)}
                        className="text-gray-400 hover:text-forest-600 transition-colors"
                        title="Edit"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                {editTarget ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Section 1: Basic Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Basic Info</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                    <input
                      className="input"
                      placeholder="e.g. 2348012345678 (with country code)"
                      value={fPhone}
                      onChange={(e) => setFPhone(e.target.value)}
                      disabled={!!editTarget}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                    <input className="input" placeholder="Contact name" value={fName} onChange={(e) => setFName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input className="input" type="email" placeholder="email@example.com" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Section 2: Lead Context */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Lead Context</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">How did you meet them?</label>
                    <select
                      className="input"
                      value={fSource}
                      onChange={(e) => {
                        setFSource(e.target.value as ContactSource);
                        if (e.target.value === 'WALK_IN') {
                          setFWalkIn(true);
                          setFStage('');
                        }
                      }}
                    >
                      {SOURCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.emoji} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {fSource !== 'WHATSAPP' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Source note</label>
                      <input
                        className="input text-sm"
                        placeholder="e.g. Met at Lagos Food Fair, referred by Mrs. Bello"
                        value={fSourceNote}
                        onChange={(e) => setFSourceNote(e.target.value)}
                        maxLength={200}
                      />
                      <p className="text-xs text-gray-400 mt-1">{fSourceNote.length}/200</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">What are they interested in?</label>
                    <textarea
                      className="input text-sm resize-none"
                      placeholder="e.g. Wants catering for 50 people in December, interested in bulk pizza orders"
                      value={fInterest}
                      onChange={(e) => setFInterest(e.target.value)}
                      rows={2}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1">{fInterest.length}/500</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated value (₦)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="e.g. 45000"
                      value={fEstimatedValue}
                      onChange={(e) => setFEstimatedValue(e.target.value)}
                      step="1000"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">How much is this opportunity worth?</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Organisation */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Organisation</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pipeline Stage</label>
                    <select
                      className="input"
                      value={fStage}
                      onChange={(e) => setFStage(e.target.value)}
                      disabled={fSource === 'WALK_IN'}
                    >
                      <option value="">No stage</option>
                      {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {fSource === 'WALK_IN' && (
                      <p className="text-xs text-amber-600 mt-1">🚶 Walk-in customers skip the pipeline</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className="tag-pill cursor-pointer transition-all"
                          style={{
                            background: fTags.includes(tag.id) ? tag.color : `${tag.color}20`,
                            color: fTags.includes(tag.id) ? 'white' : tag.color,
                            border: `1px solid ${tag.color}40`,
                          }}
                        >
                          {fTags.includes(tag.id) && '✓ '}{tag.name}
                        </button>
                      ))}
                      {tags.length === 0 && (
                        <p className="text-xs text-gray-400">No tags yet — create them in Settings.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 pt-0 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={saveContact} disabled={fLoading} className="btn-primary flex-1 justify-center">
                {fLoading ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Modal */}
      {showCSVModal && (
        <CSVModal
          onClose={() => setShowCSVModal(false)}
          onImportSuccess={() => {
            setShowCSVModal(false);
            // Refresh contacts
            fetch('/api/contacts')
              .then((r) => r.json())
              .then((data) => setContacts(data.contacts || []))
              .catch((e) => toast.error('Failed to refresh contacts'));
          }}
        />
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <DuplicateModal
          onClose={() => setShowDuplicateModal(false)}
          onMergeSuccess={() => {
            // Refresh contacts after merge
            fetch('/api/contacts')
              .then((r) => r.json())
              .then((data) => setContacts(data.contacts || []))
              .catch((e) => toast.error('Failed to refresh contacts'));
          }}
        />
      )}
    </div>
  );
}
