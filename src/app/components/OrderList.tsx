import React from 'react';
import { Order, Package } from '@/app/lib/types';

type OrderView = Pick<Order, 'id' | 'status' | 'routeId'> & { packages: Pick<Package, 'id' | 'description' | 'status'>[] };
type OrderListProps = { orders: OrderView[] };

const getStatusColor = (status: string) => {
    switch (status) {
        case 'PENDING': return 'bg-yellow-100 text-yellow-800';
        case 'IN_WMS': return 'bg-blue-100 text-blue-800';
        case 'ROUTED': return 'bg-purple-100 text-purple-800';
        case 'DELIVERED': return 'bg-green-100 text-green-800';
        case 'FAILED': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getPackageStatusColor = (status: string) => {
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
        case 'PENDING':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case 'IN_WMS':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            );
        case 'ROUTED':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
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

export const OrderList: React.FC<OrderListProps> = ({ orders }) => {
    return (
        <div className="space-y-4">
            {orders.map(o => (
                <div key={o.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-semibold text-lg text-gray-900">Order {o.id}</div>
                                <div className="text-sm text-gray-500">Route: {o.routeId ?? 'Not assigned'}</div>
                            </div>
                        </div>
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(o.status)}`}>
                            {getStatusIcon(o.status)}
                            <span>{o.status}</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Packages ({o.packages.length})</h4>
                            <div className="text-sm text-gray-500">
                                {o.packages.filter(p => p.status === 'DELIVERED').length} delivered, {o.packages.filter(p => p.status === 'FAILED').length} failed
                            </div>
                        </div>
                        <div className="space-y-3">
                            {o.packages.map((p) => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{p.description}</div>
                                            <div className="text-xs text-gray-500">ID: {p.id}</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPackageStatusColor(p.status)}`}>
                                        <span>{p.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
            {orders.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-500">Create your first order to get started with SwiftTrack</p>
                </div>
            )}
        </div>
    );
};

export default OrderList;
