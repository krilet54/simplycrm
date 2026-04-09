// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  // Basic
  title: {
    default: 'Crebo — Your business, credibly run',
    template: '%s | Crebo'
  },
  description: 'Organise your customers, track your pipeline, send invoices and follow up — all in one place. Built for small businesses in India.',
  
  // Favicon
  icons: {
    icon: '/crebo logo 2.png',
    apple: '/crebo logo 2.png',
    shortcut: '/crebo logo 2.png',
  },

  // Open Graph (WhatsApp, Facebook)
  openGraph: {
    type: 'website',
    url: 'https://crebo.io',
    title: 'Crebo — Your business, credibly run',
    description: 'Stop losing customers to disorganisation. Crebo helps small businesses organise contacts, track pipeline, and get paid faster.',
    siteName: 'Crebo',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Crebo — Your business, credibly run',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Crebo — Your business, credibly run',
    description: 'Stop losing customers to disorganisation. Organise contacts, track pipeline, get paid faster.',
    images: ['/og-image.png'],
  },

  // App meta
  applicationName: 'Crebo',
  keywords: [
    'CRM', 'small business', 'India', 
    'business CRM', 'invoice', 'customer management',
    'pipeline', 'small business India', 'CRM software'
  ],
  authors: [{ name: 'Crebo' }],
  
  // Robots
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Razorpay Checkout Script */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            },
            success: { iconTheme: { primary: '#2e8535', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
