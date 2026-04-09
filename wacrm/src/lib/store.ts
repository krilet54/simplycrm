import { create } from 'zustand';

interface SelectedContact {
  contactId: string | null;
  isOpen: boolean;
  contact: any | null;
  activities: any[];
  notes: any[];
  invoices: any[];
  emails: any[];
  allContacts: any[];
}

export const useContactPanel = create<SelectedContact & {
  openContactPanel: (id: string, data?: any) => void;
  closeContactPanel: () => void;
  closePanel: () => void;
  updateContact: (contact: any) => void;
  setActivities: (activities: any[]) => void;
  setNotes: (notes: any[]) => void;
  setInvoices: (invoices: any[]) => void;
  setEmails: (emails: any[]) => void;
  setRefreshCallback: (callback: () => void) => void;
  triggerRefresh: () => void;
}>((set, get) => ({
  contactId: null,
  isOpen: false,
  contact: null,
  activities: [],
  notes: [],
  invoices: [],
  emails: [],
  allContacts: [],
  openContactPanel: (id: string, data?: any) => set({ 
    contactId: id, 
    isOpen: true,
    contact: data?.contact || null,
    activities: data?.activities || [],
    notes: data?.notes || [],
    invoices: data?.invoices || [],
    emails: data?.emails || [],
    allContacts: data?.allContacts || [],
  }),
  closeContactPanel: () => set({ 
    isOpen: false, 
    contactId: null,
    contact: null,
    activities: [],
    notes: [],
    invoices: [],
    emails: [],
  }),
  closePanel: () => set({ 
    isOpen: false, 
    contactId: null,
    contact: null,
    activities: [],
    notes: [],
    invoices: [],
    emails: [],
  }),
  updateContact: (contact: any) => set({ contact }),
  setActivities: (activities: any[]) => set({ activities }),
  setNotes: (notes: any[]) => set({ notes }),
  setInvoices: (invoices: any[]) => set({ invoices }),
  setEmails: (emails: any[]) => set({ emails }),
  setRefreshCallback: (callback: () => void) => {
    refreshCallbackGlobal = callback;
  },
  triggerRefresh: () => {
    refreshCallbackGlobal?.();
  },
}));

let refreshCallbackGlobal: (() => void) | null = null;

interface QuickAddModal {
  isOpen: boolean;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
}

export const useQuickAdd = create<QuickAddModal>((set) => ({
  isOpen: false,
  openQuickAdd: () => set({ isOpen: true }),
  closeQuickAdd: () => set({ isOpen: false }),
}));
