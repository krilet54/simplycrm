// src/components/SettingsClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import PipelineSettings from './settings/PipelineSettings';
import PendingInvitations from './settings/PendingInvitations';

import type { QuickReplyType, TagType } from '@/types';

interface Workspace {
  id: string;
  businessName: string;
  plan: string;
  // Invoice branding
  invoiceLogo?: string | null;
  invoicePrimaryColor?: string | null;
  invoiceFooterText?: string | null;
  invoiceBusinessAddress?: string | null;
  invoiceBusinessPhone?: string | null;
  invoiceBusinessEmail?: string | null;
}

interface RecurringInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface RecurringInvoice {
  id: string;
  contactId: string;
  title: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  amount: number;
  isActive: boolean;
  nextInvoiceDate: string;
  contact: { id: string; name: string | null; phoneNumber: string; email: string | null };
  items: RecurringInvoiceItem[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  avatarUrl: string | null;
  isOnline: boolean;
  createdAt: string;
}

interface Props {
  workspace:    Workspace;
  currentUser:  { id: string; role: string; name: string; email: string; phoneNumber?: string | null };
  quickReplies: QuickReplyType[];
  tags:         TagType[];
  kanbanStages?: Array<{ id: string; name: string; color: string; position: number }>;
  contacts?:    Array<{ id: string; name: string | null; phoneNumber: string }>;
  recurringInvoices?: RecurringInvoice[];
}

interface InviteResponse {
  success: boolean;
  message: string;
  emailSent: boolean;
  emailError?: string;
  inviteLink: string;
  role: string;
  workspaceName: string;
}



type Tab = 'workspace' | 'team' | 'invoice-branding' | 'quick-replies' | 'tags' | 'pipeline' | 'billing';

export default function SettingsClient({ workspace: initWs, currentUser, quickReplies: initQR, tags: initTags, kanbanStages: initStages }: Props) {
  const [tab, setTab] = useState<Tab>('workspace');
  const [workspace, setWorkspace] = useState(initWs);

  // Team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'AGENT' | 'ADMIN'>('AGENT');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalData, setInviteModalData] = useState<InviteResponse | null>(null);

  // Workspace form
  const [wsName,   setWsName]   = useState(initWs.businessName);
  const [wsSaving, setWsSaving] = useState(false);

  // User Profile
  const [userName, setUserName] = useState(currentUser.name || '');
  const [userPhone, setUserPhone] = useState(currentUser.phoneNumber || '');
  const [userSaving, setUserSaving] = useState(false);

  // Quick replies
  const [qrs,      setQrs]      = useState<QuickReplyType[]>(initQR);
  const [qShortcut,setQShortcut] = useState('/');
  const [qTitle,   setQTitle]   = useState('');
  const [qContent, setQContent] = useState('');
  const [qLoading, setQLoading] = useState(false);

  // Tags
  const [tags,    setTags]    = useState<TagType[]>(initTags);
  const [tName,   setTName]   = useState('');
  const [tColor,  setTColor]  = useState('#6366f1');
  const [tLoading,setTLoading] = useState(false);

  // Kanban Stages
  const [stages, setStages] = useState(initStages ?? []);

  // Invoice Branding
  const [invoiceLogo, setInvoiceLogo] = useState(initWs.invoiceLogo ?? '');
  const [invoicePrimaryColor, setInvoicePrimaryColor] = useState(initWs.invoicePrimaryColor ?? '#22c55e');
  const [invoiceFooterText, setInvoiceFooterText] = useState(initWs.invoiceFooterText ?? 'Thank you for your business!');
  const [invoiceBusinessAddress, setInvoiceBusinessAddress] = useState(initWs.invoiceBusinessAddress ?? '');
  const [invoiceBusinessPhone, setInvoiceBusinessPhone] = useState(initWs.invoiceBusinessPhone ?? '');
  const [invoiceBusinessEmail, setInvoiceBusinessEmail] = useState(initWs.invoiceBusinessEmail ?? '');
  const [invoiceSaving, setInvoiceSaving] = useState(false);

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(currentUser.role);

  // Data Export
  const [exporting, setExporting] = useState(false);

  // Account Deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (tab === 'team') {
      fetchTeamMembers();
    }
  }, [tab]);

  async function fetchTeamMembers() {
    setTeamLoading(true);
    try {
      const res = await fetch('/api/workspace/invite');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load team members');
      }
      const { users } = await res.json();
      setTeamMembers(users);

      // Also fetch pending invitations
      try {
        const invRes = await fetch('/api/workspace/invite?pending=true');
        if (invRes.ok) {
          const { invites } = await invRes.json();
          setPendingInvitations(invites || []);
        }
      } catch (err) {
        console.error('Failed to fetch pending invitations:', err);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load team members';
      toast.error(message);
      console.error('fetchTeamMembers error:', error);
    } finally {
      setTeamLoading(false);
    }
  }

  async function inviteTeamMember() {
    if (!inviteEmail.trim()) {
      toast.error('Enter an email address');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await fetch('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to invite user');
      }
      const data: InviteResponse = await res.json();
      
      // Show modal with invite link
      setInviteModalData(data);
      setShowInviteModal(true);
      
      // Clear the form
      setInviteEmail('');
      setInviteRole('AGENT');
      
      // Show success toast
      toast.success(data.message);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function changeUserRole(userId: string, role: 'AGENT' | 'ADMIN' | 'OWNER') {
    try {
      const res = await fetch('/api/workspace/invite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error();
      const { user } = await res.json();
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === userId ? user : m))
      );
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  }

  async function removeTeamMember(userId: string) {
    if (!confirm('Remove this team member from the workspace?')) return;
    try {
      const res = await fetch(`/api/workspace/invite?id=${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      setTeamMembers((prev) => prev.filter((m) => m.id !== userId));
      toast.success('Team member removed');
    } catch {
      toast.error('Failed to remove team member');
    }
  }


  // Helper function to safely parse JSON from response
  async function safeParseJSON(res: Response) {
    try {
      return await res.json();
    } catch {
      return null;
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
      
      if (!res.ok) {
        let errorMessage = 'Failed to save workspace';
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      toast.success('Workspace updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save workspace';
      toast.error(message);
      console.error('saveWorkspace error:', err);
    } finally {
      setWsSaving(false);
    }
  }

  async function saveProfile() {
    if (!userName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setUserSaving(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          updateProfile: true,
          name: userName.trim(),
          phoneNumber: userPhone.trim(),
        }),
      });
      
      if (!res.ok) {
        let errorMessage = 'Failed to save profile';
        let details = '';
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
          details = data.details || '';
        } catch {
          // If response is not JSON, use status text
          errorMessage = res.statusText || errorMessage;
        }
        
        // Log full error for debugging
        console.error('Profile save error:', {
          status: res.status,
          statusText: res.statusText,
          error: errorMessage,
          details: details,
        });

        throw new Error(details ? `${errorMessage}\n${details}` : errorMessage);
      }
      
      const data = await res.json();
      if (data.success && data.user) {
        // Update local state with server response to ensure UI is in sync
        setUserName(data.user.name || '');
        setUserPhone(data.user.phoneNumber || '');
        
        // Check if there's a warning (e.g., phone number not saved due to missing column)
        if (data.warning) {
          toast.success('Name saved, but phone number requires database migration');
          console.warn('Profile warning:', data.warning);
        } else {
          toast.success('Profile updated');
        }
      } else {
        throw new Error(data.error || 'Failed to save profile');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      toast.error(message);
      console.error('saveProfile error:', err);
    } finally {
      setUserSaving(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to export data');
      }
      
      // Download the ZIP file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crebo-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export data';
      toast.error(message);
      console.error('exportData error:', err);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirmName.trim() !== workspace.businessName) {
      toast.error('Business name does not match');
      return;
    }
    
    setDeleting(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationName: deleteConfirmName.trim() }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account');
      }
      
      toast.success('Account deleted. Redirecting...');
      // Redirect to login page after deletion
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      toast.error(message);
      console.error('deleteAccount error:', err);
    } finally {
      setDeleting(false);
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
      
      if (!res.ok) {
        const data = await safeParseJSON(res);
        throw new Error(data?.error || 'Failed to add quick reply');
      }
      
      const { reply } = await res.json();
      setQrs((prev) => [...prev, reply]);
      setQShortcut('/'); setQTitle(''); setQContent('');
      toast.success('Quick reply added');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add quick reply';
      toast.error(message);
      console.error('addQR error:', err);
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
      
      if (!res.ok) {
        const data = await safeParseJSON(res);
        throw new Error(data?.error || 'Failed to create tag');
      }
      
      const { tag } = await res.json();
      setTags((prev) => [...prev, tag]);
      setTName(''); setTColor('#6366f1');
      toast.success('Tag created');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      toast.error(message);
      console.error('addTag error:', err);
    } finally {
      setTLoading(false);
    }
  }

  async function deleteTag(id: string) {
    await fetch(`/api/tags?id=${id}`, { method: 'DELETE' });
    setTags((prev) => prev.filter((t) => t.id !== id));
    toast.success('Tag deleted');
  }

  async function saveInvoiceBranding() {
    setInvoiceSaving(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceLogo: invoiceLogo.trim() || null,
          invoicePrimaryColor,
          invoiceFooterText: invoiceFooterText.trim() || null,
          invoiceBusinessAddress: invoiceBusinessAddress.trim() || null,
          invoiceBusinessPhone: invoiceBusinessPhone.trim() || null,
          invoiceBusinessEmail: invoiceBusinessEmail.trim() || null,
        }),
      });
      
      if (!res.ok) {
        let errorMessage = 'Failed to save branding';
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      setWorkspace(prev => ({
        ...prev,
        invoiceLogo: invoiceLogo.trim() || null,
        invoicePrimaryColor,
        invoiceFooterText: invoiceFooterText.trim() || null,
        invoiceBusinessAddress: invoiceBusinessAddress.trim() || null,
        invoiceBusinessPhone: invoiceBusinessPhone.trim() || null,
        invoiceBusinessEmail: invoiceBusinessEmail.trim() || null,
      }));
      toast.success('Invoice branding updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save branding';
      toast.error(message);
      console.error('saveInvoiceBranding error:', err);
    } finally {
      setInvoiceSaving(false);
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'workspace', label: 'Workspace', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg> },
    { id: 'team', label: 'Team', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'invoice-branding', label: 'Invoice Branding', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },

    { id: 'quick-replies', label: 'Quick Replies', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
    { id: 'tags', label: 'Tags', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
    { id: 'pipeline', label: 'Pipeline', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h8M8 13h8M8 20h8M5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg> },
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
                  {isOwnerOrAdmin && (
                    <button onClick={saveWorkspace} disabled={wsSaving} className="btn-primary">
                      {wsSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>

                {/* Your Profile Section */}
                <div className="mt-8">
                  <h3 className="text-md font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Your Profile</h3>
                  <p className="text-sm text-gray-500 mb-4">Update your personal information.</p>
                  <div className="card p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                      <input 
                        className="input" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                      <input 
                        className="input" 
                        value={userPhone} 
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="Your phone number"
                        type="tel"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input className="input" value={currentUser.email} disabled />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <button onClick={saveProfile} disabled={userSaving} className="btn-primary">
                      {userSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>

                {/* Data Export Section */}
                <div className="mt-8">
                  <h3 className="text-md font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Data Export</h3>
                  <p className="text-sm text-gray-500 mb-4">Download all your workspace data as a ZIP file containing CSV exports.</p>
                  <div className="card p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Export All Data</p>
                        <p className="text-xs text-gray-500 mt-1">Includes contacts and invoices as CSV files.</p>
                      </div>
                    </div>
                    <button 
                      onClick={exportData} 
                      disabled={exporting} 
                      className="btn-secondary flex items-center gap-2"
                    >
                      {exporting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download Data Export
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Danger Zone - Only for Owner */}
                {currentUser.role === 'OWNER' && (
                  <div className="mt-8">
                    <h3 className="text-md font-bold text-red-600 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Danger Zone</h3>
                    <p className="text-sm text-gray-500 mb-4">Irreversible actions that affect your entire workspace.</p>
                    <div className="card p-5 border-red-200 bg-red-50/30 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Delete Workspace</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Permanently delete your workspace and all associated data including contacts, invoices, 
                            activities, tasks, and team members. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete Workspace
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Team ──────────────────────────────────────────────── */}
            {tab === 'team' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Team Members</h2>
                <p className="text-sm text-gray-500 mb-6">Manage your workspace team and permissions.</p>

                {/* Invite form */}
                {isOwnerOrAdmin && (
                  <div className="card p-5 mb-6 space-y-3">
                    <h3 className="font-semibold text-sm text-gray-800">Invite Team Member</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                        <input
                          type="email"
                          className="input text-sm"
                          placeholder="colleague@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') inviteTeamMember(); }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                        <select
                          className="input text-sm"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as 'AGENT' | 'ADMIN')}
                        >
                          <option value="AGENT">Agent</option>
                          {currentUser.role === 'OWNER' && <option value="ADMIN">Admin</option>}
                        </select>
                      </div>
                    </div>
                    <button onClick={inviteTeamMember} disabled={inviteLoading} className="btn-primary text-sm">
                      {inviteLoading ? 'Sending...' : '+ Invite Member'}
                    </button>
                  </div>
                )}

                {/* Team members list */}
                <div className="space-y-2">
                  {teamLoading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Loading team members...</p>
                  ) : teamMembers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No team members yet.</p>
                  ) : (
                    teamMembers.filter(Boolean).map((member) => (
                      <div key={member?.id} className="card p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {member?.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name || 'User'} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-600">{(member?.name || 'U').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{member?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{member?.email || 'No email'}</p>
                          </div>
                          {member?.isOnline && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Online
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isOwnerOrAdmin && member?.role !== 'OWNER' && (
                            <>
                              <select
                                className="input text-xs py-1"
                                value={member?.role || 'AGENT'}
                                onChange={(e) => member?.id && changeUserRole(member.id, e.target.value as 'AGENT' | 'ADMIN' | 'OWNER')}
                              >
                                <option value="AGENT">Agent</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                              {member?.id !== currentUser.id && currentUser.role === 'OWNER' && (
                                <button
                                  onClick={() => member?.id && removeTeamMember(member.id)}
                                  className="text-gray-300 hover:text-red-400 transition-colors"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                          {member.role === 'OWNER' && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                              Owner
                            </span>
                          )}
                          {!isOwnerOrAdmin && (
                            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pending Invitations */}
                <PendingInvitations
                  invitations={pendingInvitations}
                  isLoading={teamLoading}
                  onRefresh={fetchTeamMembers}
                  currentUserRole={currentUser.role}
                />

                {/* Role descriptions */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">Role Permissions</h4>
                  <div className="space-y-2 text-xs text-gray-700">
                    <div>
                      <p className="font-medium text-gray-800">Owner</p>
                      <p className="text-gray-600">Full access. Can manage team, billing, and settings. Cannot be removed.</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Admin</p>
                      <p className="text-gray-600">Can manage team, view all data, and update settings. Can be downgraded to Agent.</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Agent</p>
                      <p className="text-gray-600">Can manage contacts, tasks, and communication. Limited access to workspace settings.</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Invoice Branding ────────────────────────────────────── */}
            {tab === 'invoice-branding' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Invoice Branding</h2>
                <p className="text-sm text-gray-500 mb-6">Customize how your invoices look and feel.</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Form Section */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="card p-5 space-y-4">
                      {/* Logo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
                        <input
                          className="input text-sm"
                          placeholder="https://example.com/logo.png"
                          value={invoiceLogo}
                          onChange={(e) => setInvoiceLogo(e.target.value)}
                          disabled={!isOwnerOrAdmin}
                        />
                        <p className="text-xs text-gray-500 mt-1">Max width: 120px, max height: 60px</p>
                        {invoiceLogo && (
                          <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                            <img src={invoiceLogo} alt="Logo preview" className="max-w-full h-auto max-h-16" />
                          </div>
                        )}
                      </div>

                      {/* Primary Color */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Brand Color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={invoicePrimaryColor}
                            onChange={(e) => setInvoicePrimaryColor(e.target.value)}
                            disabled={!isOwnerOrAdmin}
                            className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={invoicePrimaryColor}
                            onChange={(e) => setInvoicePrimaryColor(e.target.value)}
                            disabled={!isOwnerOrAdmin}
                            className="input flex-1 font-mono text-sm"
                            placeholder="#22c55e"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Used for headers and accents on invoices</p>
                      </div>

                      {/* Business Details */}
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Business Details (shown on invoices)</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                            <input
                              className="input text-sm"
                              placeholder="123 Business Street, City, Country"
                              value={invoiceBusinessAddress}
                              onChange={(e) => setInvoiceBusinessAddress(e.target.value)}
                              disabled={!isOwnerOrAdmin}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                            <input
                              className="input text-sm"
                              placeholder="+1 (555) 123-4567"
                              value={invoiceBusinessPhone}
                              onChange={(e) => setInvoiceBusinessPhone(e.target.value)}
                              disabled={!isOwnerOrAdmin}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                            <input
                              className="input text-sm"
                              placeholder="support@business.com"
                              value={invoiceBusinessEmail}
                              onChange={(e) => setInvoiceBusinessEmail(e.target.value)}
                              disabled={!isOwnerOrAdmin}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer Text */}
                      <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Footer Message</label>
                        <textarea
                          rows={3}
                          className="input text-sm resize-none"
                          placeholder="Thank you for your business!"
                          value={invoiceFooterText}
                          onChange={(e) => setInvoiceFooterText(e.target.value)}
                          disabled={!isOwnerOrAdmin}
                        />
                        <p className="text-xs text-gray-500 mt-1">Message displayed at the bottom of your invoices</p>
                      </div>

                      {isOwnerOrAdmin && (
                        <button onClick={saveInvoiceBranding} disabled={invoiceSaving} className="btn-primary">
                          {invoiceSaving ? 'Saving...' : 'Save Branding'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div className="lg:col-span-1">
                    <div className="card p-4 bg-gray-50 sticky top-8">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">Preview</h3>
                      <div className="bg-white rounded border border-gray-200 p-4 text-xs space-y-2">
                        {/* Mini Invoice Preview */}
                        <div className="border-b pb-2">
                          {invoiceLogo && (
                            <img src={invoiceLogo} alt="Logo" className="max-w-full h-auto max-h-12 mb-2" />
                          )}
                          <div style={{ color: invoicePrimaryColor }} className="font-bold text-sm">
                            {workspace.businessName}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {invoiceBusinessAddress && <div className="text-gray-600 text-xs">{invoiceBusinessAddress}</div>}
                          {invoiceBusinessPhone && <div className="text-gray-600 text-xs">{invoiceBusinessPhone}</div>}
                          {invoiceBusinessEmail && <div className="text-gray-600 text-xs">{invoiceBusinessEmail}</div>}
                        </div>
                        <div className="pt-2 border-t text-center text-gray-500 italic text-xs">
                          {invoiceFooterText}
                        </div>
                        <div className="pt-2 border-t" style={{ borderTopColor: invoicePrimaryColor + '20' }}>
                          <div style={{ color: invoicePrimaryColor }} className="font-bold text-sm text-center">
                            ₹25,000
                          </div>
                          <div className="text-gray-500 text-xs text-center">Amount Due</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
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
                  <div className="space-y-3">
                    <input
                      className="input"
                      placeholder="Tag name e.g. VIP"
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Choose Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={tColor}
                          onChange={(e) => setTColor(e.target.value)}
                          className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200 hover:border-gray-300"
                          title="Pick any color for this tag"
                        />
                        <input
                          type="text"
                          value={tColor}
                          onChange={(e) => setTColor(e.target.value)}
                          className="input flex-1 font-mono text-sm"
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>
                    {tName && (
                      <div>
                        <span className="text-xs text-gray-500 mr-2">Preview:</span>
                        <span className="tag-pill" style={{ background: `${tColor}20`, color: tColor }}>
                          {tName}
                        </span>
                      </div>
                    )}
                    <button onClick={addTag} disabled={tLoading} className="btn-primary w-full justify-center">
                      {tLoading ? 'Creating...' : '+ Create Tag'}
                    </button>
                  </div>
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

            {/* ── Pipeline ──────────────────────────────────────────── */}
            {tab === 'pipeline' && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>Pipeline Stages</h2>
                <PipelineSettings initialStages={stages} />
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
                      price: '₹499',
                      period: '/month',
                      features: ['Up to 3 team members', 'Unlimited contacts', 'Contact management', 'Kanban pipeline', 'Quick replies', 'Data export (CSV)'],
                      plan: 'STARTER',
                      cta: 'Get Starter',
                    },
                    {
                      name: 'Pro',
                      price: '₹999',
                      period: '/month',
                      features: ['Everything in Starter', 'Unlimited team members', 'Advanced analytics & reporting', 'API access', 'Priority support'],
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
                              try {
                                console.log('Payment started for plan:', plan);
                                const res = await fetch('/api/stripe/checkout', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ plan }),
                                });
                                
                                const data = await res.json();
                                console.log('Checkout response:', data);
                                
                                if (!res.ok) {
                                  toast.error(data.error || 'Failed to create payment order');
                                  return;
                                }
                                
                                // Open Razorpay checkout
                                const options = {
                                  key: data.key,
                                  order_id: data.orderId,
                                  amount: data.amount,
                                  currency: data.currency,
                                  description: data.description,
                                  prefill: data.prefill,
                                  handler: async (response: any) => {
                                    try {
                                      console.log('Payment response:', response);
                                      // Verify payment on backend
                                      const verifyRes = await fetch('/api/stripe/checkout', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          orderId: response.razorpay_order_id,
                                          paymentId: response.razorpay_payment_id,
                                          signature: response.razorpay_signature,
                                          plan: plan,
                                        }),
                                      });
                                      
                                      const verifyData = await verifyRes.json();
                                      console.log('Verify response:', verifyData);
                                      
                                      if (verifyData.success) {
                                        toast.success('Payment successful! Your plan has been upgraded.');
                                        setTimeout(() => window.location.reload(), 1500);
                                      } else {
                                        toast.error(verifyData.error || 'Payment verification failed');
                                      }
                                    } catch (err) {
                                      console.error('Verification error:', err);
                                      toast.error('Payment verification error');
                                    }
                                  },
                                  on_error: (error: any) => {
                                    console.error('Payment error:', error);
                                    toast.error(error.description || 'Payment failed');
                                  },
                                };
                                
                                // Open Razorpay modal
                                if (window.Razorpay) {
                                  const rzp = new window.Razorpay(options);
                                  rzp.open();
                                } else {
                                  toast.error('Razorpay not loaded. Please refresh the page.');
                                  console.error('Razorpay not available on window');
                                }
                              } catch (err) {
                                console.error('Payment error:', err);
                                toast.error('An error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'));
                              }
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
                    Billing is handled securely via Razorpay. To cancel or modify, email contact@crebo.in.
                  </p>
                </div>

                {/* Understanding your costs */}
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>What you pay</h3>

                  <div className="card p-5 border-2 border-green-200 bg-green-50">
                    <h4 className="font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>Crebo Plan</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Your subscription:</span>
                        <span className="font-semibold text-gray-900 flex items-center gap-1">
                          ₹499/month
                          <span className="text-green-600 text-lg">✓</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Billed via Razorpay</p>
                    </div>
                    <div className="border-t border-green-100 my-3 pt-3">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        <strong>Includes:</strong> Shared inbox, Kanban pipeline, unlimited contacts, team members, quick replies, notes — everything you need.
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      Simple, transparent pricing. No hidden fees.
                    </p>
                  </div>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>

      {/* Invite Link Modal */}
      {showInviteModal && inviteModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Invitation Link</h2>
            
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-gray-700 mb-3">
                <strong>Email Status:</strong> {inviteModalData.emailSent ? '✅ Sent successfully' : '⚠️ Email service disabled (localhost mode)'}
              </p>
              {inviteModalData.emailError && (
                <p className="text-xs text-amber-700 mb-2">Error: {inviteModalData.emailError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Share this link with the team member:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteModalData.inviteLink}
                  className="input text-sm font-mono flex-1"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteModalData.inviteLink);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="px-3 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded text-xs text-gray-700 space-y-1">
              <p><strong>Role:</strong> {inviteModalData.role}</p>
              <p><strong>Workspace:</strong> {inviteModalData.workspaceName}</p>
            </div>

            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete Workspace</h2>
                <p className="text-sm text-gray-600 mt-1">
                  This will permanently delete your entire workspace and all data associated with it.
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded border border-red-200">
              <p className="text-sm text-red-800 font-medium mb-2">This action will delete:</p>
              <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                <li>All contacts and their history</li>
                <li>All invoices and payment records</li>
                <li>All tasks, notes, and activities</li>
                <li>All team member accounts</li>
                <li>All workspace settings and data</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">{workspace.businessName}</span> to confirm:
              </label>
              <input
                type="text"
                className="input text-sm"
                placeholder="Enter your business name"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting || deleteConfirmName.trim() !== workspace.businessName}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
