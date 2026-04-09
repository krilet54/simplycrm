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
      // Fetch notes
      const notesRes = await fetch(`/api/notes?contactId=${contact.id}`, { credentials: 'include' });
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes?.(notesData.notes || []);
      }

      // Fetch emails
      const emailsRes = await fetch(`/api/emails?contactId=${contact.id}`, { credentials: 'include' });
      if (emailsRes.ok) {
        const emailsData = await emailsRes.json();
        setEmails?.(emailsData.emails || []);
      }

      // Fetch invoices
      const invoicesRes = await fetch(`/api/invoices?contactId=${contact.id}`, { credentials: 'include' });
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices?.(invoicesData.invoices || []);
      }

      // Fetch activities
      const activitiesRes = await fetch(`/api/contacts/${contact.id}/activity`, { credentials: 'include' });
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities?.(activitiesData.activities || []);
      }
    } catch (error) {
      console.error('Error refreshing contact data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [contact, setNotes, setEmails, setInvoices, setActivities]);

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
