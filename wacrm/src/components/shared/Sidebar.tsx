// src/components/shared/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import toast from 'react-hot-toast';
import QuickAddContactModal from './QuickAddContactModal';
import { useTaskReminders } from '@/hooks/useTaskReminders';

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  };
  workspace: {
    id: string;
    businessName: string;
    plan: string;
    kanbanStages?: Array<{ id: string; name: string; position: number }>;
  };
  tags?: Array<{ id: string; name: string; color: string }>;
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/contacts',
    label: 'People',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/money',
    label: 'Money',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 11h.01"/><path d="M8 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/work',
    label: 'Work',
    badge: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

const planColors: Record<string, string> = {
  TRIAL:   '#f59e0b',
  STARTER: '#22c55e',
  PRO:     '#6366f1',
};

export default function Sidebar({ user, workspace, tags = [] }: SidebarProps) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = getSupabaseBrowserClient();

  // Initialize task reminder system
  useTaskReminders();

  // Fetch badge count for Follow-ups
  useEffect(() => {
    async function fetchBadgeCount() {
      try {
        const res = await fetch('/api/followups/count');
        if (res.ok) {
          const data = await res.json();
          setBadgeCount(data.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch follow-ups count:', error);
      }
    }
    
    fetchBadgeCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBadgeCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className="flex flex-col w-[220px] shrink-0 h-full py-5 px-3"
      style={{ background: 'var(--bg-sidebar)' }}
    >
      {/* Logo + workspace */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <img src="/crebo logo 2.png" alt="Crebo" className="w-7 h-7 rounded-md shrink-0" />
          <div className="min-w-0">
            <p
              className="text-white text-sm font-bold truncate leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {workspace.businessName}
            </p>
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: `${planColors[workspace.plan]}22`,
                color: planColors[workspace.plan],
                fontSize: '10px',
              }}
            >
              {workspace.plan}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems
          .filter((item: any) => !item.rolesAllowed || item.rolesAllowed.includes(user.role))
          .map(({ href, label, exact, badge, icon }: any) => {
          const isActive = exact 
            ? pathname === href 
            : pathname.startsWith(href);
          
          return (
            <div key={href} className="relative">
              <Link
                href={href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                {icon}
                <span>{label}</span>
              </Link>
              {badge && badgeCount > 0 && (
                <div className="absolute top-1.5 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick Add Contact Button */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setShowAddContact(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-forest-600 hover:bg-forest-500 text-white text-sm font-medium transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span>Add Contact</span>
        </button>
      </div>

      {/* User section */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-forest-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate leading-tight">{user.name}</p>
            <p className="text-white/40 text-xs truncate">{user.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-white/30 hover:text-white/70 transition-colors p-1 shrink-0"
            title="Sign out"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Add Contact Modal */}
      {showAddContact && (
        <QuickAddContactModal
          kanbanStages={workspace.kanbanStages || []}
          tags={tags}
          onClose={() => setShowAddContact(false)}
          onSuccess={() => {
            setShowAddContact(false);
            // Navigate to contacts page to show new contact
            window.location.href = '/dashboard/contacts';
          }}
        />
      )}
    </aside>
  );
}
