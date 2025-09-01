import React from 'react';
import { Order, Package, Route } from '@/app/lib/types';

type RouteView = Pick<Route, 'id' | 'driverId' | 'status'>;
type OrderView = Pick<Order, 'id'> & { packages: Pick<Package, 'id' | 'description' | 'status' | 'address'>[] };
interface ManifestProps {
    route: RouteView | null;
    order: OrderView | null;
    onDeliver: (packageId: string) => void;
    onFail: (packageId: string) => void;
    onOut: (packageId: string) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'WAITING': return 'bg-gray-100 text-gray-800';
        case 'IN_TRANSIT': return 'bg-blue-100 text-blue-800';
        case 'DELIVERED': return 'bg-green-100 text-green-800';
        case 'FAILED': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'WAITING':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case 'IN_TRANSIT':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            );
        case 'DELIVERED':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            );
        case 'FAILED':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            );
        default:
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
    }
};

export const DriverManifest: React.FC<ManifestProps> = ({ route, order, onDeliver, onFail, onOut }) => {
    if (!route || !order) return null;

    const pendingPackages = order.packages.filter(p => p.status === 'WAITING' || p.status === 'IN_TRANSIT');
    const completedPackages = order.packages.filter(p => p.status === 'DELIVERED' || p.status === 'FAILED');

    return (
        <div className="space-y-6">
            {/* Manifest Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-semibold">Delivery Manifest</h3>
                        <p className="text-blue-100">Route {route.id} • {order.packages.length} packages</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">{pendingPackages.length}</div>
                        <div className="text-blue-100 text-sm">Pending</div>
                    </div>
                </div>
            </div>

            {/* Pending Deliveries */}
            {pendingPackages.length > 0 && (
                <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Pending Deliveries</h4>
                    <div className="space-y-4">
                        {pendingPackages.map((pkg) => (
                            <div key={pkg.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h5 className="font-semibold text-gray-900">{pkg.description}</h5>
                                                <p className="text-sm text-gray-500">ID: {pkg.id}</p>
                                            </div>
                                        </div>

                                        <div className="ml-13">
                                            <div className="flex items-center mb-2">
                                                <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="text-sm text-gray-600">{pkg.address}</span>
                                            </div>

                                            <div className="flex items-center">
                                                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                                                    {getStatusIcon(pkg.status)}
                                                    <span>{pkg.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col space-y-2 ml-4">
                                        <button
                                            onClick={() => onOut(pkg.id)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span>Out for delivery</span>
                                        </button>
                                        <button
                                            onClick={() => onDeliver(pkg.id)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Deliver</span>
                                        </button>
                                        <button
                                            onClick={() => onFail(pkg.id)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <span>Fail</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Deliveries */}
            {completedPackages.length > 0 && (
                <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Completed Deliveries</h4>
                    <div className="space-y-3">
                        {completedPackages.map((pkg) => (
                            <div key={pkg.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`w-3 h-3 rounded-full mr-3 ${pkg.status === 'DELIVERED' ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                        <div>
                                            <div className="font-medium text-gray-900">{pkg.description}</div>
                                            <div className="text-sm text-gray-500">{pkg.address}</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                                        {getStatusIcon(pkg.status)}
                                        <span>{pkg.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {order.packages.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No packages assigned</h3>
                    <p className="text-gray-500">No packages have been assigned to this route yet.</p>
                </div>
            )}
        </div>
    );
};

export default DriverManifest;
