// src/app/page.tsx
// Root page - shows landing page for unauthenticated users, dashboard redirect for authenticated

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Check, Users, Receipt, Briefcase, UserPlus, TrendingUp, ChevronDown } from 'lucide-react';

// Inline landing page component (avoids import issues with route groups)
function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-display font-bold text-xl text-ink">Crebo</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium">How it works</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden md:block text-gray-600 hover:text-gray-900 text-sm font-medium">Sign in</Link>
              <Link href="/login?mode=signup" className="inline-flex items-center gap-1 px-4 py-2 bg-forest-600 text-white text-sm font-semibold rounded-lg hover:bg-forest-700 transition-colors">
                Start free trial <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 items-center">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest-50 border border-forest-200 rounded-full text-forest-700 text-sm font-medium mb-6">
                <span>✦</span>
                <span>Built for small businesses in India</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-tight mb-6">
                Stop losing customers to a messy inbox.
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-xl">
                Crebo helps small businesses organise their customers, track their pipeline, send invoices, and follow up — all in one place. No complexity. No IT team.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Link href="/login?mode=signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-forest-600 text-white font-semibold rounded-lg hover:bg-forest-700 transition-colors">
                  Start your free 14-day trial <span>→</span>
                </Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  See how it works <ChevronDown className="w-4 h-4" />
                </a>
              </div>
              <p className="text-sm text-gray-500">No credit card required · Cancel anytime · Setup in 5 minutes</p>
            </div>
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <img src="/crebo logo 2.png" alt="Crebo" className="w-8 h-8 rounded-lg" />
                      <span className="font-semibold text-sm">Crebo Dashboard</span>
                    </div>
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
                <div className="absolute -bottom-4 -right-4 w-full h-full bg-forest-200/30 rounded-2xl -z-10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <p className="text-gray-600 text-sm">Trusted by small businesses in Delhi, Bangalore, Mumbai, Hyderabad and beyond</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">🍕 Food & Catering</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">✂️ Fashion</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">🏠 Real Estate</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">📦 Wholesale</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink text-center mb-12">Sound familiar?</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="font-semibold text-lg text-ink mb-2">WhatsApp is a mess</h3>
              <p className="text-gray-600 text-sm">Leads getting lost in your personal chats. Your team sharing one phone. Customers waiting hours for a reply.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="text-3xl mb-4">🧠</div>
              <h3 className="font-semibold text-lg text-ink mb-2">Everything lives in your head</h3>
              <p className="text-gray-600 text-sm">No record of what you discussed with a customer last month. Deals falling through because you forgot to follow up.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="text-3xl mb-4">😵</div>
              <h3 className="font-semibold text-lg text-ink mb-2">CRMs are built for corporations</h3>
              <p className="text-gray-600 text-sm">Salesforce. HubSpot. You open them, see 50 menu items, and close the tab. You need something simple.</p>
            </div>
          </div>
          <p className="text-center text-lg text-forest-700 font-medium">Crebo is different. Here is what it actually does.</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto space-y-24">
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-forest-50 text-forest-700 text-xs font-semibold rounded-full mb-4">PEOPLE</span>
              <h3 className="font-display text-3xl font-bold text-ink mb-4">Every customer. One place.</h3>
              <p className="text-gray-600 mb-6">Add customers from WhatsApp, walk-ins, phone calls or referrals. See their full history — every conversation, invoice, and note — the moment you open their profile.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />Add offline walk-in customers</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />Track deal value per customer</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />See full history in one click</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <Users className="w-10 h-10 text-forest-600 mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <Receipt className="w-10 h-10 text-forest-600 mb-3" />
                <div className="text-2xl font-bold text-ink mb-2">₹2,34,000</div>
                <p className="text-sm text-gray-500">Outstanding invoices</p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full mb-4">MONEY</span>
              <h3 className="font-display text-3xl font-bold text-ink mb-4">Get paid faster.</h3>
              <p className="text-gray-600 mb-6">Create professional invoices in 30 seconds. Send them via email with one click. Track payment status and follow up on overdue invoices easily.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />Professional invoices in seconds</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />Email invoices directly to customers</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />Track paid, pending, and overdue</li>
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-4">TEAM</span>
              <h3 className="font-display text-3xl font-bold text-ink mb-4">Your whole team. One system.</h3>
              <p className="text-gray-600 mb-6">Assign customers to team members with a note. They get an email telling them exactly what to do. Set follow-up reminders so no lead falls through the cracks.</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />Assign contacts to agents</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />Email notifications on assignment</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-5 h-5 text-forest-600" />Follow-up reminders per contact</li>
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

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-4">Up and running in 5 minutes</h2>
            <p className="text-gray-600">No IT team. No training. No technical setup.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-forest-50 rounded-2xl mb-6">
                <span className="font-display text-2xl font-bold text-forest-600">01</span>
              </div>
              <UserPlus className="w-8 h-8 text-forest-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-ink mb-2">Create your account</h3>
              <p className="text-gray-600 text-sm">Sign up with your email. Tell us your business name. That is it.</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-forest-50 rounded-2xl mb-6">
                <span className="font-display text-2xl font-bold text-forest-600">02</span>
              </div>
              <Users className="w-8 h-8 text-forest-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-ink mb-2">Add your customers</h3>
              <p className="text-gray-600 text-sm">Add contacts manually or let them come in automatically. Each one gets a full profile.</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-forest-50 rounded-2xl mb-6">
                <span className="font-display text-2xl font-bold text-forest-600">03</span>
              </div>
              <TrendingUp className="w-8 h-8 text-forest-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-ink mb-2">Run your business</h3>
              <p className="text-gray-600 text-sm">Track your pipeline, send invoices, set follow-ups, and delegate work to your team.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-4">Simple pricing. No surprises.</h2>
            <p className="text-gray-600">Start free for 14 days. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Trial */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full mb-4">Start here</div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-ink">FREE</span>
                <p className="text-gray-500 text-sm mt-1">14 days, full access</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Full access to all features</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Up to 3 team members</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Unlimited contacts</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Unlimited invoices</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Email support</li>
              </ul>
              <Link href="/login?mode=signup" className="block text-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Start free trial →
              </Link>
            </div>

            {/* Starter */}
            <div className="bg-white rounded-2xl border-2 border-forest-600 p-8 relative shadow-lg">
              <div className="absolute -top-3 right-6 px-3 py-1 bg-forest-600 text-white text-xs font-semibold rounded-full">Most popular</div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-ink">₹499</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Everything in Free trial</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Up to 3 team members</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Email invoices to customers</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Email notifications</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Data export (CSV)</li>
              </ul>
              <Link href="/login?mode=signup" className="block text-center px-6 py-3 bg-forest-600 text-white font-semibold rounded-lg hover:bg-forest-700 transition-colors">
                Start free trial →
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="mb-6">
                <span className="text-4xl font-bold text-ink">₹999</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Everything in Starter</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Unlimited team members</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Priority support</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Advanced reports</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-forest-600" />Recurring invoices</li>
              </ul>
              <Link href="/login?mode=signup" className="block text-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Start free trial →
              </Link>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm mt-8">All plans include a 14-day free trial. Cancel anytime. No contracts.</p>

          {/* FAQ */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h3 className="font-display text-xl font-bold text-ink text-center mb-8">Frequently asked questions</h3>
            <div className="space-y-4">
              <details className="group bg-gray-50 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-gray-900">
                  Do I need a credit card to start?
                  <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600">No. Sign up and use Crebo free for 14 days. We only ask for payment details when your trial ends.</div>
              </details>
              <details className="group bg-gray-50 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-gray-900">
                  Can I change plans later?
                  <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600">Yes, upgrade or downgrade anytime from your Settings page. Changes take effect immediately.</div>
              </details>
              <details className="group bg-gray-50 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-gray-900">
                  What happens when my trial ends?
                  <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600">You will see a prompt to choose a plan. Your data is always safe — we never delete anything without 30 days notice.</div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-forest-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">Your business deserves better than a messy inbox.</h2>
          <p className="text-white/70 text-lg mb-8">Join hundreds of small business owners who use Crebo to stay organised, follow up consistently, and get paid faster.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link href="/login?mode=signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-forest-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
              Start your free trial <span>→</span>
            </Link>
            <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors">
              Talk to us on WhatsApp
            </a>
          </div>
          <p className="text-white/50 text-sm">No credit card · Free for 14 days · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/crebo logo 2.png" alt="Crebo" className="w-8 h-8 rounded-lg" />
                <span className="font-display font-bold text-xl text-ink">Crebo</span>
              </div>
              <p className="text-gray-500 text-sm">Your business, credibly run.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="/#how-it-works" className="text-gray-500 hover:text-gray-900 text-sm">Features</a></li>
                <li><a href="/#pricing" className="text-gray-500 hover:text-gray-900 text-sm">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-gray-500 hover:text-gray-900 text-sm">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-500 hover:text-gray-900 text-sm">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">Support</h4>
              <ul className="space-y-3">
                <li><a href="mailto:contact@crebo.in" className="text-gray-500 hover:text-gray-900 text-sm">Contact us</a></li>
                <li><a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900 text-sm">WhatsApp support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Crebo. All rights reserved.</p>
            <p className="text-gray-400 text-sm">Made for small businesses in India 🇮🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in - show landing page
  if (!user) {
    return <LandingPage />;
  }

  // Logged in - check if onboarded
  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) redirect('/onboarding');

  // Onboarded - go to dashboard
  redirect('/dashboard');
}
