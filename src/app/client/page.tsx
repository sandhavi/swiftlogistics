"use client";
import { auth } from "@/app/lib/firebase";
import { signOut } from "firebase/auth";

import { getFirestore, collection, getDocs } from "firebase/firestore";

import { useEffect, useRef, useState, useCallback } from "react";
import OrderList from "@/app/components/OrderList";
import { Order, Package, UpdateEvent } from "@/app/lib/types";
import { toast } from "react-toastify";

type OrderRow = Pick<Order, "id" | "clientId" | "status" | "routeId"> & {
  packages: Pick<Package, "id" | "description" | "status">[];
};

type Product ={
  id: string;
  name: string;
  price?: number;
  quantity?: number;
  // image?: string;
}

type cartItem = {
  id: string;
  name: string;
  price?: number;
  quantity: number;
};

export default function ClientDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const db = getFirestore();
  const [products, setProducts] = useState<Product[]>([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cartItems, setCartItems] = useState<cartItem[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || user.email);
    }
  }, []);

  useEffect(() => {
    if (products.length) {
      const initialQuantities: { [key: string]: number } = {};
      products.forEach((product) => {
        initialQuantities[product.id] = 1;
      });
      setQuantities(initialQuantities);
    }
  }, [products]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [newOrder, setNewOrder] = useState({
    clientId: "client123",
    driverId: "driverA",
    packages: [{ description: "", address: "" }],
  });
  const esRef = useRef<EventSource | null>(null);

  async function loadProducts() {
    try {
      const productsCol = collection(db, "stock");
      const productsSnapshot = await getDocs(productsCol);
      const productsList = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsList);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  }

  async function loadOrders() {
    try {
      const res = await fetch("/api/orders", {
        cache: "no-store",
        headers: { "x-api-key": "dev-key" },
      });
      const data = await res.json();
      setOrders(data.orders || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to load orders:", error);
    }
  }

  // Auto-refresh function
  const triggerRefresh = useCallback(() => {
    loadOrders();
  }, []);

  const handleEvent = useCallback(
    (e: UpdateEvent) => {
      // Trigger refresh on any event
      triggerRefresh();
    },
    [triggerRefresh]
  );

  useEffect(() => {
    loadOrders();
    loadProducts();

    const es = new EventSource("/api/updates");
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        handleEvent(JSON.parse(ev.data));
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    };
    return () => {
      es.close();
    };
  }, [handleEvent]);

  function updateOrderList(
    existing: OrderRow[],
    updated: OrderRow
  ): OrderRow[] {
    const found = existing.some((o) => o.id === updated.id);
    return found
      ? existing.map((o) => (o.id === updated.id ? updated : o))
      : [updated, ...existing];
  }

  function updatePackage(
    order: OrderRow,
    pkg: { id: string; description: string; status: Package["status"] }
  ): OrderRow {
    const idx = order.packages.findIndex((p) => p.id === pkg.id);
    if (idx < 0) return order;
    const nextPkgs = [...order.packages];
    nextPkgs[idx] = pkg;
    return { ...order, packages: nextPkgs };
  }

  function incrementQuantity(id: string) {
    setQuantities((prev) => ({ ...prev, [id]: (prev[id] || 1) + 1 }));
  }

  function decrementQuantity(id: string) {
    setQuantities((prev) => ({
      ...prev,
      [id]: prev[id] && prev[id] > 1 ? prev[id] - 1 : 1,
    }));
  }

  function addToCart(product: Product) {
    const qty = quantities[product.id] || 1;
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += qty;
        return updated;
      }
      // Add new product to cart
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: qty,
        },
      ];
    });
    setAddedMessage(product.id);
    toast.success(`${product.name} added to cart!`);
    setTimeout(() => setAddedMessage(null), 1500);
  }

  function incrementCartQuantity(id: string) {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  function decrementCartQuantity(id: string) {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  }

  function removeFromCart(id: string) {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }

  function clearCart() {
    setCartItems([]);
  }

  async function submitOrder() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "dev-key" },
        body: JSON.stringify(newOrder),
      });
      await res.json();
      setShowOrderForm(false);
      setNewOrder({
        clientId: "client123",
        driverId: "driverA",
        packages: [{ description: "", address: "" }],
      });
      // Auto-refresh after order submission
      setTimeout(() => {
        triggerRefresh();
      }, 500);
    } catch (error) {
      console.error("Failed to submit order:", error);
    } finally {
      setSubmitting(false);
    }
  }

  const addPackage = () => {
    setNewOrder((prev) => ({
      ...prev,
      packages: [...prev.packages, { description: "", address: "" }],
    }));
  };

  const removePackage = (index: number) => {
    setNewOrder((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index),
    }));
  };

  const updateNewOrderPackage = (
    index: number,
    field: "description" | "address",
    value: string
  ) => {
    setNewOrder((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) =>
        i === index ? { ...pkg, [field]: value } : pkg
      ),
    }));
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    inProgress: orders.filter(
      (o) => o.status === "IN_WMS" || o.status === "ROUTED"
    ).length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    failed: orders.filter((o) => o.status === "FAILED").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Info and Logout */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end py-2">
          {userName && (
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium">
                Welcome, {userName}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Client Portal
              </h1>
              <p className="text-gray-600">
                Manage your orders and track deliveries in real-time
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={triggerRefresh}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowOrderForm(true)}
                className="relative bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors px-6 py-3 rounded-lg"
              >
                My Cart 🛒
                {cartItems.length > 0 && (
                  <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 mx-4 relative">
            {/* Header with title and count */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                My Cart Items
              </h2>
              <span className="text-gray-700 font-semibold">
                {cartItems.length}{" "}
                {cartItems.length === 1 ? "product" : "products"}
              </span>
            </div>

            {/* Cart list */}
            {cartItems.length === 0 ? (
              <p className="text-gray-600">Your cart is empty.</p>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto mb-6">
                {cartItems.map((item) => (
                  <li
                    key={item.id}
                    className="py-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.price || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => decrementCartQuantity(item.id)}
                        className="px-2 py-1 bg-gray-200 rounded text-gray-900"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => incrementCartQuantity(item.id)}
                        className="px-2 py-1 bg-gray-200 rounded text-gray-900"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-3 text-red-600 hover:text-red-800 font-semibold"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Footer buttons */}
            <div className="flex justify-between items-center space-x-4 mt-4">
              <button
                onClick={clearCart}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={cartItems.length === 0}
              >
                Clear Cart
              </button>
              <button
                onClick={() => setShowOrderForm(false)}
                className="px-6 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
              >
                Back to Products
              </button>
              <button
                onClick={() => {
                  if (cartItems.length === 0) return;
                  // Navigate to checkout page with cart data or implement checkout logic here
                  // Example: window.location.href = `/checkout?cart=${encodeURIComponent(JSON.stringify(cartItems))}`;
                  alert(
                    "Proceeding to checkout with " +
                      cartItems.length +
                      " products."
                  );
                }}
                className={`px-6 py-2 rounded text-white ${
                  cartItems.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                disabled={cartItems.length === 0}
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Orders
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.pending}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.inProgress}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.delivered}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.failed}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Modal */}
        {modalVisible && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 relative">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                {selectedProduct.name}
              </h2>

              <div className="mb-6">
                {/* <img
                  src={selectedProduct.image || ""}
                  alt={selectedProduct.name}
                  className="w-full max-h-60 object-contain rounded mb-4"
                /> */}
                <p className="text-gray-700 mb-2">
                  Price: {selectedProduct.price || "N/A"}
                </p>
                <p className="text-gray-700 mb-2">
                  Stock: {selectedProduct.quantity || "N/A"}
                </p>
                {/* Add other basic details here as needed */}
              </div>

              <div className="flex items-center space-x-3 mb-6">
                <button
                  onClick={() => decrementQuantity(selectedProduct.id)}
                  className="px-3 py-1 bg-gray-200 rounded text-gray-900"
                >
                  -
                </button>
                <span className="text-lg font-medium text-gray-900">
                  {quantities[selectedProduct.id] || 1}
                </span>
                <button
                  onClick={() => incrementQuantity(selectedProduct.id)}
                  className="px-3 py-1 bg-gray-200 rounded text-gray-900"
                >
                  +
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                    setAddedMessage(selectedProduct.id);
                    setTimeout(() => setAddedMessage(null), 1500);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add to Cart 🛒
                </button>
                <button
                  onClick={() => {
                    const qty = quantities[selectedProduct.id] || 1;
                    window.location.href = `/checkout?productId=${selectedProduct.id}&qty=${qty}`;
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Checkout
                </button>
                <button
                  onClick={() => setModalVisible(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100 text-gray-900"
                >
                  Cancel
                </button>
              </div>

              {/* Added to cart message */}
              {addedMessage === selectedProduct.id && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded text-sm animate-fadeInOut">
                  Added to cart
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Section */}
        <div className="relative bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Products in Stock
          </h2>

          {!showAllProducts && (
            <div className="flex overflow-hidden">
              {products.slice(0, 4).map((product) => (
                <div
                  key={product.id}
                  className="border rounded p-4 mr-4 w-60 flex-shrink-0"
                  onClick={() => {
                    setSelectedProduct(product);
                    setModalVisible(true);
                  }}
                >
                  {/* <div className="mb-2 h-40 flex justify-center items-center bg-gray-100 rounded">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name || "Product image"}
                        className="object-cover h-full w-full rounded"
                      />
                    ) : (
                      "Image not found"
                    )}
                  </div> */}
                  <h3 className="font-semibold mb-1 text-gray-900">
                    {product.name || "Unnamed Product"}
                  </h3>
                  <p className="text-gray-600 mb-1">{product.price || "N/A"}</p>
                  <p className="text-sm text-gray-500 mb-3">
                    Stock: {product.quantity || "N/A"}
                  </p>
                  <div className="flex items-center space-x-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        decrementQuantity(product.id);
                      }}
                      className="px-2 py-1 bg-gray-200 rounded text-gray-900"
                    >
                      -
                    </button>
                    <span className="text-gray-900">
                      {quantities[product.id] || 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        incrementQuantity(product.id);
                      }}
                      className="px-2 py-1 bg-gray-200 rounded text-gray-900"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Add to Cart 🛒
                  </button>
                </div>
              ))}

              {/* Hovering > toggle button */}
              {products.length > 4 && (
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="absolute right-6 top-16 h-12 w-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold hover:bg-blue-700 transition"
                  title="Show all products"
                  style={{ cursor: "pointer" }}
                >
                  &gt;
                </button>
              )}
            </div>
          )}

          {showAllProducts && (
            <div>
              <div className="grid grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="border rounded p-4"
                    onClick={() => {
                      setSelectedProduct(product);
                      setModalVisible(true);
                    }}
                  >
                    {/* <div className="mb-2 h-40 flex justify-center items-center bg-gray-100 rounded">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name || "Product image"}
                          className="object-cover h-full w-full rounded"
                        />
                      ) : (
                        "Image not found"
                      )}
                    </div> */}
                    <h3 className="font-semibold mb-1 text-gray-900">
                      {product.name || "Unnamed Product"}
                    </h3>
                    <p className="text-gray-600 mb-1">
                      {product.price || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500 mb-3">
                      Stock: {product.quantity || "N/A"}
                    </p>
                    <div className="flex items-center space-x-2 mb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          decrementQuantity(product.id);
                        }}
                        className="px-2 py-1 bg-gray-200 rounded text-gray-900"
                      >
                        -
                      </button>
                      <span className="text-gray-900">
                        {quantities[product.id] || 1}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          incrementQuantity(product.id);
                        }}
                        className="px-2 py-1 bg-gray-200 rounded text-gray-900"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                      Add to Cart 🛒
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowAllProducts(false)}
                className="mt-4 bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 text-gray-900"
              >
                Show Less
              </button>
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Orders</h2>
            <button
              onClick={triggerRefresh}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
          <div className="p-6">
            <OrderList orders={orders} />
          </div>
        </div>
      </div>
    </div>
  );
}
