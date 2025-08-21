"use client";

import { useState, useEffect } from 'react';

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
    duration: string;
    location: string;
}

export default function DriverManagement() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [deliveryHistory, setDeliveryHistory] = useState<Delivery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('drivers');

    // Load drivers data
    useEffect(() => {
        // In a real app, fetch from your API
        // For now, we'll use sample data
        const sampleDrivers: Driver[] = [
            {
                id: '1',
                fullName: 'John Smith',
                email: 'john.smith@example.com',
                phoneNumber: '(555) 123-4567',
                vehicleType: 'Van',
                licenseNumber: 'DL123456',
                joinDate: '2024-05-10',
                status: 'active',
                completedDeliveries: 142,
                rating: 4.8
            },
            {
                id: '2',
                fullName: 'Maria Rodriguez',
                email: 'maria.r@example.com',
                phoneNumber: '(555) 987-6543',
                vehicleType: 'Truck',
                licenseNumber: 'DL789012',
                joinDate: '2024-03-22',
                status: 'active',
                completedDeliveries: 98,
                rating: 4.9
            },
            {
                id: '3',
                fullName: 'David Chen',
                email: 'david.c@example.com',
                phoneNumber: '(555) 456-7890',
                vehicleType: 'Bike',
                licenseNumber: 'DL345678',
                joinDate: '2025-01-15',
                status: 'inactive',
                completedDeliveries: 53,
                rating: 4.5
            }
        ];

        setDrivers(sampleDrivers);
        setIsLoading(false);
    }, []);

    // Load delivery history when a driver is selected
    useEffect(() => {
        if (selectedDriver) {
            setIsLoading(true);
            // In a real app, fetch from your API with driver ID
            // For now, we'll use sample data
            const sampleDeliveries: Delivery[] = [
                {
                    id: 'd1',
                    orderId: 'O2025081',
                    clientName: 'Tech Solutions Inc',
                    date: '2025-08-15',
                    status: 'completed',
                    packages: 3,
                    duration: '45 min',
                    location: 'Downtown Business District'
                },
                {
                    id: 'd2',
                    orderId: 'O2025075',
                    clientName: 'Home Goods Store',
                    date: '2025-08-12',
                    status: 'completed',
                    packages: 1,
                    duration: '30 min',
                    location: 'Westside Mall'
                },
                {
                    id: 'd3',
                    orderId: 'O2025068',
                    clientName: 'Medical Supplies Co',
                    date: '2025-08-08',
                    status: 'failed',
                    packages: 2,
                    duration: '15 min',
                    location: 'North Hospital Complex'
                }
            ];

            setDeliveryHistory(sampleDeliveries);
            setActiveTab('history');
            setIsLoading(false);
        }
    }, [selectedDriver]);

    const handleViewDriverDetails = (driver: Driver) => {
        setSelectedDriver(driver);
    };

    const handleBackToDrivers = () => {
        setSelectedDriver(null);
        setActiveTab('drivers');
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
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedDriver.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
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
                                            <span className="ml-1 text-sm text-gray-600">{selectedDriver.rating}</span>
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
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Order ID
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Client
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
                                                Duration
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Location
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
                                                    <div className="text-sm text-gray-900">{delivery.clientName}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{new Date(delivery.date).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${delivery.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {delivery.status === 'completed' ? 'Completed' : 'Failed'}
                                                    </span>
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
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-gray-500">No drivers found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Driver Name
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vehicle
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Deliveries
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Rating
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {drivers.map((driver) => (
                                        <tr key={driver.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{driver.fullName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{driver.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{driver.vehicleType}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${driver.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {driver.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.completedDeliveries}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex">
                                                        {[...Array(5)].map((_, index) => (
                                                            <svg
                                                                key={`star-${driver.id}-${index}`}
                                                                className={`w-4 h-4 ${index < Math.round(driver.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                        ))}
                                                    </div>
                                                    <span className="ml-1 text-sm text-gray-500">{driver.rating}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleViewDriverDetails(driver)}
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
