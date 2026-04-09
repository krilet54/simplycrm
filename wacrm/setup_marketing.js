/**
 * Marketing Pages Setup Script
 * Run with: node setup_marketing.js
 * 
 * This script creates:
 * 1. Directory structure for marketing pages
 * 2. All necessary component files
 * 3. Page files for landing, terms, privacy
 * 4. Trial cron job route
 * 
 * PREREQUISITES:
 * The following files have already been created/updated directly:
 * - src/lib/trial.ts (trial status utility)
 * - src/components/TrialBanner.tsx
 * - src/components/TrialExpiredModal.tsx
 * - prisma/schema.prisma (added trialEndsAt, trialExpired)
 * - src/app/api/onboarding/route.ts (sets trialEndsAt on creation)
 * - src/app/dashboard/layout.tsx (includes trial status)
 * - src/app/dashboard/DashboardLayoutClient.tsx (shows trial banner/modal)
 * - src/app/layout.tsx (updated meta tags)
 * - src/middleware.ts (updated for marketing routes)
 * - vercel.json (cron job config)
 */

const fs = require('fs');
const path = require('path');

const basePath = __dirname;

// Directories to create
const directories = [
    'src/app/(marketing)',
    'src/app/(marketing)/terms',
    'src/app/(marketing)/privacy',
    'src/components/marketing',
    'src/app/api/cron/trial-expiry',
    'src/lib'
];

