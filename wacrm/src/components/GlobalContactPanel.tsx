'use client';

import { useContactPanelContext } from '@/hooks/useContactPanel';
import ContactProfilePanel from './contact-profile/ContactProfilePanel';
import { useEffect, useState, useCallback } from 'react';

interface GlobalContactPanelProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role?: string;
    avatar?: string;
  };
}

export default function GlobalContactPanel({ currentUser }: GlobalContactPanelProps) {
  const context = useContactPanelContext();
  const {
    isOpen,
    contact,
    activities,
    notes,
    invoices,
    emails,
    allContacts,
    closePanel,
    updateContact,
    setRefreshCallback,
    setEmails,
    setInvoices,
    setActivities,
    setNotes,
  } = context;
  const [refreshing, setRefreshing] = useState(false);

  const refreshContactData = useCallback(async () => {
    if (!contact) return;
    
    setRefreshing(true);
    try {
      const detailsRes = await fetch(`/api/contacts/${contact.id}/details`, { credentials: 'include' });
      if (!detailsRes.ok) {
        throw new Error(`Failed to refresh contact details (${detailsRes.status})`);
      }

      const detailsData = await detailsRes.json();
      if (detailsData.contact) {
        updateContact(detailsData.contact);
      }
      setNotes?.(detailsData.notes || []);
      setEmails?.(detailsData.emails || []);
      setInvoices?.(detailsData.invoices || []);
      setActivities?.(detailsData.activities || []);
    } catch (error) {
      console.error('Error refreshing contact data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [contact, setNotes, setEmails, setInvoices, setActivities, updateContact]);

  // Register refresh callback so other components can trigger refresh
  useEffect(() => {
    setRefreshCallback?.(refreshContactData);
  }, [refreshContactData, setRefreshCallback]);

  // Auto-refresh every 30 seconds when panel is open
  useEffect(() => {
    if (!isOpen || !contact) return;

    const interval = setInterval(refreshContactData, 30000);
    return () => clearInterval(interval);
  }, [isOpen, contact, refreshContactData]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePanel();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, closePanel]);

  if (!isOpen || !contact) return null;

  const handleNoteAdded = () => {
    refreshContactData();
  };

  const handleInvoiceUpdated = () => {
    refreshContactData();
  };

  const handleEmailSent = () => {
    refreshContactData();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={closePanel}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      {/* Sliding Panel */}
      <div
        className={`fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <ContactProfilePanel
          contact={contact}
          activities={activities}
          notes={notes}
          invoices={invoices}
          emails={emails}
          allContacts={allContacts}
          currentUser={currentUser || { id: '', name: '', role: 'AGENT' }}
          onClose={closePanel}
          onContactUpdate={updateContact}
          onNoteAdded={handleNoteAdded}
        />
      </div>
    </>
  );
}
