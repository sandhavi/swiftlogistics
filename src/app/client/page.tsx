'use client';
import { auth } from '@/app/lib/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useRef, useState, useCallback } from 'react';
import OrderList from '@/app/components/OrderList';
import { Order, Package, UpdateEvent } from '@/app/lib/types';
import { getCurrentUserAndRole } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  LogOut,
  Package as PackageIcon,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  User,
  Truck,
  MapPin,
  ShoppingCart,
  BarChart3,
  FileText
} from 'lucide-react';

type OrderRow = Pick<Order, 'id' | 'clientId' | 'status' | 'routeId'> & { packages: Pick<Package, 'id' | 'description' | 'status'>[] };

export default function ClientDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [stock, setStock] = useState<{ id: string; name: string; quantity: number; unit?: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { user, role } = await getCurrentUserAndRole();
      if (!user) {
        router.replace('/login');
        return;
      }
      if (role !== 'client') {
        if (role === 'admin') router.replace('/admin');
        else if (role === 'driver') router.replace('/driver');
        else router.replace('/');
        return;
      }
      setUserName(user.displayName || user.email);
      setNewOrder(prev => ({ ...prev, clientId: user.uid }));
      // Load drivers and stock for dropdowns
      try {
        const [driversRes, stockRes] = await Promise.all([
          fetch('/api/drivers', { headers: { 'x-api-key': 'dev-key' } }),
          fetch('/api/stock', { headers: { 'x-api-key': 'dev-key' } })
        ]);
        if (driversRes.ok) {
          const d = await driversRes.json();
          setDrivers(d.drivers || []);
        }
        if (stockRes.ok) {
          const s = await stockRes.json();
          setStock((s.stock || []).map((i: { id: string; name: string; quantity: number; unit: string }) => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit })));
        }
      } catch (e) {
        console.error('Failed to load dropdowns', e);
      }
      setAuthChecked(true);
    })();
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
    clientId: '',
    driverId: '',
    address: '',
    packages: [
      { stockItemId: '', description: '', quantity: 1 }
    ] as { stockItemId: string; description: string; quantity: number }[]
  });
  const esRef = useRef<EventSource | null>(null);

  async function loadOrders() {
    try {
      const url = newOrder.clientId ? `/api/orders?clientId=${encodeURIComponent(newOrder.clientId)}` : '/api/orders';
      const res = await fetch(url, {
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
      const packages = newOrder.packages
        .filter(p => p.stockItemId && p.quantity > 0)
        .map(p => {
          const item = stock.find(s => s.id === p.stockItemId);
          return {
            description: p.description || item?.name || 'Package',
            address: newOrder.address,
            stockItemId: p.stockItemId,
            quantity: p.quantity,
          };
        });
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'dev-key' },
        body: JSON.stringify({ clientId: newOrder.clientId, driverId: newOrder.driverId, packages })
      });
      await res.json();
      setShowOrderForm(false);
      setNewOrder(prev => ({
        clientId: prev.clientId,
        driverId: '',
        address: '',
        packages: [{ stockItemId: '', description: '', quantity: 1 }]
      }));
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
      packages: [...prev.packages, { stockItemId: '', description: '', quantity: 1 }]
    }));
  };

  const removePackage = (index: number) => {
    setNewOrder(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index)
    }));
  };

  const updateNewOrderPackage = (index: number, field: 'description' | 'stockItemId' | 'quantity', value: string | number) => {
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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-poppins">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-900"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-poppins">
      {/* Modern Header */}
      <header className="bg-white border-b border-slate-200/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-lora">Client Hub</h1>
                <p className="text-slate-600 text-sm font-lora">Order management & tracking center</p>
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

              <button
                onClick={() => setShowOrderForm(true)}
                className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </button>

              <div className="flex items-center space-x-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-center w-8 h-8 bg-slate-900 rounded-lg">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 font-medium">Client</p>
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-[140px] font-lora">
                    {userName || '—'}
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
              <span>Real-time tracking active</span>
            </div>
            <div className="text-xs text-slate-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Modern Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-xl">
                <FileText className="w-6 h-6 text-slate-600" />
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
                <span className="text-xs text-slate-500">Awaiting processing</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">In Transit</p>
                <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                <span className="text-xs text-slate-500">Out for delivery</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Delivered</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.delivered}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                <span className="text-xs text-slate-500">Successfully completed</span>
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
                <span className="text-xs text-slate-500">Delivery failed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Order Form Modal */}
        {showOrderForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-slate-900 rounded-xl">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Create New Order</h2>
                      <p className="text-sm text-slate-600">Fill in the delivery details below</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOrderForm(false)}
                    className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="clientId" className="block text-sm font-semibold text-slate-700 mb-2">
                      Client ID
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="clientId"
                        type="text"
                        value={newOrder.clientId}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-none"
                        placeholder="Auto-filled"
                        aria-label="Client ID"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="driverId" className="block text-sm font-semibold text-slate-700 mb-2">
                      Assigned Driver
                    </label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        id="driverId"
                        value={newOrder.driverId}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, driverId: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        aria-label="Driver"
                      >
                        <option value="">Select a driver</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="orderAddress" className="block text-sm font-semibold text-slate-700 mb-2">
                    Delivery Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="orderAddress"
                      type="text"
                      value={newOrder.address}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Enter complete delivery address"
                      aria-label="Delivery Address"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <PackageIcon className="w-5 h-5 text-slate-600" />
                      <span className="text-sm font-semibold text-slate-700">Package Details</span>
                    </div>
                    <button
                      onClick={addPackage}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Package
                    </button>
                  </div>
                  <div className="space-y-4">
                    {newOrder.packages.map((pkg, index) => (
                      <div key={(pkg.stockItemId || 'pkg') + index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label htmlFor={`stock-${index}`} className="block text-xs font-medium text-slate-700 mb-2">Stock Item</label>
                            <select
                              id={`stock-${index}`}
                              value={pkg.stockItemId}
                              onChange={(e) => {
                                const id = e.target.value;
                                const item = stock.find(s => s.id === id);
                                updateNewOrderPackage(index, 'stockItemId', id);
                                if (item?.name) updateNewOrderPackage(index, 'description', item.name);
                              }}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                              aria-label="Select stock item"
                            >
                              <option value="">Choose item...</option>
                              {stock.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} (Stock: {s.quantity}{s.unit ? ` ${s.unit}` : ''})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`desc-${index}`} className="block text-xs font-medium text-slate-700 mb-2">Description</label>
                            <input
                              id={`desc-${index}`}
                              type="text"
                              placeholder="Package description"
                              value={pkg.description}
                              onChange={(e) => updateNewOrderPackage(index, 'description', e.target.value)}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                              aria-label="Package description"
                            />
                          </div>
                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <label htmlFor={`qty-${index}`} className="block text-xs font-medium text-slate-700 mb-2">Quantity</label>
                              <input
                                id={`qty-${index}`}
                                type="number"
                                min={1}
                                max={Math.max(1, stock.find(s => s.id === pkg.stockItemId)?.quantity || 1)}
                                value={pkg.quantity}
                                onChange={(e) => {
                                  const max = Math.max(1, stock.find(s => s.id === pkg.stockItemId)?.quantity || 1);
                                  const val = Math.max(1, Math.min(parseInt(e.target.value || '1', 10), max));
                                  updateNewOrderPackage(index, 'quantity', val);
                                }}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                                aria-label="Quantity"
                              />
                            </div>
                            {newOrder.packages.length > 1 && (
                              <button
                                onClick={() => removePackage(index)}
                                className="flex items-center justify-center w-10 h-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Remove package"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowOrderForm(false)}
                    className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitOrder}
                    disabled={submitting}
                    className="inline-flex items-center px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <PackageIcon className="w-4 h-4 mr-2" />
                        Create Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Orders Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-slate-900 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Your Orders</h2>
                  <p className="text-slate-600 text-sm">{orders.length} total orders • Real-time tracking</p>
                </div>
              </div>
              <button
                onClick={triggerRefresh}
                className="inline-flex items-center px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Refresh
              </button>
            </div>
          </div>
          <div className="p-6">
            <OrderList orders={orders} />
          </div>
        </div>
      </div>
    </div>
  );
}