// Files to create with their content
const files = {
    // Marketing Layout
    'src/app/(marketing)/layout.tsx': `// src/app/(marketing)/layout.tsx
// Marketing layout - no sidebar, no auth - public pages

import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
`,

    // Marketing Navigation
    'src/components/marketing/MarketingNav.tsx': `'use client';

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
            <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-display font-bold text-xl text-ink">WaCRM</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              How it works
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
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
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              How it works
            </a>
            <a
              href="#pricing"
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
`,

    // Marketing Footer
    'src/components/marketing/MarketingFooter.tsx': `import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="font-display font-bold text-xl text-ink">WaCRM</span>
            </div>
            <p className="text-gray-500 text-sm">
              Simple CRM for small businesses.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <a href="/#how-it-works" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="/#pricing" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-4">Support</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:support@wacrm.io" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
                  Contact us
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/1234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-900 text-sm transition-colors"
                >
                  WhatsApp support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} WaCRM. All rights reserved.
          </p>
          <p className="text-gray-400 text-sm">
            Made for small businesses in India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
}
`,

    // Landing Page
    'src/app/(marketing)/page.tsx': `// src/app/(marketing)/page.tsx
// Landing page for WaCRM

import Link from 'next/link';
import { Check, Users, Receipt, Briefcase, UserPlus, TrendingUp, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-[#FAFAF8]">
      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Text Content - 60% */}
            <div className="lg:col-span-3">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest-50 border border-forest-200 rounded-full text-forest-700 text-sm font-medium mb-6">
                <span>✦</span>
                <span>Built for small businesses in India</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-tight mb-6">
                Stop losing customers to a messy inbox.
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-gray-600 mb-8 max-w-xl">
                WaCRM helps small businesses organise their customers, track their pipeline, send invoices, and follow up — all in one place. No complexity. No IT team.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-forest-600 text-white font-semibold rounded-lg hover:bg-forest-700 transition-colors text-center"
                >
                  Start your free 14-day trial
                  <span aria-hidden="true">→</span>
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  See how it works
                  <ChevronDown className="w-4 h-4" />
                </a>
              </div>

              {/* Trust Line */}
              <p className="text-sm text-gray-500">
                No credit card required · Cancel anytime · Setup in 5 minutes
              </p>
            </div>

            {/* Product Visual - 40% */}
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                  {/* Simulated Dashboard Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">W</span>
                      </div>
                      <span className="font-semibold text-sm">WaCRM Dashboard</span>
                    </div>
                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Total Contacts</p>
                        <p className="text-lg font-bold text-ink">247</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Active Deals</p>
                        <p className="text-lg font-bold text-ink">₹2.4M</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Invoices Sent</p>
                        <p className="text-lg font-bold text-ink">89</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Follow-ups</p>
                        <p className="text-lg font-bold text-ink">12</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative shadow */}
                <div className="absolute -bottom-4 -right-4 w-full h-full bg-forest-200/30 rounded-2xl -z-10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <p className="text-gray-600 text-sm">
              Trusted by small businesses in Delhi, Bangalore, Mumbai, Hyderabad and beyond
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
                🍕 Food & Catering
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
                ✂️ Fashion & Tailoring
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
                🏠 Real Estate
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
                📦 Wholesale
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink text-center mb-12">
            Sound familiar?
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Card 1 */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="font-semibold text-lg text-ink mb-2">WhatsApp is a mess</h3>
              <p className="text-gray-600 text-sm">
                Leads getting lost in your personal chats. Your team sharing one phone. Customers waiting hours for a reply because you missed their message.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="text-3xl mb-4">🧠</div>
              <h3 className="font-semibold text-lg text-ink mb-2">Everything lives in your head</h3>
              <p className="text-gray-600 text-sm">
                No record of what you discussed with a customer last month. No way to know who owes you money. Deals falling through because you forgot to follow up.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="text-3xl mb-4">😵</div>
              <h3 className="font-semibold text-lg text-ink mb-2">CRMs are built for corporations</h3>
              <p className="text-gray-600 text-sm">
                Salesforce. HubSpot. You open them, see 50 menu items, and close the tab. You just need something simple that works for a 3-person team.
              </p>
            </div>
          </div>

          <p className="text-center text-lg text-forest-700 font-medium">
            WaCRM is different. Here is what it actually does.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto space-y-24">
          {/* Feature 1 - Contacts */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-forest-50 text-forest-700 text-xs font-semibold rounded-full mb-4">
                PEOPLE
              </span>
              <h3 className="font-display text-3xl font-bold text-ink mb-4">
                Every customer. One place.
              </h3>
              <p className="text-gray-600 mb-6">
                Add customers from WhatsApp, walk-ins, phone calls or referrals. See their full history — every conversation, invoice, and note — the moment you open their profile.
              </p>
              <p className="text-gray-600 mb-6">
                Move them through your pipeline from New Lead to Closed with a simple drag and drop.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  Add offline walk-in customers
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  Track deal value per customer
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  See full history in one click
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <Users className="w-10 h-10 text-forest-600 mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Money */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <Receipt className="w-10 h-10 text-forest-600 mb-3" />
                <div className="text-2xl font-bold text-ink mb-2">₹2,34,000</div>
                <p className="text-sm text-gray-500">Outstanding invoices</p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full mb-4">
                MONEY
              </span>
              <h3 className="font-display text-3xl font-bold text-ink mb-4">
                Get paid faster.
              </h3>
              <p className="text-gray-600 mb-6">
                Create professional invoices in 30 seconds. Send them via WhatsApp with one click. When customers pay online through Paystack, your invoice marks itself as paid automatically.
              </p>
              <p className="text-gray-600 mb-6">
                See exactly who owes you money right now — no spreadsheet needed.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  Professional invoices in seconds
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  Online payment links via Paystack
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  Auto-updated when customer pays
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3 - Team */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-4">
                TEAM
              </span>
              <h3 className="font-display text-3xl font-bold text-ink mb-4">
                Your whole team. One system.
              </h3>
              <p className="text-gray-600 mb-6">
                Assign customers to team members with a note. They get an email telling them exactly what to do. Set follow-up reminders so no lead falls through the cracks.
              </p>
              <p className="text-gray-600 mb-6">
                Ahmed sees everything. Tolu sees her work. Nobody steps on each other.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  Assign contacts to agents
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  Email notifications on assignment
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-forest-600" />
                  Follow-up reminders per contact
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <Briefcase className="w-10 h-10 text-forest-600 mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-4">
              Up and running in 5 minutes
            </h2>
            <p className="text-gray-600">
              No IT team. No training. No technical setup.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-forest-50 rounded-2xl mb-6">
                <span className="font-display text-2xl font-bold text-forest-600">01</span>
              </div>
              <UserPlus className="w-8 h-8 text-forest-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-ink mb-2">Create your account</h3>
              <p className="text-gray-600 text-sm">
                Sign up with your email. Tell us your business name. That is it. You are in.
              </p>
            </div>

            {/* Arrow (desktop only) */}
            <div className="hidden md:block absolute left-1/3 top-1/2 transform -translate-y-1/2">
              {/* Arrow connector would go here */}
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-forest-50 rounded-2xl mb-6">
                <span className="font-display text-2xl font-bold text-forest-600">02</span>
              </div>
              <Users className="w-8 h-8 text-forest-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-ink mb-2">Add your customers</h3>
              <p className="text-gray-600 text-sm">
                Add contacts manually or let them come in automatically. Each one gets a full profile.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-forest-50 rounded-2xl mb-6">
                <span className="font-display text-2xl font-bold text-forest-600">03</span>
              </div>
              <TrendingUp className="w-8 h-8 text-forest-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-ink mb-2">Run your business</h3>
              <p className="text-gray-600 text-sm">
                Track your pipeline, send invoices, set follow-ups, and delegate work to your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-4">
              Simple pricing. No surprises.
            </h2>
            <p className="text-gray-600">
              Start free for 14 days. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Trial */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full mb-4">
                Start here
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-ink">FREE</span>
                <p className="text-gray-500 text-sm mt-1">14 days, full access</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Full access to all features
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Up to 3 team members
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Unlimited contacts
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Unlimited invoices
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Email support
                </li>
              </ul>
              <Link
                href="/login?mode=signup"
                className="block text-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Start free trial →
              </Link>
            </div>

            {/* Starter - Most Popular */}
            <div className="bg-white rounded-2xl border-2 border-forest-600 p-8 relative shadow-lg">
              <div className="absolute -top-3 right-6 px-3 py-1 bg-forest-600 text-white text-xs font-semibold rounded-full">
                Most popular
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-ink">₹499</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Everything in Free trial
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Up to 3 team members
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Unlimited contacts
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Unlimited invoices
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Paystack payment links
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Email notifications
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Data export (CSV)
                </li>
              </ul>
              <Link
                href="/login?mode=signup"
                className="block text-center px-6 py-3 bg-forest-600 text-white font-semibold rounded-lg hover:bg-forest-700 transition-colors"
              >
                Start free trial →
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="mb-6">
                <span className="text-4xl font-bold text-ink">₹1,299</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Everything in Starter
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Unlimited team members
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Priority support
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Advanced reports
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  WhatsApp integration
                  <span className="text-xs text-gray-400 ml-1">Coming soon</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-forest-600" />
                  Custom invoice branding
                  <span className="text-xs text-gray-400 ml-1">Coming soon</span>
                </li>
              </ul>
              <Link
                href="/login?mode=signup"
                className="block text-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Start free trial →
              </Link>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            All plans include a 14-day free trial. Cancel anytime. No contracts. Prices in Indian Rupees (₹). Billed via Stripe.
          </p>

          {/* FAQ */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h3 className="font-display text-xl font-bold text-ink text-center mb-8">
              Frequently asked questions
            </h3>
            <div className="space-y-4">
              <details className="group bg-gray-50 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-gray-900">
                  Do I need a credit card to start?
                  <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600">
                  No. Sign up and use WaCRM free for 14 days. We only ask for payment details when your trial ends and you choose to continue.
                </div>
              </details>
              <details className="group bg-gray-50 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-gray-900">
                  Can I change plans later?
                  <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600">
                  Yes, upgrade or downgrade anytime from your Settings page. Changes take effect immediately.
                </div>
              </details>
              <details className="group bg-gray-50 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-gray-900">
                  What happens when my trial ends?
                  <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600">
                  You will see a prompt to choose a plan. Your data is always safe — we never delete anything. If you choose not to subscribe, your account goes into read-only mode for 30 days before data deletion.
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-forest-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
            Your business deserves better than a messy inbox.
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Join hundreds of small business owners who use WaCRM to stay organised, follow up consistently, and get paid faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-forest-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start your free trial
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Talk to us on WhatsApp
            </a>
          </div>
          <p className="text-white/50 text-sm">
            No credit card · Free for 14 days · Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
`,

    // Terms Page
    'src/app/(marketing)/terms/page.tsx': `// src/app/(marketing)/terms/page.tsx
// Terms of Service page

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for WaCRM - Simple CRM for Small Businesses',
};

export default function TermsPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold text-ink mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: April 2025 · 5 minute read
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-8">
            These terms govern your use of WaCRM. By creating an account, you agree to these terms. 
            If you disagree, please do not use WaCRM.
          </p>
          <p className="text-gray-600 mb-8">
            We have written these in plain English because we believe you deserve to understand 
            what you are agreeing to.
          </p>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">1. What WaCRM is</h2>
            <p className="text-gray-600">
              WaCRM is a customer relationship management tool for small businesses. It helps you 
              organise contacts, track your sales pipeline, create invoices, and manage your team&apos;s work.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">2. Your account</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>You must be 18 or older to create an account</li>
              <li>You are responsible for keeping your password secure</li>
              <li>You are responsible for all activity on your account</li>
              <li>One account per business — do not share accounts between businesses</li>
              <li>You must provide accurate information when signing up</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">3. Your data</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>You own your data. Always.</li>
              <li>We store it securely on your behalf.</li>
              <li>We never sell your data to third parties.</li>
              <li>We never use your customers&apos; data for advertising.</li>
              <li>You can export your data at any time from Settings.</li>
              <li>You can delete your account and all data at any time from Settings.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">4. What you can and cannot do</h2>
            <p className="text-gray-700 font-medium mb-3">You CAN:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Use WaCRM for any legitimate business</li>
              <li>Invite team members to your workspace</li>
              <li>Export and download your data</li>
              <li>Cancel your subscription at any time</li>
            </ul>
            <p className="text-gray-700 font-medium mb-3">You CANNOT:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Use WaCRM to send spam or unsolicited messages</li>
              <li>Use WaCRM for illegal activities</li>
              <li>Attempt to access other users&apos; data</li>
              <li>Reverse engineer or copy the software</li>
              <li>Resell or white-label WaCRM without written permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">5. Payments and billing</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Subscriptions are billed monthly via Stripe</li>
              <li>Your trial is free for 14 days with no card required</li>
              <li>After your trial, a subscription is required to continue</li>
              <li>You can cancel anytime — cancellation takes effect at the end of your current billing period</li>
              <li>We do not offer refunds for partial months except where required by law</li>
              <li>Prices are in Indian Rupees (₹) and may change with 30 days notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">6. Third party services</h2>
            <p className="text-gray-600 mb-4">WaCRM integrates with:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Supabase (authentication and database)</li>
              <li>Stripe (payment processing)</li>
              <li>Resend (email delivery)</li>
              <li>Paystack (invoice payments — optional)</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Each service has its own terms. Your use of these services through WaCRM is subject to their terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">7. Uptime and reliability</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>We aim for 99.9% uptime but cannot guarantee it</li>
              <li>We are not liable for losses caused by downtime or data loss</li>
              <li>We will notify users of planned maintenance in advance</li>
              <li>We back up data regularly but recommend you export your data periodically</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">8. Limitation of liability</h2>
            <p className="text-gray-600">
              WaCRM is provided as-is. We are not liable for indirect, incidental, or consequential damages. 
              Our total liability is limited to the amount you paid us in the last 3 months.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">9. Changes to these terms</h2>
            <p className="text-gray-600">
              We may update these terms. We will notify you by email and in-app notification at least 
              14 days before changes take effect. Continuing to use WaCRM after changes means you accept the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">10. Contact</h2>
            <p className="text-gray-600">
              For questions about these terms:
            </p>
            <ul className="list-none space-y-2 text-gray-600 mt-2">
              <li>Email: <a href="mailto:support@wacrm.io" className="text-forest-600 hover:underline">support@wacrm.io</a></li>
              <li>WhatsApp: <a href="https://wa.me/1234567890" className="text-forest-600 hover:underline">+1234567890</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
`,

    // Privacy Page
    'src/app/(marketing)/privacy/page.tsx': `// src/app/(marketing)/privacy/page.tsx
// Privacy Policy page

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for WaCRM - Simple CRM for Small Businesses',
};

export default function PrivacyPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold text-ink mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: April 2025
          </p>
          <p className="text-gray-600 mt-4">
            We keep this short and readable because your privacy matters.
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">1. What we collect</h2>
            
            <p className="text-gray-700 font-medium mb-3">Information you give us:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Name and email when you sign up</li>
              <li>Business name and details</li>
              <li>Contact information for your customers (names, phone numbers, emails)</li>
              <li>Invoice and financial data you enter</li>
              <li>Notes and activity logs you create</li>
            </ul>

            <p className="text-gray-700 font-medium mb-3">Information collected automatically:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Your IP address</li>
              <li>Browser type and version</li>
              <li>Pages you visit within WaCRM</li>
              <li>Actions you take (for bug fixing)</li>
              <li>Time and date of actions</li>
            </ul>

            <p className="text-gray-700 font-medium mb-3">We do NOT collect:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Payment card details (Stripe handles this directly)</li>
              <li>Biometric data</li>
              <li>Location data beyond country level</li>
              <li>Any data from people who have not interacted with WaCRM</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">2. How we use your data</h2>
            
            <p className="text-gray-700 font-medium mb-3">To run the service:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Power your CRM and all its features</li>
              <li>Send you transactional emails (password reset, invoice paid, etc.)</li>
              <li>Send you notification emails (morning digest, assignments, etc.)</li>
            </ul>

            <p className="text-gray-700 font-medium mb-3">To improve the service:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Understand how features are used</li>
              <li>Fix bugs and improve performance</li>
              <li>Build new features users actually need</li>
            </ul>

            <p className="text-gray-700 font-medium mb-3">We NEVER:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Sell your data to anyone</li>
              <li>Use your data for advertising</li>
              <li>Share your customers&apos; data with third parties (except as below)</li>
              <li>Use your data to train AI models</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">3. Who we share data with</h2>
            <p className="text-gray-600 mb-4">
              We share minimal data with these services to operate WaCRM:
            </p>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 font-medium">Supabase (supabase.com)</p>
                <ul className="list-disc pl-6 text-gray-600 text-sm">
                  <li>Purpose: database and authentication</li>
                  <li>Data: your account and all CRM data</li>
                  <li>Location: their secure cloud servers</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-700 font-medium">Stripe (stripe.com)</p>
                <ul className="list-disc pl-6 text-gray-600 text-sm">
                  <li>Purpose: subscription billing</li>
                  <li>Data: your email, subscription status</li>
                  <li>NOT your CRM or customer data</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-700 font-medium">Resend (resend.com)</p>
                <ul className="list-disc pl-6 text-gray-600 text-sm">
                  <li>Purpose: sending emails</li>
                  <li>Data: your email address and email content we generate</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-700 font-medium">Vercel (vercel.com)</p>
                <ul className="list-disc pl-6 text-gray-600 text-sm">
                  <li>Purpose: hosting the application</li>
                  <li>Data: server logs only</li>
                </ul>
              </div>
            </div>

            <p className="text-gray-600 mt-4 font-medium">
              Nobody else. That is the complete list.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">4. Your rights</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            
            <div className="space-y-3">
              <div>
                <p className="text-gray-700 font-medium">Access your data:</p>
                <p className="text-gray-600 text-sm">Export all your data anytime from Settings → Export Data.</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Correct your data:</p>
                <p className="text-gray-600 text-sm">Edit your profile and business details in Settings at any time.</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Delete your data:</p>
                <p className="text-gray-600 text-sm">Delete your account from Settings → Danger Zone. All data is permanently deleted within 30 days.</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Portability:</p>
                <p className="text-gray-600 text-sm">Download your data as CSV files from Settings.</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Object to processing:</p>
                <p className="text-gray-600 text-sm">Email us at support@wacrm.io and we will address your request within 72 hours.</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">5. Data security</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>All data is encrypted in transit (HTTPS/TLS)</li>
              <li>Sensitive fields (API keys, tokens) are encrypted at rest</li>
              <li>Passwords are never stored — Supabase handles authentication</li>
              <li>We conduct regular security reviews</li>
              <li>Access to production data is restricted to essential personnel only</li>
              <li>We will notify you within 72 hours of any data breach that affects you</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">6. Data retention</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Active accounts: data kept as long as your account is active</li>
              <li>Cancelled subscriptions: data kept for 30 days in read-only mode, then permanently deleted</li>
              <li>Deleted accounts: all data permanently deleted within 30 days</li>
              <li>Backup systems: purged within 90 days</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">7. Cookies</h2>
            <p className="text-gray-600 mb-4">WaCRM uses minimal cookies:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Authentication cookie (required) — keeps you logged in</li>
              <li>Session cookie (required) — security and functionality</li>
            </ul>
            <p className="text-gray-700 font-medium mb-3">We do NOT use:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Advertising cookies</li>
              <li>Tracking pixels</li>
              <li>Third-party analytics cookies</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You can clear cookies in your browser settings — this will log you out.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">8. Children</h2>
            <p className="text-gray-600">
              WaCRM is not intended for anyone under 18. We do not knowingly collect data from minors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">9. Changes</h2>
            <p className="text-gray-600">
              We will notify you by email at least 14 days before any significant changes to this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">10. Contact</h2>
            <p className="text-gray-600 mb-2">
              Data controller: WaCRM
            </p>
            <ul className="list-none space-y-2 text-gray-600">
              <li>Email: <a href="mailto:support@wacrm.io" className="text-forest-600 hover:underline">support@wacrm.io</a></li>
              <li>WhatsApp: <a href="https://wa.me/1234567890" className="text-forest-600 hover:underline">+1234567890</a></li>
            </ul>
            <p className="text-gray-600 mt-4">
              For GDPR requests or privacy concerns, email us and we will respond within 72 hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
`,

    // Trial Utility
    'src/lib/trial.ts': `// src/lib/trial.ts
// Trial status utility for checking workspace trial/subscription status

export type TrialStatus = {
  status: 'trial' | 'expired' | 'subscribed';
  daysLeft: number | null;
};

export function getTrialStatus(workspace: {
  trialEndsAt: Date | null;
  plan: string;
  stripeSubscriptionId: string | null;
}): TrialStatus {
  // If they have an active paid subscription, trial status is irrelevant
  if (workspace.stripeSubscriptionId) {
    return { status: 'subscribed', daysLeft: null };
  }

  if (!workspace.trialEndsAt) {
    return { status: 'expired', daysLeft: 0 };
  }

  const now = new Date();
  const daysLeft = Math.ceil(
    (workspace.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft > 0) {
    return { status: 'trial', daysLeft };
  }

  return { status: 'expired', daysLeft: 0 };
}

export function shouldShowTrialBanner(daysLeft: number | null): boolean {
  if (daysLeft === null) return false;
  return daysLeft <= 7 && daysLeft > 0;
}

export function getTrialBannerVariant(daysLeft: number): 'warning' | 'danger' {
  return daysLeft <= 3 ? 'danger' : 'warning';
}
`,

    // Trial Banner Component
    'src/components/TrialBanner.tsx': `'use client';

import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';

interface TrialBannerProps {
  daysLeft: number;
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const isUrgent = daysLeft <= 3;

  if (daysLeft > 7) return null;

  return (
    <div
      className={\`px-4 py-3 text-sm flex items-center justify-between gap-4 \${
        isUrgent
          ? 'bg-red-50 text-red-800 border-b border-red-100'
          : 'bg-amber-50 text-amber-800 border-b border-amber-100'
      }\`}
    >
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Clock className="w-4 h-4 flex-shrink-0" />
        )}
        <span>
          {isUrgent
            ? \`⚠️ Trial ending in \${daysLeft} day\${daysLeft === 1 ? '' : 's'}! Subscribe now to avoid losing access.\`
            : \`⏳ Your free trial ends in \${daysLeft} days. Choose a plan to keep your data.\`}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/dashboard/settings#billing"
          className={\`font-medium hover:underline \${
            isUrgent ? 'text-red-900' : 'text-amber-900'
          }\`}
        >
          {isUrgent ? 'Choose a plan →' : 'View plans →'}
        </Link>
        {isUrgent && (
          <Link
            href="/dashboard/settings#export"
            className="text-red-700 hover:underline text-xs"
          >
            Export my data
          </Link>
        )}
      </div>
    </div>
  );
}
`,

    // Trial Expired Modal
    'src/components/TrialExpiredModal.tsx': `'use client';

import Link from 'next/link';

export function TrialExpiredModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-ink mb-4">
          Your free trial has ended.
        </h2>
        <p className="text-gray-600 mb-2">
          Thank you for trying WaCRM! Choose a plan to keep your data and continue working.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Your data is safe. We never delete anything without 30 days notice.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Starter Plan */}
          <div className="border border-gray-200 rounded-xl p-6 hover:border-forest-600 transition-colors">
            <h3 className="font-semibold text-lg text-ink mb-1">STARTER</h3>
            <p className="text-2xl font-bold text-ink mb-4">
              $9<span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
            <Link
              href="/dashboard/settings#billing"
              className="block w-full px-4 py-2 bg-forest-600 text-white font-medium rounded-lg hover:bg-forest-700 transition-colors"
            >
              Choose
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="border border-gray-200 rounded-xl p-6 hover:border-forest-600 transition-colors">
            <h3 className="font-semibold text-lg text-ink mb-1">PRO</h3>
            <p className="text-2xl font-bold text-ink mb-4">
              $25<span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
            <Link
              href="/dashboard/settings#billing"
              className="block w-full px-4 py-2 bg-forest-600 text-white font-medium rounded-lg hover:bg-forest-700 transition-colors"
            >
              Choose
            </Link>
          </div>
        </div>

        <Link
          href="/dashboard/settings#export"
          className="text-gray-500 hover:text-gray-700 text-sm hover:underline"
        >
          Export my data before deciding →
        </Link>
      </div>
    </div>
  );
}
`,

    // Cron Job for Trial Expiry
    'src/app/api/cron/trial-expiry/route.ts': `// src/app/api/cron/trial-expiry/route.ts
// Cron job to send trial expiry emails
// Runs daily at 8am via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization');
  if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find workspaces whose trial expired in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const expiredWorkspaces = await db.workspace.findMany({
      where: {
        trialEndsAt: {
          gte: yesterday,
          lte: now,
        },
        stripeSubscriptionId: null, // Not subscribed
      },
      include: {
        users: {
          where: { role: 'OWNER' },
          select: { name: true, email: true },
        },
        _count: {
          select: {
            contacts: true,
            invoices: true,
            tasks: { where: { status: 'DONE' } },
          },
        },
      },
    });

    // Send emails
    const results = await Promise.allSettled(
      expiredWorkspaces.map(async (workspace) => {
        const owner = workspace.users[0];
        if (!owner) return;

        await resend.emails.send({
          from: 'WaCRM <noreply@wacrm.io>',
          to: owner.email,
          subject: 'Your WaCRM trial has ended — your data is safe',
          html: \`
            <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <p>Hi \${owner.name || 'there'},</p>
              
              <p>Your 14-day free trial of WaCRM ended today.</p>
              
              <p><strong>Your data is safe.</strong> We will keep everything for 30 days while you decide.</p>
              
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-weight: 600;">What you have built:</p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>\${workspace._count.contacts} contacts added</li>
                  <li>\${workspace._count.invoices} invoices created</li>
                  <li>\${workspace._count.tasks} tasks completed</li>
                </ul>
              </div>
              
              <p>To keep everything and continue:</p>
              
              <p style="text-align: center;">
                <a href="\${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings#billing" 
                   style="display: inline-block; background: #1e6926; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Choose a plan →
                </a>
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
                If you need more time or have questions, just reply to this email or WhatsApp us. 
                We are a small team and we read every message.
              </p>
              
              <p style="color: #6b7280;">
                — The WaCRM Team
              </p>
            </div>
          \`,
        });
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: expiredWorkspaces.length,
    });
  } catch (error) {
    console.error('Trial expiry cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process trial expiry' },
      { status: 500 }
    );
  }
}
`,
};

