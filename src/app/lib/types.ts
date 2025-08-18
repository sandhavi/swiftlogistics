export type PackageStatus = 'WAITING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
export type OrderStatus = 'PENDING' | 'IN_WMS' | 'ROUTED' | 'DELIVERED' | 'FAILED';

export type Package = {
    id: string;
    description: string;
    address?: string;
    status: PackageStatus;
    proof?: {
        signatureDataUrl?: string;
        photoUrl?: string;
        reason?: string;
        timestamp?: number;
    };
};

export type Route = {
    id: string;
    driverId: string;
    waypoints: string[];
    status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
    packageIds: string[];
};

export type Order = {
    id: string;
    clientId: string;
    packages: Package[];
    status: OrderStatus;
    routeId?: string;
    cmsOrderId?: string;
};

export type DriverEvent =
    | { type: 'PACKAGE_DELIVERED'; packageId: string; orderId: string; proof?: Package['proof'] }
    | { type: 'PACKAGE_FAILED'; packageId: string; orderId: string; proof?: Package['proof'] }
    | { type: 'ROUTE_ASSIGNED'; routeId: string; driverId: string };

export type ClientEvent =
    | { type: 'ORDER_UPDATED'; order: Order }
    | { type: 'PACKAGE_UPDATED'; orderId: string; package: Package }
    | { type: 'ROUTE_UPDATED'; orderId: string; route: Route };

export type UpdateEvent = DriverEvent | ClientEvent;
