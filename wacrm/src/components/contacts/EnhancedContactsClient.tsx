'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedSelectedContact, setUpdatedSelectedContact] = useState<ContactType | null>(null);
  const [fetchedActivities, setFetchedActivities] = useState<any[]>(activities);
  const [fetchedNotes, setFetchedNotes] = useState<any[]>(notes);
  const [fetchedInvoices, setFetchedInvoices] = useState<any[]>(invoices);
  const [fetchedEmails, setFetchedEmails] = useState<any[]>(emails);
  const [loading, setLoading] = useState(false);

  const selectedContact = updatedSelectedContact || (selectedContactId 
    ? contacts.find(c => c.id === selectedContactId)
    : null);

  // Fetch contact details when a contact is selected
  useEffect(() => {
    if (!selectedContact) return;

    const fetchContactData = async () => {
      setLoading(true);
      try {
        const [notesRes, emailsRes, invoicesRes, activitiesRes] = await Promise.all([
          fetch(`/api/notes?contactId=${selectedContact.id}`, { credentials: 'include' }),
          fetch(`/api/emails?contactId=${selectedContact.id}`, { credentials: 'include' }),
          fetch(`/api/invoices?contactId=${selectedContact.id}`, { credentials: 'include' }),
          fetch(`/api/contacts/${selectedContact.id}/activity`, { credentials: 'include' }),
        ]);

        if (notesRes.ok) {
          const data = await notesRes.json();
          setFetchedNotes(data.notes || []);
        }
        if (emailsRes.ok) {
          const data = await emailsRes.json();
          setFetchedEmails(data.emails || []);
        }
        if (invoicesRes.ok) {
          const data = await invoicesRes.json();
          setFetchedInvoices(data.invoices || []);
        }
        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          setFetchedActivities(data.activities || []);
        }
      } catch (error) {
        console.error('Error fetching contact data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContactData();
  }, [selectedContact?.id]);

  const contactActivities = fetchedActivities;
  const contactNotes = fetchedNotes;
  const contactInvoices = fetchedInvoices;
  const contactEmails = fetchedEmails;

  // Refresh function to refetch contact data
  const refreshContactData = async () => {
    if (!selectedContact) return;

    try {
      const [notesRes, emailsRes, invoicesRes, activitiesRes] = await Promise.all([
        fetch(`/api/notes?contactId=${selectedContact.id}`, { credentials: 'include' }),
        fetch(`/api/emails?contactId=${selectedContact.id}`, { credentials: 'include' }),
        fetch(`/api/invoices?contactId=${selectedContact.id}`, { credentials: 'include' }),
        fetch(`/api/contacts/${selectedContact.id}/activity`, { credentials: 'include' }),
      ]);

      if (notesRes.ok) {
        const data = await notesRes.json();
        setFetchedNotes(data.notes || []);
      }
      if (emailsRes.ok) {
        const data = await emailsRes.json();
        setFetchedEmails(data.emails || []);
      }
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setFetchedInvoices(data.invoices || []);
      }
      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setFetchedActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error refreshing contact data:', error);
    }
  };

  // Format stages with contacts for Kanban board
  const stagesWithContacts = stages.map(stage => ({
    ...stage,
    contacts: contacts.filter(c => c.kanbanStageId === stage.id),
  }));

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
