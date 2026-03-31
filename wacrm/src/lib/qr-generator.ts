import QRCode from 'qrcode';

/**
 * Generate a wa.me QR code URL as a data URL
 */
export async function generateWaMeQR(
  phoneNumber: string,
  businessName: string,
  options: { size?: number } = {}
): Promise<string> {
  const size = options.size ?? 256;

  // Create wa.me link with pre-filled message
  const message = `Hi, I just visited ${businessName}!`;
  const waLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(waLink, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: size,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return qrCodeDataUrl;
}

/**
 * Download QR code as PNG file
 */
export async function downloadQRCode(
  phoneNumber: string,
  businessName: string,
  filename: string = 'slice-and-fire-qr.png'
): Promise<void> {
  const qrCodeDataUrl = await generateWaMeQR(phoneNumber, businessName);

  // Create blob from data URL
  const response = await fetch(qrCodeDataUrl);
  const blob = await response.blob();

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Get the wa.me link for a phone number
 */
export function getWaMeLink(phoneNumber: string, businessName: string): string {
  const message = `Hi, I just visited ${businessName}!`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}
