'use client';

import { useContext } from 'react';
import { ContactPanelContext } from '@/context/ContactPanelContext';

export function useContactPanelContext() {
  const context = useContext(ContactPanelContext);
  
  if (context === undefined) {
    throw new Error('useContactPanelContext must be used within a ContactPanelProvider');
  }
  
  return context;
}
