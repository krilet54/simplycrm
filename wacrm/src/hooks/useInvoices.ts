/**
 * Hook for managing real-time invoice updates
 * Prevents need to refresh the page after sending/creating invoices
 */

import { useState, useCallback } from 'react';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  createdAt: Date | string;
  dueDate: Date | string | null;
  paidAt: Date | string | null;
  sentAt: Date | string | null;
  contact: {
    id: string;
    name: string | null;
    phoneNumber: string;
    email: string | null;
  };
  items: any[];
  [key: string]: any;
}

export function useInvoices(initialInvoices: Invoice[]) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  const addInvoice = useCallback((newInvoice: Invoice) => {
    setInvoices(prev => [newInvoice, ...prev]);
  }, []);

  const updateInvoice = useCallback((invoiceId: string, updates: Partial<Invoice>) => {
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === invoiceId ? { ...inv, ...updates } : inv
      )
    );
  }, []);

  const deleteInvoice = useCallback((invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  }, []);

  const markAsPaid = useCallback((invoiceId: string) => {
    updateInvoice(invoiceId, {
      status: 'PAID',
      paidAt: new Date(),
    });
  }, [updateInvoice]);

  const markAsSent = useCallback((invoiceId: string) => {
    updateInvoice(invoiceId, {
      status: 'SENT',
      sentAt: new Date(),
    });
  }, [updateInvoice]);

  return {
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    markAsPaid,
    markAsSent,
  };
}
