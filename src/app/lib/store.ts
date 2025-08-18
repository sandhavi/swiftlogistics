import { Order, Route } from './types';

class Store {
    orders = new Map<string, Order>();
    routes = new Map<string, Route>();
    // Outbox for async delivery simulation (e.g., events to be published)
    outbox: { kind: string; orderId: string }[] = [];

    upsertOrder(order: Order) {
        this.orders.set(order.id, order);
        return order;
    }

    getOrder(orderId: string) {
        return this.orders.get(orderId);
    }

    listOrders() {
        return Array.from(this.orders.values());
    }

    upsertRoute(route: Route) {
        this.routes.set(route.id, route);
        return route;
    }

    getRoute(routeId: string) {
        return this.routes.get(routeId);
    }

    findOrderByPackageId(packageId: string) {
        for (const order of this.orders.values()) {
            if (order.packages.some(p => p.id === packageId)) return order;
        }
        return undefined;
    }

    enqueueOutbox(event: { kind: string; orderId: string }) {
        this.outbox.push(event);
    }

    drainOutbox() {
        const batch = [...this.outbox];
        this.outbox = [];
        return batch;
    }
}

export const store = new Store();
