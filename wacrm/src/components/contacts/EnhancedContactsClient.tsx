'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ContactsClient from './ContactsClient';
import KanbanClient from '../kanban/KanbanClient';
import ContactProfilePanel from '../contact-profile/ContactProfilePanel';
import type { ContactType, TagType, KanbanStageType } from '@/types';

interface EnhancedContactsClientProps {
  contacts: ContactType[];
  tags: TagType[];
  stages: KanbanStageType[];
  activities: any[];
  invoices: any[];
  notes: any[];
  emails: any[];
  currentUser?: any;
}

export default function EnhancedContactsClient({
  contacts,
  tags,
  stages,
  activities,
  invoices,
  notes,
  emails,
  currentUser,
}: EnhancedContactsClientProps) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'list' | 'board'>(
    searchParams?.get('view') === 'board' ? 'board' : 'list'
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    searchParams?.get('contactId') || null
  );
  const [updatedSelectedContact, setUpdatedSelectedContact] = useState<ContactType | null>(null);
  const [fetchedActivities, setFetchedActivities] = useState<any[]>(activities);
  const [fetchedNotes, setFetchedNotes] = useState<any[]>(notes);
  const [fetchedInvoices, setFetchedInvoices] = useState<any[]>(invoices);
  const [fetchedEmails, setFetchedEmails] = useState<any[]>(emails);
  const [loading, setLoading] = useState(false);

  const selectedContact = useMemo(
    () => updatedSelectedContact || (selectedContactId ? contacts.find(c => c.id === selectedContactId) ?? null : null),
    [updatedSelectedContact, selectedContactId, contacts]
  );

  const fetchContactData = useCallback(async (contactId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/details`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch details (${res.status})`);

      const data = await res.json();
      setFetchedNotes(data.notes || []);
      setFetchedEmails(data.emails || []);
      setFetchedInvoices(data.invoices || []);
      setFetchedActivities(data.activities || []);

      if (data.contact) {
        setUpdatedSelectedContact(data.contact);
      }
    } catch (error) {
      console.error('Error fetching contact data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch contact details when a contact is selected
  useEffect(() => {
    if (!selectedContact?.id) return;
    fetchContactData(selectedContact.id);
  }, [selectedContact?.id, fetchContactData]);

  const contactActivities = fetchedActivities;
  const contactNotes = fetchedNotes;
  const contactInvoices = fetchedInvoices;
  const contactEmails = fetchedEmails;

  // Refresh function to refetch contact data
  const refreshContactData = async () => {
    if (!selectedContact?.id) return;
    await fetchContactData(selectedContact.id);
  };

  // Format stages with contacts for Kanban board
  const stagesWithContacts = useMemo(
    () => stages.map(stage => ({
      ...stage,
      contacts: contacts.filter(c => c.kanbanStageId === stage.id),
    })),
    [stages, contacts]
  );

  return (
    <div className="flex-1 overflow-auto flex">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* View Toggle Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">People</h1>
              <p className="text-gray-600 mt-1">{contacts.length} contacts</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded transition-colors font-medium ${
                  view === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView('board')}
                className={`px-4 py-2 rounded transition-colors font-medium ${
                  view === 'board'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Board
              </button>
            </div>
          </div>
        </div>

        {/* Views */}
        <div className="p-8">
          {view === 'list' ? (
            <ContactsClient 
              contacts={contacts} 
              tags={tags} 
              stages={stages}
              onContactSelect={setSelectedContactId}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200">
              <KanbanClient 
                stages={stagesWithContacts} 
                onContactSelect={setSelectedContactId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Contact Profile Panel */}
      {selectedContact && (
        <ContactProfilePanel
          contact={selectedContact}
          activities={contactActivities}
          notes={contactNotes}
          invoices={contactInvoices}
          emails={contactEmails}
          allContacts={contacts}
          currentUser={currentUser}
          onClose={() => {
            setSelectedContactId(null);
            setUpdatedSelectedContact(null);
          }}
          onContactUpdate={setUpdatedSelectedContact}
          onNoteAdded={refreshContactData}
        />
      )}
    </div>
  );
}
