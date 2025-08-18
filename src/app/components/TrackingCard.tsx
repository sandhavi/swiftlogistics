import React from 'react';
import { Order, Package } from '@/app/lib/types';

interface TrackingCardProps {
    order: Order;
}

const getStatusStep = (status: string) => {
    switch (status) {
        case 'PENDING': return 1;
        case 'IN_WMS': return 2;
        case 'ROUTED': return 3;
        case 'DELIVERED': return 4;
        case 'FAILED': return 4;
        default: return 1;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'PENDING': return 'bg-yellow-500';
        case 'IN_WMS': return 'bg-blue-500';
        case 'ROUTED': return 'bg-purple-500';
        case 'DELIVERED': return 'bg-green-500';
        case 'FAILED': return 'bg-red-500';
        default: return 'bg-gray-500';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'PENDING':
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case 'IN_WMS':
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            );
        case 'ROUTED':
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
            );
        case 'DELIVERED':
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            );
        case 'FAILED':
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            );
        default:
            return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
    }
};

const steps = [
    { name: 'Order Created', description: 'Order submitted and registered' },
    { name: 'In Warehouse', description: 'Packages processed in WMS' },
    { name: 'Route Assigned', description: 'Optimized route created' },
    { name: 'Delivered', description: 'All packages delivered' }
];

export const TrackingCard: React.FC<TrackingCardProps> = ({ order }) => {
    const currentStep = getStatusStep(order.status);
    const isFailed = order.status === 'FAILED';

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Order {order.id}</h3>
                    <p className="text-sm text-gray-500">Client: {order.clientId}</p>
                </div>
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${isFailed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                    {getStatusIcon(order.status)}
                    <span>{order.status}</span>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const stepNumber = index + 1;
                        const isCompleted = stepNumber < currentStep;
                        const isCurrent = stepNumber === currentStep;
                        const isFailedStep = isFailed && stepNumber === currentStep;

                        return (
                            <div key={step.name} className="flex flex-col items-center flex-1">
                                <div className="flex items-center w-full">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${isCompleted ? 'bg-green-500' :
                                            isCurrent ? (isFailedStep ? 'bg-red-500' : 'bg-blue-500') :
                                                'bg-gray-300'
                                        }`}>
                                        {isCompleted ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            stepNumber
                                        )}
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                            }`}></div>
                                    )}
                                </div>
                                <div className="text-center mt-2">
                                    <div className={`text-xs font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-500'
                                        }`}>
                                        {step.name}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {step.description}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Package Details */}
            <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Packages ({order.packages.length})</h4>
                <div className="space-y-2">
                    {order.packages.map((pkg) => (
                        <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${pkg.status === 'DELIVERED' ? 'bg-green-500' :
                                        pkg.status === 'FAILED' ? 'bg-red-500' :
                                            pkg.status === 'IN_TRANSIT' ? 'bg-blue-500' :
                                                'bg-gray-400'
                                    }`}></div>
                                <div>
                                    <div className="font-medium text-gray-900">{pkg.description}</div>
                                    <div className="text-xs text-gray-500">ID: {pkg.id}</div>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${pkg.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                    pkg.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                        pkg.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                }`}>
                                {pkg.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Route Information */}
            {order.routeId && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-900">Route Information</h4>
                            <p className="text-sm text-gray-500">Route ID: {order.routeId}</p>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                            </svg>
                            <span>Optimized Route</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrackingCard;
