// src/components/AgentsClient.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Agent {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  avatarUrl?: string | null;
  isOnline: boolean;
  createdAt: Date;
}

interface Props {
  agents:      Agent[];
  currentUser: { id: string; role: string };
  plan:        string;
  agentLimit:  number;
}

const roleColors: Record<string, { bg: string; text: string }> = {
  OWNER: { bg: '#fef3c7', text: '#92400e' },
  ADMIN: { bg: '#ede9fe', text: '#5b21b6' },
  AGENT: { bg: '#f0fdf4', text: '#166534' },
};

export default function AgentsClient({ agents: init, currentUser, plan, agentLimit }: Props) {
  const [agents,  setAgents]  = useState<Agent[]>(init);
  const [showModal, setShowModal] = useState(false);
  const [iName,   setIName]   = useState('');
  const [iEmail,  setIEmail]  = useState('');
  const [iRole,   setIRole]   = useState<'ADMIN' | 'AGENT'>('AGENT');
  const [loading, setLoading] = useState(false);

  const canInvite = ['OWNER', 'ADMIN'].includes(currentUser.role);
  const atLimit   = agents.length >= agentLimit;

  async function inviteAgent() {
    if (!iEmail || !iName) { toast.error('Fill in all fields'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: iName, email: iEmail, role: iRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { agent } = await res.json();
      setAgents((prev) => [...prev, agent]);
      setShowModal(false);
      setIName(''); setIEmail(''); setIRole('AGENT');
      toast.success(`Invite sent to ${iEmail} 📧`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Team Members
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {agents.length} / {agentLimit === 999 ? '∞' : agentLimit} seats used
            <span className="ml-2 text-xs text-gray-400">({plan} plan)</span>
          </p>
        </div>
        {canInvite && (
          <button
            onClick={() => {
              if (atLimit) {
                toast.error(`Upgrade to add more than ${agentLimit} team members`);
                return;
              }
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            Invite Team Member
          </button>
        )}
      </div>

      {/* Seat progress bar */}
      {agentLimit < 999 && (
        <div className="px-6 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3 max-w-sm">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (agents.length / agentLimit) * 100)}%`,
                  background: agents.length >= agentLimit ? '#ef4444' : '#22c55e',
                }}
              />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {agents.length}/{agentLimit} seats
            </span>
          </div>
        </div>
      )}

      {/* Agent grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {agents.map((agent) => {
            const initials = agent.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            const roleStyle = roleColors[agent.role] ?? roleColors.AGENT;

            return (
              <div key={agent.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center text-white font-bold">
                      {initials}
                    </div>
                    {agent.isOnline && (
                      <span className="absolute bottom-0 right-0 online-dot" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{agent.name}</p>
                      {agent.id === currentUser.id && (
                        <span className="text-[10px] text-gray-400">(you)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{agent.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="tag-pill text-[11px]"
                        style={{ background: roleStyle.bg, color: roleStyle.text }}
                      >
                        {agent.role}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Joined {format(new Date(agent.createdAt), 'MMM yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Invite placeholder */}
          {canInvite && !atLimit && (
            <button
              onClick={() => setShowModal(true)}
              className="card p-5 border-dashed border-2 border-gray-200 hover:border-forest-300 hover:bg-forest-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-forest-600"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <p className="text-sm font-medium">Invite team member</p>
            </button>
          )}
        </div>

        {/* Upgrade CTA if at limit */}
        {atLimit && plan !== 'PRO' && (
          <div className="mt-6 max-w-lg card p-5 bg-gradient-to-r from-forest-50 to-white border border-forest-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e8535" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Upgrade to Pro for unlimited team members</p>
                <p className="text-xs text-gray-500 mt-1">Your {plan} plan includes {agentLimit} seats. Pro gives you unlimited agents plus broadcasts and data export.</p>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ plan: 'PRO' }),
                    });
                    const { url } = await res.json();
                    if (url) window.location.href = url;
                  }}
                  className="btn-primary mt-3 text-sm py-1.5"
                >
                  Upgrade to Pro — $39/mo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                Invite Team Member
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input className="input" placeholder="e.g. Amaka Obi" value={iName} onChange={(e) => setIName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input className="input" type="email" placeholder="agent@yourbusiness.com" value={iEmail} onChange={(e) => setIEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['AGENT', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setIRole(r)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        iRole === r ? 'border-forest-500 bg-forest-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-800">{r}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r === 'AGENT' ? 'Can reply to messages' : 'Can manage settings & team'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                An invite email will be sent. They can set their password and join your workspace.
              </div>
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={inviteAgent} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? 'Sending invite...' : 'Send Invite 📧'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
