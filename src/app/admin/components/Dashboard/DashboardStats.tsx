"use client";

import { useState, useEffect } from 'react';

interface StatsItem {
    title: string;
    value: number;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
}

export default function DashboardStats() {
    const [stats, setStats] = useState({
        totalClients: 0,
        totalDrivers: 0,
        activeDeliveries: 0,
        completedDeliveries: 0,
        stockItems: 0
    });

    useEffect(() => {
        // In a real application, fetch this data from your API/database
        // For now, we'll use sample data
        setStats({
            totalClients: 42,
            totalDrivers: 15,
            activeDeliveries: 27,
            completedDeliveries: 143,
            stockItems: 75
        });
    }, []);

    const statsItems: StatsItem[] = [
        {
            title: 'Total Clients',
            value: stats.totalClients,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-700'
        },
        {
            title: 'Total Drivers',
            value: stats.totalDrivers,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            bgColor: 'bg-green-100',
            textColor: 'text-green-700'
        },
        {
            title: 'Active Deliveries',
            value: stats.activeDeliveries,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700'
        },
        {
            title: 'Completed Deliveries',
            value: stats.completedDeliveries,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-700'
        },
        {
            title: 'Stock Items',
            value: stats.stockItems,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            ),
            bgColor: 'bg-red-100',
            textColor: 'text-red-700'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {statsItems.map((item, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-5">
                    <div className="flex items-center">
                        <div className={`p-3 rounded-lg ${item.bgColor} ${item.textColor}`}>
                            {item.icon}
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-500">{item.title}</h3>
                            <p className="text-2xl font-semibold text-gray-800">{item.value}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
