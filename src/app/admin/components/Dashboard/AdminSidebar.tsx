"use client";

import { useState } from 'react';

interface SidebarProps {
    onTabChange: (tab: string) => void;
    activeTab: string;
}

export default function AdminSidebar({ onTabChange, activeTab }: SidebarProps) {
    const menuItems = [
        {
            id: 'dashboard',
            name: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            id: 'stock',
            name: 'Stock Management',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            )
        },
        {
            id: 'drivers',
            name: 'Driver Management',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
        {
            id: 'clients',
            name: 'Client Management',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        }
    ];

    return (
        <div className="bg-white shadow-sm h-full">
            <div className="h-16 flex items-center px-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Admin Portal</h2>
            </div>
            <nav className="mt-4 px-2">
                <div className="space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md w-full ${activeTab === item.id
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                }`}
                        >
                            <span className="mr-3">{item.icon}</span>
                            {item.name}
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
