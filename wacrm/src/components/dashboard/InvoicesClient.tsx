// src/components/dashboard/InvoicesClient.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  tax: number;
  subtotal: number;
  dueDate: string | Date | null;
  paidAt: string | Date | null;
  createdAt: string | Date;
  contact: Contact;
  items: InvoiceItem[];
}

interface InvoicesClientProps {
  invoices: Invoice[];
  totalOutstanding: number;
  totalPaidThisMonth: number;
  outstandingCount: number;
  paidThisMonthCount: number;
}

type FilterType = 'all' | 'outstanding' | 'paid' | 'overdue' | 'draft';

export default function InvoicesClient({
  invoices: initialInvoices,
  totalOutstanding,
  totalPaidThisMonth,
  outstandingCount,
  paidThisMonthCount,
}: InvoicesClientProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Filter invoices
  const filteredInvoices = initialInvoices.filter(invoice => {
    // Status filter
    if (filter === 'outstanding' && invoice.status !== 'DRAFT' && invoice.status !== 'SENT' && invoice.status !== 'OVERDUE') return false;
    if (filter === 'paid' && invoice.status !== 'PAID') return false;
    if (filter === 'overdue' && invoice.status !== 'OVERDUE') return false;
    if (filter === 'draft' && invoice.status !== 'DRAFT') return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.contact.name.toLowerCase().includes(query) ||
        invoice.contact.phone.includes(query)
      );
    }
    
    return true;
  });

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleMarkAsReceived = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RECEIVED' }),
      });

      if (!res.ok) throw new Error('Failed to update invoice');
      
      toast.success('Invoice marked as received');
      router.refresh();
    } catch (err) {
      toast.error('Failed to update invoice');
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidAt: new Date().toISOString() }),
      });

      if (!res.ok) throw new Error('Failed to update invoice');
      
      toast.success('Invoice marked as paid');
      router.refresh();
    } catch (err) {
      toast.error('Failed to update invoice');
    }
  };

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    try {
      await downloadInvoicePDF(invoiceId, invoiceNumber);
      toast.success('Invoice downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download invoice');
      console.error(err);
    }
  };

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All Invoices' },
    { key: 'outstanding', label: 'Outstanding', count: outstandingCount },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'draft', label: 'Draft' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-1">Track payments and outstanding balances</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-amber-700 font-medium">Outstanding</p>
                <p className="text-xl font-bold text-amber-900" suppressHydrationWarning>
                  {formatCurrency(totalOutstanding)}
                </p>
                <p className="text-xs text-amber-600">{outstandingCount} invoice{outstandingCount !== 1 ? 's' : ''} pending</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Collected This Month</p>
                <p className="text-xl font-bold text-green-900" suppressHydrationWarning>
                  {formatCurrency(totalPaidThisMonth)}
                </p>
                <p className="text-xs text-green-600">{paidThisMonthCount} invoice{paidThisMonthCount !== 1 ? 's' : ''} paid</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-3 bg-white border-b flex items-center gap-4">
        <div className="flex gap-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-forest-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === f.key ? 'bg-white/20' : 'bg-red-100 text-red-600'
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500 w-64"
          />
        </div>
      </div>

      {/* Invoice List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto text-gray-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p className="text-gray-500 mt-3">No invoices found</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter !== 'all' ? 'Try changing the filter' : 'Create invoices from the contact inbox'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map(invoice => (
              <div
                key={invoice.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{invoice.contact.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-gray-400 mt-1">{invoice.contact.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900" suppressHydrationWarning>
                      {formatCurrency(invoice.total)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1" suppressHydrationWarning>
                      {invoice.dueDate 
                        ? `Due ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}`
                        : format(new Date(invoice.createdAt), 'MMM d, yyyy')
                      }
                    </p>
                  </div>
                </div>

                {/* Items Preview */}
                {invoice.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      {invoice.items.slice(0, 2).map((item, i) => (
                        <span key={item.id}>
                          {i > 0 && ', '}
                          {item.description} ({item.quantity}x)
                        </span>
                      ))}
                      {invoice.items.length > 2 && (
                        <span className="text-gray-400"> +{invoice.items.length - 2} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <Link
                    href={`/dashboard/inbox?contactId=${invoice.contact.id}`}
                    className="text-sm text-forest-600 hover:text-forest-700 font-medium"
                  >
                    View Contact
                  </Link>
                  {invoice.status === 'SENT' && (
                    <>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleMarkAsReceived(invoice.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Mark as Received
                      </button>
                    </>
                  )}
                  {(invoice.status === 'SENT' || invoice.status === 'RECEIVED' || invoice.status === 'OVERDUE') && (
                    <>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleMarkAsPaid(invoice.id)}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Mark as Paid
                      </button>
                    </>
                  )}
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium inline-flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
