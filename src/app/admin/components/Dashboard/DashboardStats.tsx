"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

interface StatsItemConfig {
    title: string;
    key: keyof StatsState;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
}

interface StatsState {
    totalClients: number;
    totalDrivers: number;
    activeDeliveries: number;
    completedDeliveries: number;
    stockItems: number;
}

export default function DashboardStats() {
    const [stats, setStats] = useState<StatsState>({
        totalClients: 0,
        totalDrivers: 0,
        activeDeliveries: 0,
        completedDeliveries: 0,
        stockItems: 0
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [lastUpdated, setLastUpdated] = useState<string>('');

    const fetchCounts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Users
            const usersCol = collection(db, 'users');
            const clientsSnap = await getCountFromServer(query(usersCol, where('accountType', '==', 'client')));
            const driversSnap = await getCountFromServer(query(usersCol, where('accountType', '==', 'driver')));

            // Orders
            const ordersCol = collection(db, 'orders');
            const activeStatuses = ['PENDING', 'IN_WMS', 'ROUTED'];
            const completedStatuses = ['DELIVERED', 'COMPLETED'];

            // Firestore supports 'in' queries (≤10 values)
            const activeSnap = await getCountFromServer(query(ordersCol, where('status', 'in', activeStatuses)));
            const completedSnap = await getCountFromServer(query(ordersCol, where('status', 'in', completedStatuses)));

            // Stock items
            const stockCol = collection(db, 'stock');
            const stockSnap = await getCountFromServer(query(stockCol));

            setStats({
                totalClients: clientsSnap.data().count,
                totalDrivers: driversSnap.data().count,
                activeDeliveries: activeSnap.data().count,
                completedDeliveries: completedSnap.data().count,
                stockItems: stockSnap.data().count
            });
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Failed to fetch dashboard stats', e);
            setError('Failed to load stats.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    const statsItems: StatsItemConfig[] = [
        {
            title: 'Total Clients',
            key: 'totalClients',
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
            key: 'totalDrivers',
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
            key: 'activeDeliveries',
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
            key: 'completedDeliveries',
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
            key: 'stockItems',
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
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                    {loading ? 'Refreshing stats...' : lastUpdated ? `Last updated: ${lastUpdated}` : ''}
                    {error && <span className="text-red-600 ml-2">{error}</span>}
                </div>
                <button
                    onClick={fetchCounts}
                    disabled={loading}
                    className="text-xs px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {statsItems.map(item => (
                    <div key={item.key} className="bg-white rounded-lg shadow p-5">
                        <div className="flex items-center">
                            <div className={`p-3 rounded-lg ${item.bgColor} ${item.textColor}`}>
                                {item.icon}
                            </div>
                            <div className="ml-4">
                                <h3 className="text-sm font-medium text-gray-500">{item.title}</h3>
                                <p className="text-2xl font-semibold text-gray-800">
                                    {loading ? <span className="animate-pulse text-gray-400">...</span> : stats[item.key]}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
