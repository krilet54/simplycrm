'use client';

import React, { createContext, useState, useCallback } from 'react';
import type { ContactType } from '@/types';

interface ContactPanelContextType {
  isOpen: boolean;
  contact: ContactType | null;
  activities: any[];
  notes: any[];
  invoices: any[];
  emails: any[];
  allContacts: ContactType[];
  openPanel: (contact: ContactType, data: { activities: any[]; notes: any[]; invoices: any[]; emails: any[]; allContacts: ContactType[] }) => void;
  closePanel: () => void;
  updateContact: (contact: ContactType) => void;
  setRefreshCallback: (callback: () => void) => void;
  triggerRefresh: () => void;
  setEmails: (emails: any[]) => void;
  setInvoices: (invoices: any[]) => void;
  setActivities: (activities: any[]) => void;
  setNotes: (notes: any[]) => void;
}

export const ContactPanelContext = createContext<ContactPanelContextType | undefined>(undefined);

interface ContactPanelProviderProps {
  children: React.ReactNode;
}

let refreshCallbackGlobal: (() => void) | null = null;

export function ContactPanelProvider({ children }: ContactPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contact, setContact] = useState<ContactType | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<ContactType[]>([]);

  const openPanel = useCallback(
    (contact: ContactType, data: { activities: any[]; notes: any[]; invoices: any[]; emails: any[]; allContacts: ContactType[] }) => {
      setContact(contact);
      setActivities(data.activities);
      setNotes(data.notes);
      setInvoices(data.invoices);
      setEmails(data.emails);
      setAllContacts(data.allContacts);
      setIsOpen(true);
    },
    []
  );

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setContact(null);
  }, []);

  const updateContact = useCallback((updatedContact: ContactType) => {
    setContact(updatedContact);
  }, []);

  const setRefreshCallback = useCallback((callback: () => void) => {
    refreshCallbackGlobal = callback;
  }, []);

  const triggerRefresh = useCallback(() => {
    if (refreshCallbackGlobal) {
      console.log('🔄 Triggering contact panel refresh');
      refreshCallbackGlobal();
    }
  }, []);

  return (
    <ContactPanelContext.Provider value={{ 
      isOpen, 
      contact, 
      activities, 
      notes, 
      invoices, 
      emails, 
      allContacts, 
      openPanel, 
      closePanel, 
      updateContact,
      setRefreshCallback,
      triggerRefresh,
      setEmails,
      setInvoices,
      setActivities,
      setNotes,
    }}>
      {children}
    </ContactPanelContext.Provider>
  );
}
