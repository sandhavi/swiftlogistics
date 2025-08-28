'use client';

import { useEffect, useRef, useState } from 'react';
import { auth } from '@/app/lib/firebase';
import { signOut } from 'firebase/auth';
import DriverManifest from '@/app/components/DriverManifest';
import { Order, Package, Route } from '@/app/lib/types';
import { getCurrentUserAndRole } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    LogOut,
    Package as PackageIcon,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    MapPin,
    Route as RouteIcon,
    Truck,
    Navigation,
    User,
    History,
    List
} from 'lucide-react';

type RouteView = Pick<Route, 'id' | 'driverId' | 'status'> & { waypoints: string[]; packageIds: string[] };
type OrderView = Pick<Order, 'id' | 'routeId'> & { packages: Pick<Package, 'id' | 'description' | 'status' | 'address'>[] };

export default function DriverDashboard() {
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);
    const [route, setRoute] = useState<RouteView | null>(null);
    const [orders, setOrders] = useState<OrderView[]>([]);
    const [activeTab, setActiveTab] = useState<'manifest' | 'route' | 'history'>('manifest');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const esRef = useRef<EventSource | null>(null);

    const [driverName, setDriverName] = useState<string | null>(null);
    const [driverId, setDriverId] = useState<string>('');

    async function loadOrders() {
        try {
            const url = driverId ? `/api/orders?driverId=${encodeURIComponent(driverId)}` : '/api/orders';
            const res = await fetch(url, {
                cache: 'no-store',
                headers: { 'x-api-key': 'dev-key' }
            });
            const data = await res.json();
            setOrders(data.orders || []);
            setLastRefresh(new Date());

            // Pick the latest with a route assigned to this driver
            const withRoute = (data.orders || []).filter((o: OrderView) => o.routeId);
            if (withRoute.length > 0) {
                const first = withRoute[0];
                // route DTO is not directly exposed; reconstruct minimal
                setRoute({
                    id: first.routeId,
                    driverId: driverId || 'unknown',
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
        (async () => {
            const { user, role } = await getCurrentUserAndRole();
            if (!user) {
                router.replace('/login');
                return;
            }
            if (role !== 'driver') {
                if (role === 'admin') router.replace('/admin');
                else if (role === 'client') router.replace('/client');
                else router.replace('/');
                return;
            }
            setDriverName(user.displayName || user.email);
            setDriverId(user.uid);
            setAuthChecked(true);
            loadOrders();
            const es = new EventSource('/api/updates');
            esRef.current = es;
            es.onmessage = (ev) => {
                try {
                    JSON.parse(ev.data);
                    // Trigger refresh on any event
                    triggerRefresh();
                } catch (error) {
                    console.error('Failed to parse event:', error);
                }
            };
        })();
        return () => {
            esRef.current?.close();
        };
    }, [driverId]);

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = '/login';
    };

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

    if (!authChecked) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-900"></div>
                    <p className="text-slate-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const routeStatusClass = (status: RouteView['status'] | 'IN_PROGRESS') => {
        if (status === 'ASSIGNED') return 'bg-blue-50 text-blue-700 border border-blue-200';
        if (status === 'IN_PROGRESS') return 'bg-amber-50 text-amber-700 border border-amber-200';
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Modern Header */}
            <header className="bg-white border-b border-slate-200/60 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl">
                                <Truck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Driver Hub</h1>
                                <p className="text-slate-600 text-sm">Your delivery command center</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                onClick={triggerRefresh}
                                className="inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all duration-200 text-sm font-medium group"
                            >
                                <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                                Sync
                            </button>

                            <div className="flex items-center space-x-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-center w-8 h-8 bg-slate-900 rounded-lg">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-500 font-medium">Driver</p>
                                    <p className="text-sm font-semibold text-slate-900 truncate max-w-[140px]">
                                        {driverName || '—'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 text-sm font-medium border border-red-200"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-slate-100">
                        <div className="flex items-center space-x-2 text-sm text-slate-500">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                            <span>Live updates enabled</span>
                        </div>
                        <div className="text-xs text-slate-400">
                            Last synced: {lastRefresh.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {!route && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-8 shadow-sm">
                        <div className="flex items-start space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-amber-900 mb-1">Awaiting Route Assignment</h3>
                                <p className="text-amber-700 mb-3">
                                    No active delivery route found. Routes are automatically assigned when new orders are created.
                                </p>
                                <div className="inline-flex items-center px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                                    <Clock className="w-4 h-4 mr-1.5" />
                                    Standby Mode
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {route && orderForRoute && (
                    <>
                        {/* Modern Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-600 text-sm font-medium mb-1">Total Packages</p>
                                        <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                                    </div>
                                    <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-xl">
                                        <PackageIcon className="w-6 h-6 text-slate-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-600 text-sm font-medium mb-1">Pending</p>
                                        <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                                    </div>
                                    <div className="flex items-center justify-center w-12 h-12 bg-amber-50 rounded-xl">
                                        <Clock className="w-6 h-6 text-amber-600" />
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-amber-400 rounded-full mr-2"></div>
                                        <span className="text-xs text-slate-500">In progress</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-600 text-sm font-medium mb-1">Completed</p>
                                        <p className="text-3xl font-bold text-emerald-600">{stats.delivered}</p>
                                    </div>
                                    <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl">
                                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                                        <span className="text-xs text-slate-500">Successfully delivered</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-600 text-sm font-medium mb-1">Failed</p>
                                        <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
                                    </div>
                                    <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-xl">
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                        <span className="text-xs text-slate-500">Delivery attempts failed</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modern Route Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl">
                                            <RouteIcon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">Route #{route.id.slice(-6)}</h2>
                                            <p className="text-slate-600 text-sm">
                                                Optimized delivery route • {route.waypoints.length} stops
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={triggerRefresh}
                                            className="inline-flex items-center px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 text-sm font-medium"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-1.5" />
                                            Refresh
                                        </button>
                                        <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${routeStatusClass(route.status as any)}`}>
                                            {route.status}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modern Tabs */}
                            <div className="border-b border-slate-100">
                                <nav className="flex px-6">
                                    <button
                                        onClick={() => setActiveTab('manifest')}
                                        className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${activeTab === 'manifest'
                                            ? 'border-slate-900 text-slate-900'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        <List className="w-4 h-4 mr-2" />
                                        Delivery Manifest
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('route')}
                                        className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${activeTab === 'route'
                                            ? 'border-slate-900 text-slate-900'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Route Map
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${activeTab === 'history'
                                            ? 'border-slate-900 text-slate-900'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        <History className="w-4 h-4 mr-2" />
                                        Delivery History
                                    </button>
                                </nav>
                            </div>

                            <div className="p-6">
                                {activeTab === 'manifest' && (
                                    <DriverManifest route={route} order={orderForRoute} onDeliver={markDelivered} onFail={markFailed} />
                                )}

                                {activeTab === 'route' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-slate-900">Route Waypoints</h3>
                                            <div className="flex items-center space-x-2 text-sm text-slate-500">
                                                <Navigation className="w-4 h-4" />
                                                <span>{route.waypoints.length} stops planned</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {route.waypoints.map((waypoint, index) => (
                                                <div key={`${waypoint}-${index}`} className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors duration-200">
                                                    <div className="flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-lg mr-4 font-bold text-sm">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-slate-900 mb-1">{waypoint}</div>
                                                        <div className="flex items-center text-sm text-slate-500">
                                                            <MapPin className="w-4 h-4 mr-1" />
                                                            Stop {index + 1} of {route.waypoints.length}
                                                        </div>
                                                    </div>
                                                    <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-slate-900">Recent Deliveries</h3>
                                            <div className="text-sm text-slate-500">
                                                {orderForRoute.packages.filter(p => p.status === 'DELIVERED' || p.status === 'FAILED').length} completed
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {orderForRoute.packages
                                                .filter(p => p.status === 'DELIVERED' || p.status === 'FAILED')
                                                .map((pkg) => (
                                                    <div key={`${pkg.id}-${pkg.status}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                        <div className="flex items-center space-x-4">
                                                            <div className={`w-3 h-3 rounded-full ${pkg.status === 'DELIVERED' ? 'bg-emerald-500' : 'bg-red-500'
                                                                }`}></div>
                                                            <div>
                                                                <div className="font-semibold text-slate-900 mb-1">{pkg.description}</div>
                                                                <div className="flex items-center text-sm text-slate-500">
                                                                    <MapPin className="w-4 h-4 mr-1" />
                                                                    {pkg.address}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${pkg.status === 'DELIVERED'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {pkg.status}
                                                        </div>
                                                    </div>
                                                ))}
                                            {orderForRoute.packages.filter(p => p.status === 'DELIVERED' || p.status === 'FAILED').length === 0 && (
                                                <div className="text-center py-12 text-slate-500">
                                                    <PackageIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                                    <p className="text-lg font-medium mb-2">No deliveries completed yet</p>
                                                    <p className="text-sm">Completed deliveries will appear here</p>
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