// Create directories and files
console.log('Creating directories...');
directories.forEach(dir => {
    const fullPath = path.join(basePath, dir);
    try {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log('✓ Created:', dir);
    } catch (err) {
        console.log('  Already exists:', dir);
    }
});

// Also create standalone terms and privacy directories (for direct routes)
['src/app/terms', 'src/app/privacy'].forEach(dir => {
    const fullPath = path.join(basePath, dir);
    try {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log('✓ Created:', dir);
    } catch (err) {
        console.log('  Already exists:', dir);
    }
});

console.log('\nCreating files...');
Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(basePath, filePath);
    try {
        fs.writeFileSync(fullPath, content);
        console.log('✓ Created:', filePath);
    } catch (err) {
        console.error('✗ Failed:', filePath, err.message);
    }
});

console.log('\n✅ Setup complete!');
console.log('\nThe following files were already updated by the AI assistant:');
console.log('  - prisma/schema.prisma (added trialEndsAt, trialExpired)');
console.log('  - src/lib/trial.ts (trial status utility)');
console.log('  - src/components/TrialBanner.tsx');
console.log('  - src/components/TrialExpiredModal.tsx');
console.log('  - src/app/api/onboarding/route.ts (sets trialEndsAt)');
console.log('  - src/app/dashboard/layout.tsx (includes trial status)');
console.log('  - src/app/dashboard/DashboardLayoutClient.tsx (shows banner/modal)');
console.log('  - src/app/layout.tsx (updated meta tags)');
console.log('  - src/app/page.tsx (landing page for non-auth users)');
console.log('  - src/middleware.ts (public routes)');
console.log('  - vercel.json (cron job config)');
console.log('\nNext steps:');
console.log('1. Run: npx prisma db push (to add trial fields to database)');
console.log('2. Add CRON_SECRET to your .env file');
console.log('3. Run: npm run dev');
console.log('4. Visit http://localhost:3000 to see the landing page!');
