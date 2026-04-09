'use client';

import { useState } from 'react';
import { X, HelpCircle, Mail, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HelpPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async () => {
    if (!formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // For now, just log to console and show success
      // In production, this would call an API endpoint
      console.log('📧 Support Message:', {
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        timestamp: new Date().toISOString(),
      });

      // Simulate successful submission
      toast.success('Message sent! We\'ll get back to you soon.');
      setFormData({ email: '', subject: '', message: '' });
      setShowEmailForm(false);
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappNumber = '+919060868026';
  const whatsappMessage = 'Hi, I need help with Crebo!';
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <>
      {/* Help Button - In Navbar */}
      <button
        onClick={() => setIsOpen(true)}
        title="Get Help"
        className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Help Panel Modal */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel - Positioned from top right */}
          <div className="fixed top-16 right-6 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">How can we help?</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {!showEmailForm ? (
              <div className="p-4 space-y-3">
                {/* Email Support */}
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left border border-gray-200"
                >
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Email Support</p>
                    <p className="text-xs text-gray-600">Send us a message</p>
                  </div>
                </button>

                {/* WhatsApp */}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left border border-gray-200"
                >
                  <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">WhatsApp</p>
                    <p className="text-xs text-gray-600">Chat directly with us</p>
                  </div>
                </a>

                {/* Divider */}
                <div className="text-xs text-gray-500 text-center py-2">or</div>

                {/* FAQ */}
                <button className="w-full p-3 hover:bg-gray-50 rounded-lg transition-colors text-left border border-gray-200">
                  <p className="font-medium text-gray-900 text-sm">Documentation</p>
                  <p className="text-xs text-gray-600">Coming soon</p>
                </button>
              </div>
            ) : (
              /* Email Form */
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setShowEmailForm(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 mb-2"
                >
                  ← Back
                </button>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What's this about?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us more..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleEmailSubmit}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
