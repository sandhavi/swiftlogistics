"use client";

import { useState, useEffect } from "react";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { app } from "@/app/lib/firebase"; 

const DELIVERY_COST = 200; // fixed delivery cost
const PRIORITY_COST = 150; // priority shipping extra cost

export default function CheckoutPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [address, setAddress] = useState({
    line1: "",
    city: "",
    postcode: "",
  });
  const [priority, setPriority] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Confirmation modal states
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const db = getFirestore(app);

  useEffect(() => {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  const subtotal = cart.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity,
    0
  );
  const total = subtotal + DELIVERY_COST + (priority ? PRIORITY_COST : 0);

  // Show confirmation popup after initial validation
  const handlePlaceOrderClick = () => {
    if (!address.line1 || !address.city || !address.postcode) {
      alert("Please fill in all delivery address fields.");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }
    setShowConfirmPopup(true);
  };

  // Confirm order and add to Firestore
  const confirmOrder = async () => {
    setShowConfirmPopup(false);
    setPlacingOrder(true);
    try {
      const orderPayload = {
        address,
        priority,
        cart,
        deliveryCost: DELIVERY_COST,
        priorityCost: priority ? PRIORITY_COST : 0,
        totalCost: total,
        createdAt: serverTimestamp(),
        status: "PENDING",
      };

      const docRef = await addDoc(collection(db, "orders"), orderPayload);

      if (docRef.id) {
        setOrderPlaced(true);
        localStorage.removeItem("cart");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        alert("Failed to place order.");
      }
    } catch (error) {
      console.error("Failed to add order to Firestore:", error);
      alert("Something went wrong while submitting your order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmPopup(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-start py-12 px-4">
      <div className="bg-white p-8 rounded shadow-md max-w-3xl w-full">
        <h1 className="text-3xl text-gray-800 font-bold mb-6">Checkout</h1>

        {/* Delivery Address Section */}
        <section className="mb-6">
          <h2 className="text-xl text-gray-800 font-semibold mb-3">Delivery Address</h2>
          <input
            type="text"
            placeholder="Address Line 1"
            value={address.line1}
            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
            className="w-full mb-3 p-2 border rounded"
          />
          <input
            type="text"
            placeholder="City"
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
            className="w-full mb-3 p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Postcode"
            value={address.postcode}
            onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
            className="w-full mb-3 p-2 border rounded"
          />
        </section>

        {/* Priority Shipping Toggle */}
        <section className="flex items-center space-x-3 mb-6">
          <input
            type="checkbox"
            id="priority"
            checked={priority}
            onChange={() => setPriority(!priority)}
          />
          <label htmlFor="priority" className="text-gray-700">
            Priority Shipping (adds Rs.{PRIORITY_COST})
          </label>
        </section>

        {/* Order Summary */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Order Summary</h2>
          <div className="max-h-48 overflow-y-auto border p-3 rounded mb-2">
            {cart.length === 0 ? (
              <p className="text-gray-500">Your cart is empty.</p>
            ) : (
              <ul>
                {cart.map((item) => (
                  <li key={item.id} className="flex justify-between mb-2">
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>Rs.{(parseFloat(item.price) || 0) * item.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t pt-2">
            <p>Subtotal: Rs.{subtotal}</p>
            <p>Delivery Cost: Rs.{DELIVERY_COST}</p>
            {priority && <p>Priority Cost: Rs.{PRIORITY_COST}</p>}
            <p className="font-bold text-lg mt-2">Total: Rs.{total}</p>
          </div>
        </section>

        {/* Place Order Button */}
        <section className="flex justify-end space-x-4">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400"
            disabled={placingOrder}
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceOrderClick}
            disabled={cart.length === 0 || placingOrder}
            className={`px-6 py-2 rounded text-white ${
              cart.length === 0 || placingOrder
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {placingOrder ? "Processing..." : "Place Order"}
          </button>
        </section>
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
            <h2 className="text-xl font-semibold mb-4">Confirm Your Order</h2>

            <div className="text-left mb-4">
              <h3 className="font-semibold">Delivery Address</h3>
              <p>{address.line1}</p>
              <p>{address.city}</p>
              <p>{address.postcode}</p>
            </div>

            <div className="text-left mb-4">
              <h3 className="font-semibold">Order Summary</h3>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>Rs.{(parseFloat(item.price) || 0) * item.quantity}</span>
                </div>
              ))}
              <div className="border-t mt-2 pt-2 font-bold flex justify-between">
                <span>Total:</span>
                <span>Rs.{total}</span>
              </div>
            </div>

            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={cancelConfirmation}
                className="px-6 py-2 rounded border border-gray-400 hover:bg-gray-100"
                disabled={placingOrder}
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                disabled={placingOrder}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {orderPlaced && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
            <svg
              className="mx-auto mb-4 w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-2xl font-semibold">
              Order Placed Successfully!
            </h2>
            <p className="mt-2">Thank you for your purchase.</p>
          </div>
        </div>
      )}
    </div>
  );
}
