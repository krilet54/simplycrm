'use client';

import { ContactPanelProvider } from '@/context/ContactPanelContext';
import GlobalContactPanel from '@/components/GlobalContactPanel';
import GlobalSearch from '@/components/GlobalSearch';
import { NotificationBadge } from '@/components/NotificationBadge';
import HelpPanel from '@/components/HelpPanel';
import Sidebar from '@/components/shared/Sidebar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { TrialBanner } from '@/components/TrialBanner';
import { TrialExpiredModal } from '@/components/TrialExpiredModal';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { TrialStatus } from '@/lib/trial';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: any;
  trialStatus: TrialStatus;
  initialBadgeCount: number;
}

export default function DashboardLayoutClient({ children, user, trialStatus, initialBadgeCount }: DashboardLayoutClientProps) {
  const [badgeCount, setBadgeCount] = useState(initialBadgeCount);
  const searchParams = useSearchParams();
  const showExpiredModal = searchParams.get('trial') === 'expired' || trialStatus.status === 'expired';

  useEffect(() => {
    let isMounted = true;
    
    async function fetchBadgeCount() {
      try {
        const res = await fetch('/api/followups/count');
        if (res.ok && isMounted) {
          const data = await res.json();
          setBadgeCount(data.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch follow-ups count:', error);
      }
    }

    const interval = setInterval(fetchBadgeCount, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <ContactPanelProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Desktop Sidebar - Hidden on Mobile */}
        <div className="hidden md:block">
          <Sidebar 
            user={user} 
            workspace={user.workspace} 
            tags={user.workspace.tags}
            badgeCount={badgeCount}
          />
        </div>

        {/* Main Content with Mobile Padding */}
        <main className="flex-1 overflow-hidden flex flex-col pb-16 md:pb-0">
          {/* Trial Banner - shows when trial is ending soon */}
          {trialStatus.status === 'trial' && trialStatus.daysLeft !== null && trialStatus.daysLeft <= 7 && (
            <TrialBanner daysLeft={trialStatus.daysLeft} />
          )}

          {/* Header with Search */}
          <div className="hidden md:flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-3">
              <GlobalSearch />
              <HelpPanel />
              <NotificationBadge />
            </div>
          </div>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav 
          user={user}
          workspace={user.workspace}
          badgeCount={badgeCount}
        />

        {/* Global Contact Panel */}
        <GlobalContactPanel currentUser={user} />

        {/* Trial Expired Modal */}
        {showExpiredModal && <TrialExpiredModal />}
      </div>
    </ContactPanelProvider>
  );
}
