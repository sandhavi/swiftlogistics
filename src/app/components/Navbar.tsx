import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="w-full bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <div className="font-bold text-xl text-gray-900">SwiftTrack</div>
                            <div className="text-xs text-gray-500">Middleware Platform</div>
                        </div>
                    </Link>

                    <div className="flex items-center space-x-6">
                        <Link
                            href="/client"
                            className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-medium">Client Portal</span>
                        </Link>

                        <Link
                            href="/driver"
                            className="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition-colors px-3 py-2 rounded-md hover:bg-green-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium">Driver App</span>
                        </Link>

                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>System Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
