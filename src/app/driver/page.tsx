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
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { RouteMap } from '../components/RouteMap';

type RouteView = Pick<Route, 'id' | 'driverId' | 'status'> & { waypoints: string[]; packageIds: string[] };
type OrderView = Pick<Order, 'id' | 'routeId'> & { createdAt?: number; packages: Pick<Package, 'id' | 'description' | 'status' | 'address'>[] };

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

    // Modal state for failure reason
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [failurePackageId, setFailurePackageId] = useState<string>('');
    const [failureReason, setFailureReason] = useState<string>('');

    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [pendingAssignment, setPendingAssignment] = useState<{ id: string; routeId: string; orders: unknown[] } | null>(null);

    // Updated state variables for delivery workflow
    const [isHeadingToWarehouse, setIsHeadingToWarehouse] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<{id: string, address: string} | null>(null);
    const [deliveryPhase, setDeliveryPhase] = useState<'none' | 'heading_to_warehouse' | 'picked_up' | 'delivering'>('none');
    const WAREHOUSE_LOCATION = "University of Colombo, Sri Lanka";

    async function loadOrders() {
        try {
            const url = driverId ? `/api/orders?driverId=${encodeURIComponent(driverId)}` : '/api/orders';
            const res = await fetch(url, {
                cache: 'no-store',
                headers: { 'x-api-key': 'dev-key' }
            });
            const data = await res.json();
            const list: OrderView[] = data.orders || [];
            // Filter orders assigned to this driver (have routeId) and sort by createdAt asc (oldest first)
            const assigned = list.filter(o => o.routeId);
            assigned.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            setOrders(assigned);
            setLastRefresh(new Date());

            // No single selected route; we will list all orders below
            setRoute(null);
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
            
            // Reset delivery workflow
            setDeliveryPhase('none');
            setIsHeadingToWarehouse(false);
            setSelectedPackage(null);
            
            // Auto-refresh after delivery action
            setTimeout(() => {
                triggerRefresh();
            }, 500);
        } catch (error) {
            console.error('Failed to mark as delivered:', error);
        }
    }

    async function markOutForDelivery(packageId: string) {
        try {
            // Find the package details
            const pkg = orders.flatMap(o => o.packages).find(p => p.id === packageId);
            if (!pkg) return;

            // Set states for navigation to warehouse first
            setSelectedPackage({
                id: packageId,
                address: pkg.address || 'No address provided'
            });
            setIsHeadingToWarehouse(true);
            setDeliveryPhase('heading_to_warehouse');
            
            // Switch to route tab to show navigation
            setActiveTab('route');

            // DON'T mark as out for delivery yet - this will happen after warehouse pickup
            // The handlePackagePickup function will handle the API call to mark as IN_TRANSIT
            
            console.log(`Starting delivery process for package ${packageId} - heading to warehouse first`);
            
        } catch (error) {
            console.error('Failed to start delivery process:', error);
        }
    }

    // Handle package pickup at warehouse - updated version
    function handlePackagePickup() {
        if (selectedPackage && deliveryPhase === 'heading_to_warehouse') {
            // Package has been picked up from warehouse, now heading to delivery location
            setIsHeadingToWarehouse(false);
            setDeliveryPhase('delivering');
            
            // Update the package status to IN_TRANSIT in the backend
            if (selectedPackage.id) {
                fetch('/api/driver/out', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': 'dev-key' },
                    body: JSON.stringify({ packageId: selectedPackage.id })
                }).then(() => {
                    // Refresh orders to get updated package status
                    setTimeout(() => {
                        triggerRefresh();
                    }, 300);
                }).catch(error => {
                    console.error('Failed to update package status:', error);
                });
            }
            
            console.log(`Package ${selectedPackage.id} picked up from warehouse, now calculating delivery route`);
        }
    }

    function openFailureModal(packageId: string) {
        setFailurePackageId(packageId);
        setFailureReason('');
        setShowFailureModal(true);
    }

    async function submitFailure() {
        if (!failureReason.trim()) {
            return; // Don't submit without a reason
        }

        try {
            await fetch('/api/driver/fail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'dev-key' },
                body: JSON.stringify({ packageId: failurePackageId, reason: failureReason })
            });
            
            setShowFailureModal(false);
            setFailureReason('');
            
            // Reset delivery workflow
            setDeliveryPhase('none');
            setIsHeadingToWarehouse(false);
            setSelectedPackage(null);
            
            // Auto-refresh after failure action
            setTimeout(() => {
                triggerRefresh();
            }, 500);
        } catch (error) {
            console.error('Failed to mark as failed:', error);
        }
    }

    // Aggregated stats across all assigned orders
    const allPkgs = orders.flatMap(o => o.packages);
    const stats = {
        total: allPkgs.length,
        delivered: allPkgs.filter(p => p.status === 'DELIVERED').length,
        failed: allPkgs.filter(p => p.status === 'FAILED').length,
        pending: allPkgs.filter(p => p.status === 'WAITING' || p.status === 'IN_TRANSIT').length,
    };

    if (!authChecked) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-poppins">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-900"></div>
                    <p className="text-slate-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-poppins">
            {/* Failure Reason Modal */}
            {showFailureModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all">
                        <div className="px-6 py-5 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-xl">
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">Mark Delivery as Failed</h3>
                                </div>
                                <button
                                type='button'
                                title='Close'
                                    onClick={() => setShowFailureModal(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Please provide a reason for the delivery failure:
                            </label>
                            <textarea
                                value={failureReason}
                                onChange={(e) => setFailureReason(e.target.value)}
                                placeholder="e.g., Recipient not available, Incorrect address, Package refused..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none transition-all duration-200"
                                rows={4}
                                autoFocus
                            />
                            {!failureReason.trim() && (
                                <p className="mt-2 text-sm text-red-600">* Reason is required</p>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                            <div className="flex items-center justify-end space-x-3">
                                <button
                                    onClick={() => setShowFailureModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitFailure}
                                    disabled={!failureReason.trim()}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${failureReason.trim()
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    <XCircle className="w-4 h-4" />
                                    <span>Mark as Failed</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern Header */}
            <header className="bg-white border-b border-slate-200/60 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl">
                                <Truck className="w-6 h-6 text-white" />
                            </div>
                            <div className='font-lora'>
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
                                    <p className="text-sm font-semibold text-slate-900 font-lora truncate max-w-[140px]">
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

                {orders.length > 0 && (
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
                                            <h2 className="text-xl font-bold text-slate-900">Assigned Orders</h2>
                                            <p className="text-slate-600 text-sm">Oldest first • {orders.length} orders</p>
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
                                        <div className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                            ACTIVE
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
                                    <div className="space-y-6">
                                        {/* Delivery Status Card */}
                                        {deliveryPhase !== 'none' && selectedPackage && (
                                            <div className={`p-4 rounded-xl border-2 mb-6 ${
                                                deliveryPhase === 'heading_to_warehouse' 
                                                    ? 'border-blue-200 bg-blue-50' 
                                                    : deliveryPhase === 'delivering' 
                                                    ? 'border-green-200 bg-green-50'
                                                    : 'border-amber-200 bg-amber-50'
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                            deliveryPhase === 'heading_to_warehouse' 
                                                                ? 'bg-blue-100' 
                                                                : deliveryPhase === 'delivering' 
                                                                ? 'bg-green-100' 
                                                                : 'bg-amber-100'
                                                        }`}>
                                                            <Truck className={`w-5 h-5 ${
                                                                deliveryPhase === 'heading_to_warehouse' 
                                                                    ? 'text-blue-600' 
                                                                    : deliveryPhase === 'delivering' 
                                                                    ? 'text-green-600' 
                                                                    : 'text-amber-600'
                                                            }`} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900">
                                                                Package #{selectedPackage.id.slice(-6)} - {
                                                                    deliveryPhase === 'heading_to_warehouse' 
                                                                        ? 'Heading to Warehouse'
                                                                        : deliveryPhase === 'delivering'
                                                                        ? 'Out for Delivery'
                                                                        : 'In Transit'
                                                                }
                                                            </h4>
                                                            <p className="text-sm text-slate-600">
                                                                {deliveryPhase === 'heading_to_warehouse' 
                                                                    ? 'Navigate to warehouse for package pickup'
                                                                    : `Delivering to: ${selectedPackage.address}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setActiveTab('route')}
                                                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                                                    >
                                                        View Route
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {orders.map((o) => (
                                            <div key={o.id} className="border rounded-2xl overflow-hidden">
                                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm text-slate-500">Order</div>
                                                        <div className="text-lg font-semibold text-slate-900">#{o.id.slice(-6)}</div>
                                                    </div>
                                                    <div className="text-xs text-slate-500">Created: {o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</div>
                                                </div>
                                                <div className="p-6">
                                                    <DriverManifest
                                                        route={{ id: o.routeId!, driverId: driverId || 'unknown', status: 'ASSIGNED' }}
                                                        order={{ id: o.id, packages: o.packages }}
                                                        onDeliver={(pkgId) => markDelivered(pkgId)}
                                                        onFail={(pkgId) => openFailureModal(pkgId)}
                                                        onOut={(pkgId) => markOutForDelivery(pkgId)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'route' && (
                                    <div className="space-y-6">
                                        <RouteMap
                                            packages={orders.flatMap(o => o.packages).filter(pkg => pkg.address !== undefined) as Array<{ id: string; address: string; status: string }>}
                                            driverId={driverId}
                                            warehouseLocation={WAREHOUSE_LOCATION}
                                            isHeadingToWarehouse={isHeadingToWarehouse}
                                            selectedPackage={selectedPackage}
                                            onLocationUpdate={async (location) => {
                                                try {
                                                    await updateDoc(doc(db, 'users', driverId), {
                                                        currentLocation: location,
                                                        lastLocationUpdate: serverTimestamp()
                                                    });
                                                } catch (error) {
                                                    console.error('Failed to update location:', error);
                                                }
                                            }}
                                            onPackagePickedUp={handlePackagePickup}
                                        />
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-slate-900">Recent Deliveries</h3>
                                            <div className="text-sm text-slate-500">{allPkgs.filter(p => p.status === 'DELIVERED' || p.status === 'FAILED').length} completed</div>
                                        </div>
                                        <div className="space-y-3">
                                            {allPkgs
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
                                                )
                                            )}
                                            {allPkgs.filter(p => p.status === 'DELIVERED' || p.status === 'FAILED').length === 0 && (
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

            {showAssignmentModal && pendingAssignment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">New Route Assignment</h3>
                        <p className="mb-4">You have been assigned {pendingAssignment.orders.length} new orders. Accept this route?</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={async () => {
                                    await updateDoc(doc(db, 'assignments', `${pendingAssignment.id}`), {
                                        status: 'REJECTED',
                                        respondedAt: serverTimestamp()
                                    });
                                    setShowAssignmentModal(false);
                                }}
                                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                            >
                                Reject
                            </button>
                            <button
                                onClick={async () => {
                                    await updateDoc(doc(db, 'assignments', `${pendingAssignment.id}`), {
                                        status: 'ACCEPTED',
                                        respondedAt: serverTimestamp()
                                    });
                                    setShowAssignmentModal(false);
                                    loadOrders(); // Refresh orders list
                                }}
                                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}