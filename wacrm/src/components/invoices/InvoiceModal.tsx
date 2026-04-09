'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Plus, Trash2 } from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice: any) => void;
  contacts: Array<{ id: string; name: string; phoneNumber: string }>;
  preselectedContactId?: string;
}

export default function InvoiceModal({ isOpen, onClose, onSuccess, contacts, preselectedContactId }: InvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [contactId, setContactId] = useState(preselectedContactId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showContactList, setShowContactList] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [dueDate, setDueDate] = useState('');
  const contactListRef = useRef<HTMLDivElement>(null);

  // Reset contact when modal opens with preselectedContactId
  useEffect(() => {
    if (isOpen && preselectedContactId) {
      setContactId(preselectedContactId);
    }
  }, [isOpen, preselectedContactId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactListRef.current && !contactListRef.current.contains(event.target as Node)) {
        setShowContactList(false);
      }
    }

    if (showContactList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContactList]);

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm)
  );

  const selectedContact = contacts.find(c => c.id === contactId);

  const handleSelectContact = (id: string) => {
    setContactId(id);
    setShowContactList(false);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!contactId) {
      toast.error('Please select a contact');
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error('Invoice number is required');
      return;
    }
    if (items.some(item => !item.description.trim())) {
      toast.error('All items must have a description');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          invoiceNumber,
          description,
          items: items.map(item => ({
            description: item.description,
            quantity: parseInt(String(item.quantity)),
            unitPrice: parseFloat(String(item.unitPrice)),
            total: item.quantity * item.unitPrice,
          })),
          amount: totalAmount,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Invoice created successfully!');
        onClose();
        onSuccess?.(data.invoice);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Create Invoice</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact - Searchable Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Contact</label>
            <div className="relative" ref={contactListRef}>
              {/* Search Input */}
              <input
                type="text"
                placeholder={selectedContact ? `${selectedContact.name} (${selectedContact.phoneNumber})` : 'Search contact by name or phone...'}
                value={showContactList ? searchTerm : ''}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowContactList(true);
                }}
                onFocus={() => setShowContactList(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Dropdown List */}
              {showContactList && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center py-4">
                      No contacts found
                    </div>
                  ) : (
                    filteredContacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact.id)}
                        className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between ${
                          contact.id === contactId ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium text-gray-900">{contact.name}</div>
                          <div className="text-xs text-gray-500">{contact.phoneNumber}</div>
                        </div>
                        {contact.id === contactId && (
                          <div className="text-blue-500 font-bold">✓</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Invoice Number</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Invoice description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-900">Items</label>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="Price"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">Subtotal:</p>
                  <p className="font-medium">₹{totalAmount.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
                  <p>Total:</p>
                  <p>₹{totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Due Date (Optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
