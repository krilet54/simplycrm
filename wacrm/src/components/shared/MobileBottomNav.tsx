'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { requireSupabaseBrowserClient } from '@/lib/supabase-browser';
import QuickAddContactModal from './QuickAddContactModal';

interface MobileBottomNavProps {
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
  };
  badgeCount: number;
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
    exact: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/contacts',
    label: 'People',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/money',
    label: 'Money',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 11h.01"/><path d="M8 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/followups',
    label: 'Follow-ups',
    badge: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

export default function MobileBottomNav({ user, workspace, badgeCount }: MobileBottomNavProps) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [kanbanStages, setKanbanStages] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [modalReady, setModalReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Fetch kanban stages and tags for modal
  useEffect(() => {
    if (showAddContact && !modalReady) {
      const fetchData = async () => {
        try {
          const [stagesRes, tagsRes] = await Promise.all([
            fetch('/api/kanban/stages'),
            fetch('/api/tags'),
          ]);

          if (stagesRes.ok) {
            const stagesData = await stagesRes.json();
            setKanbanStages(stagesData.stages || []);
          }

          if (tagsRes.ok) {
            const tagsData = await tagsRes.json();
            setTags(tagsData.tags || []);
          }

          setModalReady(true);
        } catch (error) {
          console.error('Failed to fetch modal data:', error);
          toast.error('Failed to load form data');
          setShowAddContact(false);
        }
      }

      fetchData();
    }
  }, [showAddContact, modalReady]);

  async function handleSignOut() {
    const supabase = requireSupabaseBrowserClient();
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Floating Menu Button */}
      <div className="fixed bottom-20 right-4 md:hidden z-40">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-14 h-14 rounded-full bg-forest-600 hover:bg-forest-500 text-white flex items-center justify-center shadow-lg transition-all"
        >
          {showMenu ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          )}
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 w-48 py-2">
            <div className="px-4 py-3 border-b">
              <p className="font-semibold text-sm text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-600">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden flex items-center justify-around px-2 py-2 border-t"
        style={{ background: 'var(--bg-sidebar)', borderTopColor: 'rgba(255,255,255,0.1)' }}
      >
        {navItems.map(({ href, label, exact, badge, icon }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors relative group"
              style={{
                color: isActive ? '#25D366' : '#9CA3AF',
                background: isActive ? 'rgba(37, 211, 102, 0.1)' : 'transparent',
              }}
              onClick={() => setShowMenu(false)}
            >
              <div className="relative">
                {icon}
                {badge && badgeCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </div>
                )}
              </div>
              <span className="text-xs mt-0.5 font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Quick Add Button */}
        <button
          onClick={() => setShowAddContact(true)}
          className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors group"
          style={{ color: '#9CA3AF' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span className="text-xs mt-0.5 font-medium">Add</span>
        </button>
      </nav>

      {/* Quick Add Modal - Only render when ready */}
      {showAddContact && modalReady && (
        <QuickAddContactModal
          kanbanStages={kanbanStages}
          tags={tags}
          onClose={() => {
            setShowAddContact(false);
            setModalReady(false);
          }}
          onSuccess={() => {
            setShowAddContact(false);
            setModalReady(false);
            router.push('/dashboard/contacts');
          }}
        />
      )}
    </>
  );
}
