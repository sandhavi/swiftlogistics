"use client";

import { useState } from 'react';
import { auth } from '@/app/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AdminHeader() {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        // For the admin user (which was hardcoded), we just redirect to login
        router.push('/login');
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-purple-600">Swift Logistics</span>
                            <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">Admin</span>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="ml-3 relative">
                            <div>
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-gray-300 transition"
                                    id="user-menu"
                                    aria-expanded="false"
                                    aria-haspopup="true"
                                >
                                    <span className="sr-only">Open user menu</span>
                                    <div className="h-8 w-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-600 font-medium">
                                        A
                                    </div>
                                </button>
                            </div>
                            {showProfileMenu && (
                                <div
                                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                                    role="menu"
                                    aria-orientation="vertical"
                                    aria-labelledby="user-menu"
                                >
                                    <div className="py-1" role="none">
                                        <div className="block px-4 py-2 text-sm text-gray-700">
                                            <span className="block font-medium">Admin User</span>
                                            <span className="block text-gray-500">aadmin@gmail.com</span>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            role="menuitem"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
