"use client";

import { useState, useEffect } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

// Define types
interface Client {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    company: string;
    address: string;
    joinDate: string;
    totalOrders: number;
}

interface ClientDelivery {
    id: string;
    orderId: string;
    date: string;
    status: 'PENDING' | 'IN_WMS' | 'ROUTED' | 'DELIVERED' | 'FAILED';
    packages: number;
    driver: string;
    destination: string;
}

export default function ClientManagement() {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [deliveryHistory, setDeliveryHistory] = useState<ClientDelivery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load clients data
    useEffect(() => {
        async function fetchClients() {
            setIsLoading(true);
            setError(null);

            try {
                // Get clients from Firestore where accountType is "client"
                const clientsQuery = query(
                    collection(db, 'users'),
                    where('accountType', '==', 'client')
                );

                const querySnapshot = await getDocs(clientsQuery);
                const clientsData: Client[] = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Robust createdAt parsing (supports Firestore Timestamp, ISO string, or missing)
                    let joinDate = new Date();
                    if (data.createdAt) {
                        if (typeof data.createdAt === 'string') {
                            const parsed = Date.parse(data.createdAt);
                            if (!isNaN(parsed)) joinDate = new Date(parsed);
                        } else if (typeof data.createdAt === 'object' && 'seconds' in data.createdAt) {
                            // Firestore Timestamp like object
                            joinDate = new Date((data.createdAt.seconds as number) * 1000);
                        }
                    }

                    clientsData.push({
                        id: doc.id,
                        fullName: data.fullName || 'Unknown',
                        email: data.email || '',
                        phoneNumber: data.phoneNumber || '',
                        company: data.company || '',
                        address: data.address || '',
                        joinDate: joinDate.toISOString(),
                        totalOrders: data.totalOrders || 0,
                    });
                });

                setClients(clientsData);
            } catch (err) {
                console.error("Error fetching clients:", err);
                setError("Failed to load client data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchClients();
    }, []);

    // Load delivery history when a client is selected
    useEffect(() => {
        if (selectedClient) {
            async function fetchDeliveryHistory() {
                setIsLoading(true);
                setError(null);

                try {
                    // Query for orders where clientId matches the selected client's ID
                    const ordersQuery = query(
                        collection(db, 'orders'),
                        where('clientId', '==', selectedClient?.id || '')
                    );

                    const querySnapshot = await getDocs(ordersQuery);
                    const deliveries: ClientDelivery[] = [];

                    // Process each order
                    for (const orderDoc of querySnapshot.docs) {
                        const orderData = orderDoc.data();

                        // Robust date parsing for order createdAt
                        let orderDate = new Date();
                        if (orderData.createdAt) {
                            if (typeof orderData.createdAt === 'string') {
                                const parsed = Date.parse(orderData.createdAt);
                                if (!isNaN(parsed)) orderDate = new Date(parsed);
                            } else if (typeof orderData.createdAt === 'object' && 'seconds' in orderData.createdAt) {
                                orderDate = new Date((orderData.createdAt.seconds as number) * 1000);
                            }
                        }

                        // Get driver info if available
                        let driverName = 'Unassigned';
                        if (orderData.driverId) {
                            const driverDoc = await getDoc(doc(db, 'users', orderData.driverId));
                            if (driverDoc.exists()) {
                                driverName = driverDoc.data().fullName || 'Unknown Driver';
                            }
                        }

                        deliveries.push({
                            id: orderDoc.id,
                            orderId: orderData.orderId || `ORD-${orderDoc.id.substring(0, 6).toUpperCase()}`,
                            date: orderDate.toISOString(),
                            status: orderData.status || 'PENDING',
                            packages: Array.isArray(orderData.packages) ? orderData.packages.length : (orderData.packageCount || 0),
                            driver: driverName,
                            destination: orderData.destination || selectedClient?.address || 'Unknown'
                        });
                    }

                    setDeliveryHistory(deliveries);
                } catch (err) {
                    console.error("Error fetching delivery history:", err);
                    setError("Failed to load delivery history. Please try again.");
                } finally {
                    setIsLoading(false);
                }
            }

            fetchDeliveryHistory();
        }
    }, [selectedClient]);

    const handleViewClientDetails = (client: Client) => {
        setSelectedClient(client);
    };

    const handleBackToClients = () => {
        setSelectedClient(null);
    };

    // Helper function for status styling
    const getStatusStyle = (status: ClientDelivery['status']) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'IN_WMS':
                return 'bg-blue-100 text-blue-800';
            case 'ROUTED':
                return 'bg-purple-100 text-purple-800';
            case 'DELIVERED':
                return 'bg-green-100 text-green-800';
            case 'FAILED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Helper function for status display
    const formatStatus = (status: ClientDelivery['status']) => {
        return status.replace('_', ' ');
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                    {selectedClient ? `Client: ${selectedClient.fullName}` : 'Client Management'}
                </h2>
                {selectedClient && (
                    <button
                        onClick={handleBackToClients}
                        className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Clients List
                    </button>
                )}
            </div>

            {selectedClient ? (
                <div className="p-6">
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center mb-4 sm:mb-0">
                                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-medium">
                                    {selectedClient.fullName.charAt(0)}
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">{selectedClient.fullName}</h3>
                                    <p className="text-sm text-gray-500">{selectedClient.company}</p>
                                </div>
                            </div>

                            <div className="flex flex-col text-sm">
                                <span className="text-gray-500">Total Orders</span>
                                <span className="text-xl font-semibold text-indigo-600">{selectedClient.totalOrders}</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">Email</p>
                                <p className="mt-1">{selectedClient.email}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">Phone Number</p>
                                <p className="mt-1">{selectedClient.phoneNumber}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">Company</p>
                                <p className="mt-1">{selectedClient.company}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg col-span-1 sm:col-span-2">
                                <p className="text-sm font-medium text-gray-500">Address</p>
                                <p className="mt-1">{selectedClient.address}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500">Client Since</p>
                                <p className="mt-1">{new Date(selectedClient.joinDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery History</h3>

                        {isLoading ? (
                            <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto"></div>
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
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Order ID
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Packages
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Driver
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Destination
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {deliveryHistory.map((delivery) => (
                                            <tr key={delivery.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{delivery.orderId}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{new Date(delivery.date).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(delivery.status)}`}>
                                                        {formatStatus(delivery.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.packages}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.driver}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="max-w-xs truncate">{delivery.destination}</div>
                                                </td>
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
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto"></div>
                            <p className="mt-2 text-gray-500">Loading clients data...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    ) : clients.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-gray-500">No clients found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Client Name
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Company
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Orders
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {clients.map((client) => (
                                        <tr key={client.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{client.fullName}</div>
                                                <div className="text-xs text-gray-500">Since {new Date(client.joinDate).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{client.company}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{client.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.phoneNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-indigo-600">{client.totalOrders}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleViewClientDetails(client)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    View Details
                                                </button>
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
