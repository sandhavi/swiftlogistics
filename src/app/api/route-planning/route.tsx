import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { bus } from '@/app/lib/bus';

const BATCH_INTERVAL = 10 * 60 * 1000; // 10 minutes

type Order = {
  id: string;
  [key: string]: unknown;
};

type Driver = {
  id: string;
  [key: string]: unknown;
};

type RouteAssignmentEvent = {
  type: 'ROUTE_ASSIGNED';
  routeId: string;
  driverId: string;
  orders: Order[];
};

export async function POST() {
  try {
    // Get pending orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', '==', 'PENDING')
    );
    const ordersSnap = await getDocs(ordersQuery);
    const pendingOrders = ordersSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // Get available drivers
    const driversQuery = query(
      collection(db, 'users'),
      where('accountType', '==', 'driver'),
      where('status', '==', 'active')
    );
    const driversSnap = await getDocs(driversQuery);
    const availableDrivers = driversSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // Group orders by proximity
    const orderGroups = groupOrdersByProximity(pendingOrders);

    // Assign groups to available drivers
    for (const [groupId, orders] of Object.entries(orderGroups)) {
      const driver = findOptimalDriver(orders, availableDrivers);
      if (driver) {
        // Create assignment notification
        await setDoc(doc(db, 'assignments', `${groupId}-${driver.id}`), {
          driverId: driver.id,
          orders: orders.map(o => o.id),
          status: 'PENDING',
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes to respond
        });

        // Notify driver through SSE
        bus.publish({
          type: 'ROUTE_ASSIGNED',
          routeId: groupId,
          driverId: driver.id,
          orders: orders
        } as RouteAssignmentEvent);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Route planning error:', error);
    return NextResponse.json({ error: 'Route planning failed' }, { status: 500 });
  }
}

function groupOrdersByProximity(orders: Order[]) {
  // Simple grouping by creation time batches
  const groups: Record<string, Order[]> = {};
  const now = Date.now();
  
  orders.forEach(order => {
    const timeBatch = Math.floor(now / BATCH_INTERVAL);
    const groupId = `batch-${timeBatch}`;
    groups[groupId] = groups[groupId] || [];
    groups[groupId].push(order);
  });
  
  return groups;
}

function findOptimalDriver(orders: Order[], drivers: Driver[]) {
  // Simple round-robin assignment for now
  return drivers[Math.floor(Math.random() * drivers.length)];
}