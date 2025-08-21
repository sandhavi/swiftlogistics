'use client';
import { auth } from '@/app/lib/firebase';
import { signOut } from 'firebase/auth';


import { useEffect, useRef, useState, useCallback } from 'react';
import OrderList from '@/app/components/OrderList';
import { Order, Package, UpdateEvent } from '@/app/lib/types';

type OrderRow = Pick<Order, 'id' | 'clientId' | 'status' | 'routeId'> & { packages: Pick<Package, 'id' | 'description' | 'status'>[] };

export default function ClientDashboard() {
    const [userName, setUserName] = useState<string | null>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            setUserName(user.displayName || user.email);
        }
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = '/login';
    };
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [newOrder, setNewOrder] = useState({
        clientId: 'client123',
        driverId: 'driverA',
        packages: [
            { description: '', address: '' }
        ]
    });
    const esRef = useRef<EventSource | null>(null);

    async function loadOrders() {
        try {
            const res = await fetch('/api/orders', {
                cache: 'no-store',
                headers: { 'x-api-key': 'dev-key' }
            });
            const data = await res.json();
            setOrders(data.orders || []);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to load orders:', error);
        }
    }

    // Auto-refresh function
    const triggerRefresh = useCallback(() => {
        loadOrders();
    }, []);

    const handleEvent = useCallback((e: UpdateEvent) => {
        // Trigger refresh on any event
        triggerRefresh();
    }, [triggerRefresh]);

    useEffect(() => {
        loadOrders();
        const es = new EventSource('/api/updates');
        esRef.current = es;
        es.onmessage = (ev) => {
            try {
                handleEvent(JSON.parse(ev.data));
            } catch (error) {
                console.error('Failed to parse event:', error);
            }
        };
        return () => {
            es.close();
        };
    }, [handleEvent]);

    function updateOrderList(existing: OrderRow[], updated: OrderRow): OrderRow[] {
        const found = existing.some(o => o.id === updated.id);
        return found ? existing.map(o => o.id === updated.id ? updated : o) : [updated, ...existing];
    }

    function updatePackage(order: OrderRow, pkg: { id: string; description: string; status: Package['status'] }): OrderRow {
        const idx = order.packages.findIndex(p => p.id === pkg.id);
        if (idx < 0) return order;
        const nextPkgs = [...order.packages];
        nextPkgs[idx] = pkg;
        return { ...order, packages: nextPkgs };
    }

    async function submitOrder() {
        setSubmitting(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'dev-key' },
                body: JSON.stringify(newOrder)
            });
            await res.json();
            setShowOrderForm(false);
            setNewOrder({
                clientId: 'client123',
                driverId: 'driverA',
                packages: [{ description: '', address: '' }]
            });
            // Auto-refresh after order submission
            setTimeout(() => {
                triggerRefresh();
            }, 500);
        } catch (error) {
            console.error('Failed to submit order:', error);
        } finally {
            setSubmitting(false);
        }
    }

    const addPackage = () => {
        setNewOrder(prev => ({
            ...prev,
            packages: [...prev.packages, { description: '', address: '' }]
        }));
    };

    const removePackage = (index: number) => {
        setNewOrder(prev => ({
            ...prev,
            packages: prev.packages.filter((_, i) => i !== index)
        }));
    };

    const updateNewOrderPackage = (index: number, field: 'description' | 'address', value: string) => {
        setNewOrder(prev => ({
            ...prev,
            packages: prev.packages.map((pkg, i) =>
                i === index ? { ...pkg, [field]: value } : pkg
            )
        }));
    };

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        inProgress: orders.filter(o => o.status === 'IN_WMS' || o.status === 'ROUTED').length,
        delivered: orders.filter(o => o.status === 'DELIVERED').length,
        failed: orders.filter(o => o.status === 'FAILED').length
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* User Info and Logout */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end py-2">
                    {userName && (
                        <div className="flex items-center gap-4">
                            <span className="text-gray-700 font-medium">Welcome, {userName}</span>
                            <button
                                onClick={handleLogout}
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
                            <p className="text-gray-600">Manage your orders and track deliveries in real-time</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Last updated: {lastRefresh.toLocaleTimeString()}
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={triggerRefresh}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Refresh</span>
                            </button>
                            <button
                                onClick={() => setShowOrderForm(true)}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                + New Order
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">In Progress</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Delivered</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Failed</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Form Modal */}
                {showOrderForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
                            <h2 className="text-2xl font-bold mb-6">Create New Order</h2>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
                                    <input
                                        id="clientId"
                                        type="text"
                                        value={newOrder.clientId}
                                        onChange={(e) => setNewOrder(prev => ({ ...prev, clientId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter client ID"
                                        aria-label="Client ID"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="driverId" className="block text-sm font-medium text-gray-700 mb-2">Driver ID</label>
                                    <input
                                        id="driverId"
                                        type="text"
                                        value={newOrder.driverId}
                                        onChange={(e) => setNewOrder(prev => ({ ...prev, driverId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter driver ID"
                                        aria-label="Driver ID"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Packages</label>
                                    <div className="space-y-3">
                                        {newOrder.packages.map((pkg, index) => (
                                            <div key={index} className="flex gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Description"
                                                    value={pkg.description}
                                                    onChange={(e) => updateNewOrderPackage(index, 'description', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    aria-label="Package description"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Address"
                                                    value={pkg.address}
                                                    onChange={(e) => updateNewOrderPackage(index, 'address', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    aria-label="Package address"
                                                />
                                                {newOrder.packages.length > 1 && (
                                                    <button
                                                        onClick={() => removePackage(index)}
                                                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={addPackage}
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            + Add Package
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowOrderForm(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitOrder}
                                    disabled={submitting}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Creating...' : 'Create Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Orders List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">Orders</h2>
                        <button
                            onClick={triggerRefresh}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Refresh</span>
                        </button>
                    </div>
                    <div className="p-6">
                        <OrderList orders={orders} />
                    </div>
                </div>
            </div>
        </div>
    );
}
