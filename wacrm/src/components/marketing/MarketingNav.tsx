'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#FAFAF8]/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-ink">Crebo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="/#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              How it works
            </a>
            <a href="/#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              Pricing
            </a>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center gap-1 px-4 py-2 bg-forest-600 text-white text-sm font-semibold rounded-lg hover:bg-forest-700 transition-colors"
            >
              Start free trial
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center px-3 py-1.5 bg-forest-600 text-white text-sm font-semibold rounded-lg hover:bg-forest-700 transition-colors"
            >
              Start free
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-[#FAFAF8]">
          <div className="px-4 py-4 space-y-3">
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              How it works
            </a>
            <a
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Pricing
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
