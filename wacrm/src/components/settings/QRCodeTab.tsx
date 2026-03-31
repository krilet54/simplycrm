'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { generateWaMeQR, downloadQRCode, getWaMeLink } from '@/lib/qr-generator';

interface Props {
  workspace: {
    id: string;
    businessName: string;
    whatsappPhoneNumberId?: string | null;
  };
}

export default function QRCodeTab({ workspace }: Props) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate QR code when component mounts or phoneNumberId changes
  useEffect(() => {
    if (workspace.whatsappPhoneNumberId) {
      generateQRCode();
    }
  }, [workspace.whatsappPhoneNumberId]);

  async function generateQRCode() {
    if (!workspace.whatsappPhoneNumberId) return;
    setLoading(true);
    try {
      const qr = await generateWaMeQR(
        workspace.whatsappPhoneNumberId,
        workspace.businessName,
        { size: 256 }
      );
      setQrCode(qr);
    } catch (err) {
      toast.error('Failed to generate QR code');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!workspace.whatsappPhoneNumberId) return;
    try {
      await downloadQRCode(
        workspace.whatsappPhoneNumberId,
        workspace.businessName,
        'slice-and-fire-qr.png'
      );
      toast.success('QR code downloaded!');
    } catch (err) {
      toast.error('Failed to download QR code');
      console.error(err);
    }
  }

  async function handleCopyLink() {
    if (!workspace.whatsappPhoneNumberId) return;
    const link = getWaMeLink(workspace.whatsappPhoneNumberId, workspace.businessName);
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  }

  if (!workspace.whatsappPhoneNumberId) {
    return (
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          QR Code
        </h2>
        <p className="text-sm text-gray-500 mb-6">Generate a scannable QR code for customers to start WhatsApp conversations.</p>

        <div className="card p-5 text-center">
          <div className="text-4xl mb-3">📳</div>
          <h3 className="font-semibold text-gray-900 mb-2">WhatsApp Not Connected</h3>
          <p className="text-sm text-gray-500 mb-4">
            Connect your WhatsApp number in the <strong>WhatsApp tab</strong> first.
          </p>
          <button
            onClick={() => {
              // This would need to be passed from parent or use context to navigate to WhatsApp tab
              window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'whatsapp' }));
            }}
            className="btn-primary"
          >
            Go to WhatsApp Settings
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
        QR Code
      </h2>
      <p className="text-sm text-gray-500 mb-6">Generate a scannable QR code for customers to start WhatsApp conversations.</p>

      {/* QR Code Display */}
      <div className="card p-8 text-center mb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 0 20" opacity="1"/>
              </svg>
            </div>
          </div>
        ) : qrCode ? (
          <>
            <img
              src={qrCode}
              alt="WhatsApp QR Code"
              className="w-64 h-64 mx-auto mb-6 border-4 border-gray-200 rounded-lg"
            />
            <p className="text-sm text-gray-500 mb-4">
              Scan this code to start a WhatsApp conversation with {workspace.businessName}
            </p>
          </>
        ) : null}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleDownload}
          disabled={!qrCode}
          className="btn-primary flex-1 justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download QR Code
        </button>
        <button
          onClick={handleCopyLink}
          disabled={!qrCode}
          className="btn-secondary flex-1 justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          Copy Link
        </button>
      </div>

      {/* Info Box */}
      <div className="card p-5 bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          💡 How to use
        </h3>
        <ul className="text-sm text-blue-800 space-y-1.5">
          <li>📋 <strong>Print</strong> the QR code and place it at your counter or storefront</li>
          <li>📱 <strong>Customers scan</strong> the code with their phone</li>
          <li>💬 Their <strong>message appears in your inbox</strong> automatically</li>
          <li>🆓 <strong>Free!</strong> Customer initiates the chat, so replies are free within 24 hours</li>
        </ul>
      </div>
    </section>
  );
}
