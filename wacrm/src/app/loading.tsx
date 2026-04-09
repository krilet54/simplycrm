// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block">
            <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-green-600 animate-spin"></div>
          </div>
        </div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}
