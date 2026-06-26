"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728m2.829-9.9a5 5 0 000 7.072M12 12h.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">No internet connection</h1>
        <p className="text-gray-600 mb-6">
          You are offline.
          Connect to the internet to access live data.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
