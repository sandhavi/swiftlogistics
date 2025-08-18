export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SwiftTrack
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Advanced Middleware Architecture for Modern Logistics
          </p>
          <div className="flex justify-center space-x-4">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              Real-time Tracking
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
              Multi-Protocol Integration
            </div>
            <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium">
              Event-Driven Architecture
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Client Portal</h3>
            <p className="mb-4">Submit orders, track deliveries, and monitor real-time updates</p>
            <a href="/client" className="inline-block bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Access Portal
            </a>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Driver App</h3>
            <p className="mb-4">View manifests, update delivery status, and capture proof of delivery</p>
            <a href="/driver" className="inline-block bg-white text-green-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Driver Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">System Architecture</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">CMS Integration</h3>
            </div>
            <p className="text-gray-600">SOAP/XML API integration with legacy Client Management System</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Route Optimization</h3>
            </div>
            <p className="text-gray-600">REST/JSON integration with cloud-based Route Optimization System</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">WMS Integration</h3>
            </div>
            <p className="text-gray-600">TCP/IP messaging with Warehouse Management System</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">Real-time Event Streaming</h4>
                <p className="text-gray-600">Server-Sent Events for instant updates across all systems</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">Idempotency & Reliability</h4>
                <p className="text-gray-600">Ensures no duplicate orders and handles system failures gracefully</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">Multi-Protocol Support</h4>
                <p className="text-gray-600">Seamless integration of SOAP, REST, and TCP/IP protocols</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">Proof of Delivery</h4>
                <p className="text-gray-600">Digital signatures and photo capture for delivery verification</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">Scalable Architecture</h4>
                <p className="text-gray-600">Event-driven design handles high-volume order processing</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">Security & Authentication</h4>
                <p className="text-gray-600">API key authentication and secure communication protocols</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
