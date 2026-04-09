'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Mail, Send, Trash2 } from 'lucide-react';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';

interface InvoicesTabProps {
  invoices: any[];
  contactId: string;
  onCreateClick?: () => void;
  onSendClick?: (invoiceId: string) => void;
  onInvoiceUpdated?: (updatedInvoices: any[]) => void;
}

export default function InvoicesTab({ invoices: initialInvoices, contactId, onCreateClick, onSendClick, onInvoiceUpdated }: InvoicesTabProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState('');

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

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingId(invoiceId);
    try {
      const res = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          message: sendMessage.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send invoice');
      }

      toast.success('Invoice sent successfully!');
      setShowSendModal(false);
      setSendMessage('');
      setSelectedInvoiceId(null);
      
      // Update invoice status in real-time
      const updatedInvoices = invoices.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'SENT', sentAt: new Date() }
          : inv
      );
      
      setInvoices(updatedInvoices);
      
      // Notify parent component of updates
      if (onInvoiceUpdated) {
        onInvoiceUpdated(updatedInvoices);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invoice');
    } finally {
      setSendingId(null);
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
      
      toast.success('Invoice marked as sent');
      // Update in real-time
      const updatedInvoices = invoices.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'SENT' }
          : inv
      );
      
      setInvoices(updatedInvoices);
      if (onInvoiceUpdated) {
        onInvoiceUpdated(updatedInvoices);
      }
    } catch (error) {
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
      const updatedInvoices = invoices.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'PAID', paidAt: new Date() }
          : inv
      );
      
      setInvoices(updatedInvoices);
      if (onInvoiceUpdated) {
        onInvoiceUpdated(updatedInvoices);
      }
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Delete this invoice? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete invoice');
      
      toast.success('Invoice deleted');
      const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
      
      setInvoices(updatedInvoices);
      if (onInvoiceUpdated) {
        onInvoiceUpdated(updatedInvoices);
      }
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PAID: 'bg-green-100 text-green-700',
      UNPAID: 'bg-red-100 text-red-700',
      DRAFT: 'bg-gray-100 text-gray-700',
      SENT: 'bg-blue-100 text-blue-700',
      OVERDUE: 'bg-orange-100 text-orange-700',
      CANCELLED: 'bg-gray-200 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (invoices.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No invoices yet</p>
        <button 
          onClick={onCreateClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Create Invoice
        </button>
      </div>
    );
  }

  // Calculate totals
  const totalAmount = invoices.reduce((sum, inv) => {
    const itemsTotal = inv.items?.reduce((itemSum: number, item: any) => itemSum + item.total, 0) || 0;
    return sum + (inv.amount || itemsTotal);
  }, 0);

  const totalPaid = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => {
      const itemsTotal = inv.items?.reduce((itemSum: number, item: any) => itemSum + item.total, 0) || 0;
      return sum + (inv.amount || itemsTotal);
    }, 0);

  const totalUnpaid = invoices
    .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
    .reduce((sum, inv) => {
      const itemsTotal = inv.items?.reduce((itemSum: number, item: any) => itemSum + item.total, 0) || 0;
      return sum + (inv.amount || itemsTotal);
    }, 0);

  return (
    <div className="space-y-0">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-200 bg-gray-50">
        <div>
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Paid</p>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Unpaid</p>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(totalUnpaid)}</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="divide-y divide-gray-200">
        {invoices.map(invoice => {
          const itemsTotal = invoice.items?.reduce((sum: number, item: any) => sum + item.total, 0) || 0;
          const amount = invoice.amount || itemsTotal;

          return (
            <div key={invoice.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-600">{invoice.items?.length || 0} items</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</p>
                <p className="text-xs text-gray-500">
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                  disabled={downloadingId === invoice.id}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors inline-flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  {downloadingId === invoice.id ? 'Downloading...' : 'Download'}
                </button>
                {(invoice.status === 'DRAFT' || invoice.status === 'UNPAID') && (
                  <>
                    <button
                      onClick={() => handleMarkAsSent(invoice.id)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors inline-flex items-center justify-center gap-1"
                    >
                      ✓ Sent
                    </button>
                    <button
                      onClick={() => handleMarkAsPaid(invoice.id)}
                      className="flex-1 px-3 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors inline-flex items-center justify-center gap-1"
                    >
                      ✓ Paid
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors inline-flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </>
                )}
                {invoice.status === 'SENT' && (
                  <>
                    <button
                      onClick={() => handleMarkAsPaid(invoice.id)}
                      className="flex-1 px-3 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors inline-flex items-center justify-center gap-1"
                    >
                      ✓ Paid
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors inline-flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </>
                )}
                {(invoice.status === 'SENT' || invoice.status === 'UNPAID' || invoice.status === 'DRAFT') && (
                  <button
                    onClick={() => {
                      setSelectedInvoiceId(invoice.id);
                      setShowSendModal(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors inline-flex items-center justify-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Send
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Send Invoice Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Invoice</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (optional)
              </label>
              <textarea
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                placeholder="Add a personal message to the invoice email..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedInvoiceId(null);
                  setSendMessage('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedInvoiceId) {
                    handleSendInvoice(selectedInvoiceId);
                  }
                }}
                disabled={sendingId !== null}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sendingId ? 'Sending...' : 'Send Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
