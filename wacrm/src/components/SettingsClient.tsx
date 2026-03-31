// src/components/SettingsClient.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import QRCodeTab from './settings/QRCodeTab';
import type { QuickReplyType, TagType, MetaOAuthTokenType } from '@/types';

interface Workspace {
  id: string;
  businessName: string;
  whatsappPhoneNumberId?: string | null;
  whatsappAccessToken?: string | null;
  metaOAuthToken?: MetaOAuthTokenType | null;
  plan: string;
}

interface Props {
  workspace:    Workspace;
  currentUser:  { id: string; role: string; name: string; email: string };
  quickReplies: QuickReplyType[];
  tags:         TagType[];
}

const TAG_COLORS = ['#ef4444','#f97316','#f59e0b','#22c55e','#14b8a6','#6366f1','#8b5cf6','#ec4899'];

type Tab = 'workspace' | 'whatsapp' | 'qr-code' | 'quick-replies' | 'tags' | 'billing';

export default function SettingsClient({ workspace: initWs, currentUser, quickReplies: initQR, tags: initTags }: Props) {
  const [tab, setTab] = useState<Tab>('workspace');
  const [workspace, setWorkspace] = useState(initWs);

  // Workspace form
  const [wsName,   setWsName]   = useState(initWs.businessName);
  const [wsSaving, setWsSaving] = useState(false);

  // WhatsApp form
  const [waPnId,    setWaPnId]    = useState(initWs.whatsappPhoneNumberId ?? '');
  const [waToken,   setWaToken]   = useState('');
  const [waSaving,  setWaSaving]  = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Quick replies
  const [qrs,      setQrs]      = useState<QuickReplyType[]>(initQR);
  const [qShortcut,setQShortcut] = useState('/');
  const [qTitle,   setQTitle]   = useState('');
  const [qContent, setQContent] = useState('');
  const [qLoading, setQLoading] = useState(false);

  // Tags
  const [tags,    setTags]    = useState<TagType[]>(initTags);
  const [tName,   setTName]   = useState('');
  const [tColor,  setTColor]  = useState(TAG_COLORS[0]);
  const [tLoading,setTLoading] = useState(false);

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(currentUser.role);
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/whatsapp`
    : '/api/webhook/whatsapp';

  async function handleDisconnectWhatsApp() {
    if (!window.confirm('Disconnect WhatsApp? You can reconnect anytime.')) return;

    setDisconnecting(true);
    try {
      const res = await fetch('/api/auth/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error();

      setWorkspace(prev => ({ ...prev, metaOAuthToken: null }));
      toast.success('WhatsApp disconnected');
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  }

  async function saveWorkspace() {
    if (!wsName.trim()) return;
    setWsSaving(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: wsName.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('Workspace updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setWsSaving(false);
    }
  }

  async function saveWhatsApp() {
    setWaSaving(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhoneNumberId: waPnId.trim() || null,
          whatsappAccessToken:   waToken.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('WhatsApp credentials saved');
      setWaToken('');
    } catch {
      toast.error('Failed to save credentials');
    } finally {
      setWaSaving(false);
    }
  }

  async function addQR() {
    if (!qShortcut.startsWith('/') || !qTitle || !qContent) {
      toast.error('Fill all fields. Shortcut must start with /');
      return;
    }
    setQLoading(true);
    try {
      const res = await fetch('/api/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut: qShortcut, title: qTitle, content: qContent }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { reply } = await res.json();
      setQrs((prev) => [...prev, reply]);
      setQShortcut('/'); setQTitle(''); setQContent('');
      toast.success('Quick reply added');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setQLoading(false);
    }
  }

  async function deleteQR(id: string) {
    await fetch(`/api/quick-replies?id=${id}`, { method: 'DELETE' });
    setQrs((prev) => prev.filter((q) => q.id !== id));
    toast.success('Deleted');
  }

  async function addTag() {
    if (!tName.trim()) { toast.error('Enter a tag name'); return; }
    setTLoading(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tName.trim(), color: tColor }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { tag } = await res.json();
      setTags((prev) => [...prev, tag]);
      setTName(''); setTColor(TAG_COLORS[0]);
      toast.success('Tag created');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTLoading(false);
    }
  }

  async function deleteTag(id: string) {
    await fetch(`/api/tags?id=${id}`, { method: 'DELETE' });
    setTags((prev) => prev.filter((t) => t.id !== id));
    toast.success('Tag deleted');
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'workspace', label: 'Workspace', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg> },
    { id: 'whatsapp',  label: 'WhatsApp',  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg> },
    { id: 'qr-code',   label: 'QR Code',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="4" height="4"/></svg> },
    { id: 'quick-replies', label: 'Quick Replies', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
    { id: 'tags', label: 'Tags', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
    { id: 'billing', label: 'Billing', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab sidebar */}
        <div className="w-48 shrink-0 border-r border-gray-200 bg-white overflow-y-auto py-2">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                tab === id
                  ? 'bg-forest-50 text-forest-700 border-r-2 border-forest-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl space-y-8">

            {/* ── Workspace ──────────────────────────────────────────── */}
            {tab === 'workspace' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Workspace Settings</h2>
                <p className="text-sm text-gray-500 mb-6">Manage your business information.</p>
                <div className="card p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                    <input className="input" value={wsName} onChange={(e) => setWsName(e.target.value)} disabled={!isOwnerOrAdmin} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                    <input className="input" value={currentUser.name} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input className="input" value={currentUser.email} disabled />
                  </div>
                  {isOwnerOrAdmin && (
                    <button onClick={saveWorkspace} disabled={wsSaving} className="btn-primary">
                      {wsSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* ── WhatsApp ───────────────────────────────────────────── */}
            {tab === 'whatsapp' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>WhatsApp Integration</h2>
                <p className="text-sm text-gray-500 mb-6">Connect your What sApp Business Account to send messages and invoices.</p>

                {/* OAuth Connection Status */}
                {workspace.metaOAuthToken ? (
                  // CONNECTED via OAuth
                  <div className="card p-4 mb-6 bg-emerald-50 border border-emerald-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                          Connected via OAuth
                        </h3>
                        <div className="space-y-2 text-sm text-emerald-800">
                          <p>Phone Number ID: <code className="font-mono text-xs bg-white px-2 py-1 rounded">{workspace.metaOAuthToken.phoneNumberId}</code></p>
                          <p>Connected since: {format(new Date(workspace.metaOAuthToken.connectedAt), 'dd MMM yyyy, HH:mm')}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnectWhatsApp}
                        disabled={disconnecting || !isOwnerOrAdmin}
                        className="btn-ghost text-red-600 hover:bg-red-50 px-3 py-2 text-sm shrink-0"
                      >
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  </div>
                ) : workspace.whatsappPhoneNumberId && workspace.whatsappAccessToken ? (
                  // CONNECTED via Legacy
                  <div className="card p-4 mb-6 bg-blue-50 border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">Connected (Manual Setup)</h3>
                        <p className="text-xs text-blue-700 mb-4">
                          You're using manual setup. For better security and easier management, consider upgrading to OAuth.
                        </p>
                      </div>
                      {isOwnerOrAdmin && (
                        <a
                          href={`/api/auth/whatsapp?workspace_id=${workspace.id}`}
                          className="btn-primary px-4 py-2 text-sm shrink-0 inline-block"
                        >
                          Upgrade to OAuth
                        </a>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Webhook instructions (always show) */}
                <div className="card p-5 mb-4 bg-gray-50">
                  <h3 className="font-semibold text-sm text-gray-800 mb-3">Step 1 — Set webhook URL in Meta dashboard</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-white border border-gray-200 px-3 py-2.5 rounded-lg text-gray-700 break-all">
                      {webhookUrl}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }}
                      className="btn-secondary shrink-0 py-2"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Subscribe to <strong>messages</strong> field in the WhatsApp webhook.
                  </p>
                </div>

                {/* OAuth Connect or Manual Setup */}
                {!workspace.metaOAuthToken ? (
                  <div className="space-y-4">
                    {/* OAuth Connection Button */}
                    {isOwnerOrAdmin && (
                      <div className="card p-5 bg-forest-50 border border-forest-200">
                        <h3 className="font-semibold text-sm text-forest-900 mb-3">Step 2 — Connect with OAuth (Recommended)</h3>
                        <a
                          href={`/api/auth/whatsapp?workspace_id=${workspace.id}`}
                          className="btn-primary inline-block"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2"><circle cx="12" cy="12" r="10"/><path fill="white" d="M7 12l2.929 2.929L16 9"/></svg>
                          Connect WhatsApp with OAuth
                        </a>
                      </div>
                    )}

                    {/* Manual Setup (Collapsible) */}
                    <details className="card p-5">
                      <summary className="font-semibold text-sm text-gray-800 cursor-pointer mb-3">
                        Step 2 (Alternative) — Manual Setup (Advanced)
                      </summary>
                      <div className="space-y-4 pt-2 border-t border-gray-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number ID</label>
                          <input
                            className="input font-mono text-sm"
                            placeholder="123456789012345"
                            value={waPnId}
                            onChange={(e) => setWaPnId(e.target.value)}
                            disabled={!isOwnerOrAdmin}
                          />
                          {waPnId && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              Configured
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Access Token
                            <span className="text-gray-400 font-normal ml-1">(leave blank to keep existing)</span>
                          </label>
                          <input
                            className="input font-mono text-sm"
                            placeholder="EAAxxxxxxxx..."
                            value={waToken}
                            onChange={(e) => setWaToken(e.target.value)}
                            disabled={!isOwnerOrAdmin}
                            type="password"
                          />
                        </div>
                        {isOwnerOrAdmin && (
                          <button onClick={saveWhatsApp} disabled={waSaving} className="btn-primary">
                            {waSaving ? 'Saving...' : 'Save Credentials'}
                          </button>
                        )}
                      </div>
                    </details>
                  </div>
                ) : (
                  // Connected - show manual setup option
                  <details className="card p-5">
                    <summary className="font-semibold text-sm text-gray-800 cursor-pointer">
                      Manual Setup (Advanced)
                    </summary>
                    <div className="space-y-4 pt-3 border-t border-gray-200 mt-3">
                      <p className="text-xs text-gray-500">
                        You can also manually enter credentials as a fallback option.
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number ID</label>
                        <input
                          className="input font-mono text-sm"
                          placeholder="123456789012345"
                          value={waPnId}
                          onChange={(e) => setWaPnId(e.target.value)}
                          disabled={!isOwnerOrAdmin}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Access Token
                          <span className="text-gray-400 font-normal ml-1">(leave blank to keep existing)</span>
                        </label>
                        <input
                          className="input font-mono text-sm"
                          placeholder="EAAxxxxxxxx..."
                          value={waToken}
                          onChange={(e) => setWaToken(e.target.value)}
                          disabled={!isOwnerOrAdmin}
                          type="password"
                        />
                      </div>
                      {isOwnerOrAdmin && (
                        <button onClick={saveWhatsApp} disabled={waSaving} className="btn-primary">
                          {waSaving ? 'Saving...' : 'Save Credentials'}
                        </button>
                      )}
                    </div>
                  </details>
                )}
              </section>
            )}

            {/* ── QR Code ───────────────────────────────────────────────── */}
            {tab === 'qr-code' && (
              <QRCodeTab workspace={workspace} />
            )}

            {/* ── Quick Replies ──────────────────────────────────────── */}
            {tab === 'quick-replies' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Quick Replies</h2>
                <p className="text-sm text-gray-500 mb-6">Type a shortcut (e.g. <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">/hello</code>) in the chat composer to insert a canned response.</p>

                {/* Add form */}
                <div className="card p-5 mb-4 space-y-3">
                  <h3 className="font-semibold text-sm text-gray-800">Add Quick Reply</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Shortcut *</label>
                      <input className="input text-sm font-mono" placeholder="/shortcut" value={qShortcut} onChange={(e) => setQShortcut(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                      <input className="input text-sm" placeholder="e.g. Greeting" value={qTitle} onChange={(e) => setQTitle(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Message Content *</label>
                    <textarea
                      rows={3}
                      className="input text-sm resize-none"
                      placeholder="The message that will be inserted..."
                      value={qContent}
                      onChange={(e) => setQContent(e.target.value)}
                    />
                  </div>
                  <button onClick={addQR} disabled={qLoading} className="btn-primary text-sm">
                    {qLoading ? 'Adding...' : '+ Add Quick Reply'}
                  </button>
                </div>

                {/* List */}
                <div className="space-y-2">
                  {qrs.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">No quick replies yet.</p>
                  )}
                  {qrs.map((qr) => (
                    <div key={qr.id} className="card p-4 flex items-start gap-3">
                      <code className="text-sm font-mono text-forest-600 bg-forest-50 px-2 py-0.5 rounded shrink-0">
                        {qr.shortcut}
                      </code>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{qr.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{qr.content}</p>
                      </div>
                      <button
                        onClick={() => deleteQR(qr.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Tags ──────────────────────────────────────────────── */}
            {tab === 'tags' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Contact Tags</h2>
                <p className="text-sm text-gray-500 mb-6">Create labels to categorize and filter your contacts.</p>

                {/* Add form */}
                <div className="card p-5 mb-4">
                  <h3 className="font-semibold text-sm text-gray-800 mb-3">Create Tag</h3>
                  <div className="flex items-center gap-3">
                    <input
                      className="input flex-1"
                      placeholder="Tag name e.g. VIP"
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }}
                    />
                    <div className="flex gap-1.5">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTColor(c)}
                          className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                          style={{
                            background: c,
                            outline: tColor === c ? `2px solid ${c}` : 'none',
                            outlineOffset: '2px',
                          }}
                        />
                      ))}
                    </div>
                    <button onClick={addTag} disabled={tLoading} className="btn-primary shrink-0">
                      {tLoading ? '...' : 'Create'}
                    </button>
                  </div>
                  {tName && (
                    <div className="mt-3">
                      <span className="text-xs text-gray-500 mr-2">Preview:</span>
                      <span className="tag-pill" style={{ background: `${tColor}20`, color: tColor }}>
                        {tName}
                      </span>
                    </div>
                  )}
                </div>

                {/* List */}
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 && (
                    <p className="text-sm text-gray-400 py-4">No tags yet.</p>
                  )}
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full border"
                      style={{ borderColor: `${tag.color}40`, background: `${tag.color}10` }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: tag.color }} />
                      <span className="text-sm font-medium" style={{ color: tag.color }}>{tag.name}</span>
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="ml-1 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Billing ───────────────────────────────────────────── */}
            {tab === 'billing' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Billing & Plan</h2>
                <p className="text-sm text-gray-500 mb-6">Manage your subscription.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {[
                    {
                      name: 'Starter',
                      price: '$19',
                      period: '/month',
                      features: ['1 WhatsApp number', 'Up to 3 team members', 'Unlimited contacts', 'Shared inbox', 'Kanban pipeline', 'Quick replies'],
                      plan: 'STARTER',
                      cta: 'Get Starter',
                    },
                    {
                      name: 'Pro',
                      price: '$39',
                      period: '/month',
                      features: ['Everything in Starter', 'Unlimited team members', 'Broadcast messages', 'Data export (CSV)', 'Priority support'],
                      plan: 'PRO',
                      cta: 'Get Pro',
                      highlight: true,
                    },
                  ].map(({ name, price, period, features, plan, cta, highlight }) => {
                    const isCurrent = workspace.plan === plan;
                    return (
                      <div
                        key={plan}
                        className={`card p-5 relative ${highlight ? 'ring-2 ring-forest-500' : ''}`}
                      >
                        {highlight && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-forest-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            Most Popular
                          </span>
                        )}
                        <div className="mb-4">
                          <h3 className="font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>{name}</h3>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-bold text-gray-900">{price}</span>
                            <span className="text-gray-500 text-sm">{period}</span>
                          </div>
                        </div>
                        <ul className="space-y-2 mb-5">
                          {features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              {f}
                            </li>
                          ))}
                        </ul>
                        {isCurrent ? (
                          <div className="text-center py-2 rounded-lg bg-gray-100 text-gray-500 text-sm font-medium">
                            Current plan ✓
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              const res = await fetch('/api/stripe/checkout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ plan }),
                              });
                              const { url, error } = await res.json();
                              if (error) { toast.error(error); return; }
                              if (url) window.location.href = url;
                            }}
                            className={highlight ? 'btn-primary w-full justify-center' : 'btn-secondary w-full justify-center'}
                          >
                            {cta}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="card p-4 bg-gray-50">
                  <p className="text-sm text-gray-500">
                    Current plan: <strong className="text-gray-800">{workspace.plan}</strong>.
                    Billing is handled securely via Stripe. To cancel, email support.
                  </p>
                </div>

                {/* Understanding your costs */}
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Understanding your costs</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {/* WaCRM fees card */}
                    <div className="card p-5 border-2 border-green-200 bg-green-50">
                      <h4 className="font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>WaCRM fees</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Your plan:</span>
                          <span className="font-semibold text-gray-900 flex items-center gap-1">
                            $19/month
                            <span className="text-green-600 text-lg">✓</span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Billed by WaCRM via Stripe</p>
                      </div>
                      <div className="border-t border-green-100 my-3 pt-3">
                        <p className="text-xs text-gray-600 leading-relaxed">
                          <strong>Includes:</strong> Shared inbox, Kanban pipeline, unlimited contacts, team members, quick replies, notes, QR code — everything.
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 italic">
                        This is the only money we ever collect from you.
                      </p>
                    </div>

                    {/* Meta fees card */}
                    <div className="card p-5 border-2 border-amber-200 bg-amber-50">
                      <h4 className="font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>Meta (WhatsApp) fees</h4>
                      <div className="space-y-2 text-sm">
                        <p className="text-xs text-gray-600">Billed directly by Meta to your Meta account</p>
                        <p className="text-xs text-gray-600">We never see or touch this money</p>
                        <div className="border-t border-amber-100 my-2 pt-2">
                          <div className="flex items-start gap-2 text-xs">
                            <span className="text-green-600 mt-0.5">✅</span>
                            <span className="text-gray-700">Inbound + replies within 24hrs = Free</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs mt-1">
                            <span className="text-amber-600 mt-0.5">⚡</span>
                            <span className="text-gray-700">You-initiated messages = ~$0.04 each</span>
                          </div>
                        </div>
                      </div>
                      <a
                        href="https://business.facebook.com/billing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-700 hover:text-amber-800 font-medium mt-3 inline-flex items-center gap-1"
                      >
                        Check your Meta balance →
                      </a>
                    </div>
                  </div>

                  <div className="card p-4 bg-gray-50">
                    <p className="text-sm text-gray-600">
                      Most small businesses using WaCRM pay <strong className="text-gray-800">$0 to Meta per month</strong> by responding quickly to customers and using the QR code for walk-ins. Meta fees only apply when you reach out first.
                    </p>
                  </div>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
