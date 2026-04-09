/**
 * Utility functions for invoice PDF generation and download
 */

/**
 * Download invoice as HTML to PDF
 * Uses browser's built-in print-to-PDF functionality
 */
export async function downloadInvoicePDF(invoiceId: string, invoiceNumber: string) {
  try {
    // Fetch the invoice HTML from our API
    const response = await fetch(`/api/invoices/download?id=${invoiceId}&format=pdf`);
    if (!response.ok) throw new Error('Failed to fetch invoice');
    
    const data = await response.json();
    const html = data.html;

    // Create a temporary iframe to render the HTML
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Write HTML to iframe
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Failed to access iframe document');

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for content to fully load
    iframe.onload = () => {
      try {
        // Trigger browser print dialog with PDF option
        iframe.contentWindow?.print();
      } catch (error) {
        console.error('Print error:', error);
        // Remove iframe if print fails
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }
    };

    // Fallback: remove iframe after 5 seconds if onload doesn't fire
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);
  } catch (error) {
    console.error('PDF download failed:', error);
    // Fallback: open invoice in new window for user to print
    window.open(`/api/invoices/download?id=${invoiceId}&format=html`, '_blank');
  }
}

/**
 * Download invoice as HTML file
 */
export async function downloadInvoiceHTML(invoiceId: string, invoiceNumber: string) {
  try {
    const response = await fetch(`/api/invoices/download?id=${invoiceId}&format=html`);
    if (!response.ok) throw new Error('Failed to fetch invoice');

    const html = await response.text();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('HTML download failed:', error);
    throw error;
  }
}

/**
 * Get invoice HTML for display or printing
 */
export async function getInvoiceHTML(invoiceId: string): Promise<string> {
  try {
    const response = await fetch(`/api/invoices/download?id=${invoiceId}&format=pdf`);
    if (!response.ok) throw new Error('Failed to fetch invoice');
    const data = await response.json();
    return data.html;
  } catch (error) {
    console.error('Failed to get invoice HTML:', error);
    throw error;
  }
}

/**
 * Get invoice as base64 for email attachment
 */
export async function getInvoicePDFBase64(invoiceId: string, invoiceNumber: string): Promise<string> {
  try {
    // Get the invoice HTML
    const html = await getInvoiceHTML(invoiceId);
    
    // Return HTML as base64
    // The email sending will handle conversion or embedding
    const htmlBase64 = btoa(unescape(encodeURIComponent(html)));
    return htmlBase64;
  } catch (error) {
    console.error('Failed to get invoice PDF base64:', error);
    throw error;
  }
}
