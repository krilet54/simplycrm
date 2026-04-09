import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/crebo logo 2.png" alt="Crebo" className="w-8 h-8 rounded-lg" />
              <span className="font-display font-bold text-xl text-ink">Crebo</span>
            </div>
            <p className="text-gray-500 text-sm">
              Your business, credibly run.
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
                <a href="mailto:contact@crebo.in" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
                  Contact us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Crebo. All rights reserved.
          </p>
          <p className="text-gray-400 text-sm">
            Made for small businesses in India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
}
