'use client';

import { useEffect, useRef, useState } from 'react';
import DriverManifest from '@/app/components/DriverManifest';
import { Order, Package, Route } from '@/app/lib/types';

type RouteView = Pick<Route, 'id' | 'driverId' | 'status'> & { waypoints: string[]; packageIds: string[] };
type OrderView = Pick<Order, 'id' | 'routeId'> & { packages: Pick<Package, 'id' | 'description' | 'status' | 'address'>[] };

export default function DriverDashboard() {
    const [route, setRoute] = useState<RouteView | null>(null);
    const [orders, setOrders] = useState<OrderView[]>([]);
    const [activeTab, setActiveTab] = useState<'manifest' | 'route' | 'history'>('manifest');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
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

            // Pick the latest with a route for driverA (prototype)
            const withRoute = (data.orders || []).filter((o: OrderView) => o.routeId);
            if (withRoute.length > 0) {
                const first = withRoute[0];
                // route DTO is not directly exposed; reconstruct minimal
                setRoute({
                    id: first.routeId,
                    driverId: 'driverA',
                    waypoints: first.packages.map((p: OrderView['packages'][number]) => (p.address ?? 'Unknown')),
                    status: 'ASSIGNED' as const,
                    packageIds: first.packages.map((p: OrderView['packages'][number]) => p.id)
                });
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
        }
    }

    // Auto-refresh function
    const triggerRefresh = () => {
        loadOrders();
    };

    useEffect(() => {
        loadOrders();
        const es = new EventSource('/api/updates');
        esRef.current = es;
        es.onmessage = (ev) => {
            try {
                const e = JSON.parse(ev.data);
                // Trigger refresh on any event
                triggerRefresh();
            } catch (error) {
                console.error('Failed to parse event:', error);
            }
        };
        return () => es.close();
    }, []);

    async function markDelivered(packageId: string) {
        try {
            await fetch('/api/driver/deliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'dev-key' },
                body: JSON.stringify({
                    packageId,
                    signatureDataUrl: undefined,
                    photoUrl: undefined
                })
            });
            // Auto-refresh after delivery action
            setTimeout(() => {
                triggerRefresh();
            }, 500);
        } catch (error) {
            console.error('Failed to mark as delivered:', error);
        }
    }

    async function markFailed(packageId: string) {
        try {
            const reason = prompt('Enter failure reason (e.g., recipient not available)') || 'Unknown';
            await fetch('/api/driver/fail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'dev-key' },
                body: JSON.stringify({ packageId, reason })
            });
            // Auto-refresh after failure action
            setTimeout(() => {
                triggerRefresh();
            }, 500);
        } catch (error) {
            console.error('Failed to mark as failed:', error);
        }
    }

    const orderForRoute = route
        ? orders.find(o => o.routeId === route.id)
        : undefined;

    const stats = {
        total: orderForRoute?.packages.length || 0,
        delivered: orderForRoute?.packages.filter(p => p.status === 'DELIVERED').length || 0,
        failed: orderForRoute?.packages.filter(p => p.status === 'FAILED').length || 0,
        pending: orderForRoute?.packages.filter(p => p.status === 'WAITING' || p.status === 'IN_TRANSIT').length || 0
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
                            <p className="text-gray-600">Manage deliveries and track your route in real-time</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Last updated: {lastRefresh.toLocaleTimeString()}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={triggerRefresh}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Refresh</span>
                            </button>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Driver ID</div>
                                <div className="font-semibold text-gray-900">driverA</div>
                            </div>
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!route && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-yellow-800">No route assigned</h3>
                                <p className="text-yellow-700">Create an order from the Client Portal to receive a route assignment.</p>
                            </div>
                        </div>
                    </div>
                )}

                {route && orderForRoute && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Packages</p>
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

                        {/* Route Info */}
                        <div className="bg-white rounded-lg shadow mb-8">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">Route {route.id}</h2>
                                        <p className="text-gray-600">Optimized delivery route with {route.waypoints.length} stops</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={triggerRefresh}
                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>Refresh</span>
                                        </button>
                                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${route.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                                                route.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                            }`}>
                                            {route.status}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200">
                                <nav className="flex space-x-8 px-6">
                                    <button
                                        onClick={() => setActiveTab('manifest')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'manifest'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        Delivery Manifest
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('route')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'route'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        Route Map
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        Delivery History
                                    </button>
                                </nav>
                            </div>

                            <div className="p-6">
                                {activeTab === 'manifest' && (
                                    <DriverManifest route={route} order={orderForRoute} onDeliver={markDelivered} onFail={markFailed} />
                                )}

                                {activeTab === 'route' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900">Route Waypoints</h3>
                                        <div className="space-y-3">
                                            {route.waypoints.map((waypoint, index) => (
                                                <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                                                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">{waypoint}</div>
                                                        <div className="text-sm text-gray-500">Stop {index + 1} of {route.waypoints.length}</div>
                                                    </div>
                                                    <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900">Recent Deliveries</h3>
                                        <div className="space-y-3">
                                            {orderForRoute.packages
                                                .filter(p => p.status === 'DELIVERED' || p.status === 'FAILED')
                                                .map((pkg) => (
                                                    <div key={pkg.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center">
                                                            <div className={`w-3 h-3 rounded-full mr-3 ${pkg.status === 'DELIVERED' ? 'bg-green-500' : 'bg-red-500'
                                                                }`}></div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">{pkg.description}</div>
                                                                <div className="text-sm text-gray-500">{pkg.address}</div>
                                                            </div>
                                                        </div>
                                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${pkg.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {pkg.status}
                                                        </div>
                                                    </div>
                                                ))}
                                            {orderForRoute.packages.filter(p => p.status === 'DELIVERED' || p.status === 'FAILED').length === 0 && (
                                                <div className="text-center py-8 text-gray-500">
                                                    No deliveries completed yet
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
