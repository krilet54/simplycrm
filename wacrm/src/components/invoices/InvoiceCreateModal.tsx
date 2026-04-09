// src/components/invoices/InvoiceCreateModal.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, Download } from 'lucide-react';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceCreateModalProps {
  contact: {
    id: string;
    name: string | null;
    phoneNumber: string;
    email: string | null;
  };
  onClose: () => void;
  onSuccess: (invoice: any) => void;
}

export default function InvoiceCreateModal({
  contact,
  onClose,
  onSuccess,
}: InvoiceCreateModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    notes: '',
    dueDate: '',
    invoiceNumber: `INV-${Date.now()}`.slice(0, 15),
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!createdInvoiceId) return;
    setDownloadLoading(true);
    try {
      await downloadInvoicePDF(createdInvoiceId, formData.invoiceNumber);
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download invoice');
      console.error(error);
    } finally {
      setDownloadLoading(false);
    }
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.invoiceNumber.trim()) {
      toast.error('Invoice number is required');
      return;
    }

    if (lineItems.some(item => !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast.error('All line items must have description, quantity, and price');
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      toast.error('Invoice total must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          invoiceNumber: formData.invoiceNumber.trim(),
          description: formData.description.trim(),
          amount: total,
          items: lineItems.map(item => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create invoice');
      }

      const result = await res.json();
      setCreatedInvoiceId(result.invoice.id);
      toast.success('Invoice created successfully!');
      onSuccess(result.invoice);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Client Information (Read-only) */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Client Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Name:</span>
                <span className="text-blue-900 ml-2">{contact.name || 'Unnamed'}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Phone:</span>
                <span className="text-blue-900 ml-2">{contact.phoneNumber}</span>
              </div>
              {contact.email && (
                <div>
                  <span className="text-blue-700 font-medium">Email:</span>
                  <span className="text-blue-900 ml-2">{contact.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.invoiceNumber}
              onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              placeholder="INV-001"
            />
          </div>

          {/* Overall Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              placeholder="e.g., Web Design Services, Consulting Project"
            />
            <p className="text-xs text-gray-500 mt-1">Brief summary of what this invoice is for</p>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                Line Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-forest-600 hover:bg-forest-50 rounded"
              >
                <Plus className="w-3 h-3" />
                Add Item
              </button>
            </div>

            <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                      placeholder="Service or product description"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-600 mb-1 block">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-gray-600 mb-1 block">Unit Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-gray-600 mb-1 block">Total</label>
                    <div className="px-2 py-2 bg-white border border-gray-200 rounded text-sm font-medium text-gray-900">
                      ₹{(item.quantity * item.unitPrice).toLocaleString('en-US')}
                    </div>
                  </div>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Subtotal */}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                  <span className="text-sm font-semibold text-gray-900">₹{total.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-base font-bold text-gray-900">Total:</span>
                  <span className="text-base font-bold text-forest-600">₹{total.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Terms, payment instructions, thank you message, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 resize-none"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Close
            </button>
            {createdInvoiceId ? (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={downloadLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {downloadLoading ? 'Downloading...' : 'Download PDF'}
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-forest-600 text-white rounded-lg hover:bg-forest-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
