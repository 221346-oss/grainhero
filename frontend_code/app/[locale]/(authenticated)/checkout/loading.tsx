"use client";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-32 h-10 bg-gray-200 rounded" />
          <div className="w-48 h-8 bg-gray-200 rounded" />
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-8 space-y-4 shadow-sm">
              <div className="w-40 h-6 bg-gray-200 rounded mb-4" />
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
              <div className="h-10 bg-gray-200 rounded mb-4" />
              <div className="h-10 bg-gray-200 rounded mb-4" />
              <div className="h-10 bg-gray-200 rounded mb-4" />
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-8 space-y-4 shadow-sm">
              <div className="w-40 h-6 bg-gray-200 rounded mb-4" />
              <div className="h-10 bg-gray-200 rounded mb-4" />
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
              <div className="h-10 bg-gray-200 rounded mb-4" />
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-40 h-6 bg-gray-200 rounded mb-4" />
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          </div>
          {/* Order Summary Skeleton */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-sm space-y-4">
              <div className="w-32 h-6 bg-gray-200 rounded mb-4" />
              <div className="flex gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                  <div className="w-20 h-4 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
            <div className="w-full h-4 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
} 