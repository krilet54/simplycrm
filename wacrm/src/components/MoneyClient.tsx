'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import InvoiceModal from './invoices/InvoiceModal';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';

interface MoneyClientProps {
  invoices: any[];
  contacts: any[];
  summary: {
    totalUnpaid: number;
    totalUnpaidValue: number;
    totalPaidThisMonth: number;
    totalPaidAllTime: number;
  };
}

type FilterStatus = 'all' | 'unpaid' | 'paid' | 'cancelled';

export default function MoneyClient({ invoices, contacts, summary }: MoneyClientProps) {
  const [localInvoices, setLocalInvoices] = useState(invoices);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return localInvoices;
    if (filterStatus === 'paid') return localInvoices.filter(inv => inv.status === 'PAID');
    if (filterStatus === 'cancelled') return localInvoices.filter(inv => inv.status === 'CANCELLED');
    return localInvoices.filter(inv => !['PAID', 'CANCELLED'].includes(inv.status));
  }, [localInvoices, filterStatus]);

  const tabs: Array<{ id: FilterStatus; label: string; count: number }> = [
    { id: 'all', label: 'All', count: localInvoices.length },
    { id: 'unpaid', label: 'Unpaid', count: localInvoices.filter(i => !['PAID', 'CANCELLED'].includes(i.status)).length },
    { id: 'paid', label: 'Paid', count: localInvoices.filter(i => i.status === 'PAID').length },
    { id: 'cancelled', label: 'Cancelled', count: localInvoices.filter(i => i.status === 'CANCELLED').length },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      UNPAID: 'bg-red-100 text-red-700',
      PAID: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
      DRAFT: 'bg-yellow-100 text-yellow-700',
      SENT: 'bg-green-100 text-green-700',
    };
    return styles[status] || styles.DRAFT;
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidAt: new Date().toISOString() }),
      });

      if (!res.ok) throw new Error('Failed to update invoice');

      const data = await res.json();
      setLocalInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? data.invoice : inv)));
      toast.success('Invoice marked as paid');
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });

      if (!res.ok) throw new Error('Failed to delete invoice');

      setLocalInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      toast.success('Invoice deleted');
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  const handleSendWhatsApp = (contactPhone: string, invoiceNumber: string, amount: number) => {
    const message = `Invoice ${invoiceNumber} - ${formatCurrency(amount)}`;
    const encodedMessage = encodeURIComponent(message);
    const phone = contactPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingId(invoiceId);
    try {
      await downloadInvoicePDF(invoiceId, invoiceNumber);
      toast.success('Invoice downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download invoice');
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleMarkAsSent = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      });

      if (!res.ok) throw new Error('Failed to update invoice');

      const data = await res.json();
      setLocalInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? data.invoice : inv)));
      
      toast.success('Invoice marked as sent');
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Money</h1>
            <p className="text-gray-600 mt-1">Track invoices and payments</p>
          </div>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            + Create Invoice
          </button>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalUnpaidValue)}</p>
            <p className="text-xs text-gray-500 mt-2">({summary.totalUnpaid} invoices)</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-600">Paid This Month</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalPaidThisMonth)}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-600">All Time Collected</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalPaidAllTime)}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                filterStatus === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} <span className="ml-1 text-gray-500">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Invoices Table */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <p className="text-gray-900 font-medium">No invoices yet</p>
            <p className="text-gray-600 text-sm mt-1">Create your first invoice to start tracking payments.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map(invoice => {
                  const itemsTotal = invoice.items.reduce((sum: number, item: any) => sum + item.total, 0);
                  const amount = invoice.amount || itemsTotal;
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{invoice.contact?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">{invoice.contact?.phoneNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{formatCurrency(amount)}</p>
                          <p className="text-sm text-gray-600">{invoice.items.length} items</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">
                          {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        {invoice.status === 'PAID' && invoice.paidAt && (
                          <p className="text-sm text-green-600">
                            Paid {new Date(invoice.paidAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                            disabled={downloadingId === invoice.id}
                            className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" />
                            {downloadingId === invoice.id ? 'Downloading...' : 'Download'}
                          </button>
                          {['DRAFT', 'SENT', 'UNPAID', 'RECEIVED', 'OVERDUE'].includes(invoice.status) && (
                            <>
                              {invoice.status !== 'SENT' && (
                                <button
                                  onClick={() => handleMarkAsSent(invoice.id)}
                                  className="text-sm px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                >
                                  ✓ Sent
                                </button>
                              )}
                              <button
                                onClick={() => handleMarkPaid(invoice.id)}
                                className="text-sm px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                              >
                                ✓ Paid
                              </button>
                              {invoice.status !== 'SENT' && (
                                <button
                                  onClick={() => handleSendWhatsApp(invoice.contact?.phoneNumber || '', invoice.invoiceNumber, amount)}
                                  className="text-sm px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                                >
                                  Send WA
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(invoice.id)}
                                className="text-sm px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {invoice.status === 'PAID' && (
                            <button
                              className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700 cursor-default"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={(invoice) => {
          setLocalInvoices((prev) => [invoice, ...prev]);
          setIsInvoiceModalOpen(false);
        }}
        contacts={contacts}
      />
    </div>
  );
}
