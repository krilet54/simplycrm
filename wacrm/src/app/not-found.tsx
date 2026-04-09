// src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-gray-50 px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-green-600 mb-2">404</h1>
          <p className="text-2xl font-semibold text-gray-900">Page not found</p>
        </div>

        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard/contacts"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
          >
            Go to People
          </Link>
        </div>

        <div className="mt-12 text-gray-500">
          <p className="text-sm">Need help? Check the sidebar for support options.</p>
        </div>
      </div>
    </div>
  );
}
