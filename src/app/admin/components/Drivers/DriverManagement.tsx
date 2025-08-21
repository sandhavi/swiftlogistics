"use client";

import { useState, useEffect } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// Define types
interface Driver {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    vehicleType: string;
    licenseNumber: string;
    joinDate: string;
    status: 'active' | 'inactive';
    completedDeliveries: number;
    rating: number;
}

interface Delivery {
    id: string;
    orderId: string;
    clientName: string;
    date: string;
    status: 'completed' | 'failed';
    packages: number;
    duration: string; // placeholder (not in DB yet)
    location: string; // destination
}

export default function DriverManagement() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [deliveryHistory, setDeliveryHistory] = useState<Delivery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load drivers from Firestore
    useEffect(() => {
        async function fetchDrivers() {
            setIsLoading(true);
            setError(null);
            try {
                const driversQ = query(collection(db, 'users'), where('accountType', '==', 'driver'));
                const snap = await getDocs(driversQ);
                const list: Driver[] = [];
                for (const d of snap.docs) {
                    const data = d.data();
                    // createdAt may be ISO string or Timestamp-like
                    let joinDate = new Date();
                    const createdAt = data.createdAt;
                    if (createdAt) {
                        if (typeof createdAt === 'string') {
                            const parsed = Date.parse(createdAt); if (!isNaN(parsed)) joinDate = new Date(parsed);
                        } else if (typeof createdAt === 'object' && 'seconds' in createdAt) {
                            joinDate = new Date(createdAt.seconds * 1000);
                        }
                    }
                    list.push({
                        id: d.id,
                        fullName: data.fullName || 'Unnamed Driver',
                        email: data.email || '',
                        // Firestore stores this as 'phone' from registration; fall back to legacy 'phoneNumber'
                        phoneNumber: data.phone || data.phoneNumber || 'N/A',
                        vehicleType: data.vehicleType || 'Unassigned',
                        licenseNumber: data.licenseNumber || 'N/A',
                        joinDate: joinDate.toISOString(),
                        status: (data.status === 'inactive' ? 'inactive' : 'active'),
                        completedDeliveries: data.completedDeliveries || 0,
                        rating: typeof data.rating === 'number' ? data.rating : 0,
                    });
                }
                setDrivers(list);
            } catch (e) {
                console.error('Error fetching drivers', e);
                setError('Failed to load drivers. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }
        fetchDrivers();
    }, []);

    // Load delivery history for selected driver
    useEffect(() => {
        if (!selectedDriver) return;
        async function fetchDriverHistory() {
            setIsLoading(true);
            setError(null);
            try {
                const ordersQ = query(collection(db, 'orders'), where('driverId', '==', selectedDriver!.id));
                const snap = await getDocs(ordersQ);
                const deliveries: Delivery[] = [];
                let completedCount = 0;
                let ratingSum = 0;
                let ratingCount = 0;
                for (const o of snap.docs) {
                    const data = o.data();
                    // Parse date
                    let orderDate = new Date();
                    if (data.createdAt) {
                        if (typeof data.createdAt === 'string') {
                            const parsed = Date.parse(data.createdAt); if (!isNaN(parsed)) orderDate = new Date(parsed);
                        } else if (typeof data.createdAt === 'object' && 'seconds' in data.createdAt) {
                            orderDate = new Date(data.createdAt.seconds * 1000);
                        }
                    }
                    // Resolve client name
                    let clientName = 'Unknown Client';
                    if (data.clientId) {
                        try {
                            const clientDoc = await getDoc(doc(db, 'users', data.clientId));
                            if (clientDoc.exists()) clientName = clientDoc.data().fullName || clientName;
                        } catch { }
                    }
                    // Map status
                    const rawStatus = (data.status || '').toUpperCase();
                    const mappedStatus: Delivery['status'] = rawStatus === 'DELIVERED' || rawStatus === 'COMPLETED' ? 'completed' : (rawStatus === 'FAILED' ? 'failed' : 'completed');
                    if (mappedStatus === 'completed') completedCount++;
                    if (typeof data.rating === 'number') { ratingSum += data.rating; ratingCount++; }
                    deliveries.push({
                        id: o.id,
                        orderId: data.orderId || `ORD-${o.id.slice(0, 6).toUpperCase()}`,
                        clientName,
                        date: orderDate.toISOString(),
                        status: mappedStatus,
                        packages: Array.isArray(data.packages) ? data.packages.length : (data.packageCount || 0),
                        duration: data.duration || '-',
                        location: data.destination || '-',
                    });
                }
                // Update driver stats locally (without persisting)
                setDeliveryHistory(deliveries);
                setDrivers(prev => prev.map(dr => dr.id === selectedDriver!.id ? {
                    ...dr,
                    completedDeliveries: completedCount,
                    rating: ratingCount ? parseFloat((ratingSum / ratingCount).toFixed(1)) : dr.rating
                } : dr));
            } catch (e) {
                console.error('Error fetching driver delivery history', e);
                setError('Failed to load delivery history. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }
        fetchDriverHistory();
    }, [selectedDriver]);

    const handleViewDriverDetails = (driver: Driver) => {
        setSelectedDriver(driver);
    };

    const handleBackToDrivers = () => {
        setSelectedDriver(null);
        setDeliveryHistory([]);
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                    {selectedDriver ? `Driver: ${selectedDriver.fullName}` : 'Driver Management'}
                </h2>
                {selectedDriver && (
                    <button
                        onClick={handleBackToDrivers}
                        className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Drivers List
                    </button>
                )}
            </div>

            {selectedDriver ? (
                <div className="p-6">
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center mb-4 sm:mb-0">
                                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-medium">
                                    {selectedDriver.fullName.charAt(0)}
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">{selectedDriver.fullName}</h3>
                                    <div className="flex items-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedDriver.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {selectedDriver.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                        <div className="ml-2 flex items-center">
                                            {[...Array(5)].map((_, index) => (
                                                <svg
                                                    key={index}
                                                    className={`w-4 h-4 ${index < Math.round(selectedDriver.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                            <span className="ml-1 text-sm text-gray-600">{selectedDriver.rating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col text-sm">
                                <span className="text-gray-500">Completed Deliveries</span>
                                <span className="text-xl font-semibold text-blue-600">{selectedDriver.completedDeliveries}</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">Email</p>
                                <p className="mt-1">{selectedDriver.email}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">Phone Number</p>
                                <p className="mt-1">{selectedDriver.phoneNumber}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">Vehicle Type</p>
                                <p className="mt-1">{selectedDriver.vehicleType}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">License Number</p>
                                <p className="mt-1">{selectedDriver.licenseNumber}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">Join Date</p>
                                <p className="mt-1">{new Date(selectedDriver.joinDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery History</h3>

                        {isLoading ? (
                            <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
                                <p className="mt-2 text-gray-500">Loading delivery history...</p>
                            </div>
                        ) : deliveryHistory.length === 0 ? (
                            <div className="text-center py-4 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">No delivery history available.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packages</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {deliveryHistory.map(delivery => (
                                            <tr key={delivery.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{delivery.orderId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.clientName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(delivery.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${delivery.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{delivery.status === 'completed' ? 'Completed' : 'Failed'}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.packages}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.duration}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.location}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-6">
                    {isLoading ? (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
                            <p className="mt-2 text-gray-500">Loading drivers data...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-gray-500">No drivers found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deliveries</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {drivers.map(driver => (
                                        <tr key={driver.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{driver.fullName}</div>
                                                <div className="text-xs text-gray-500">Joined {new Date(driver.joinDate).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.vehicleType}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${driver.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{driver.status === 'active' ? 'Active' : 'Inactive'}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.completedDeliveries}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.rating.toFixed(1)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleViewDriverDetails(driver)} className="text-blue-600 hover:text-blue-900">View Details</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
