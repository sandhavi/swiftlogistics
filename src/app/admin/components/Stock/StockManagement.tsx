"use client";

import { useState, useEffect } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Define the Stock item interface
interface StockItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    price: number;
    updatedAt: string; // ISO string
}

export default function StockManagement() {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newItem, setNewItem] = useState<Omit<StockItem, 'id' | 'updatedAt'>>({
        name: '',
        category: '',
        quantity: 0,
        unit: '',
        price: 0
    });
    const [editItem, setEditItem] = useState<StockItem | null>(null);
    const [formError, setFormError] = useState('');
    const [editError, setEditError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [loadError, setLoadError] = useState('');

    // Load stock data (real-time subscription)
    useEffect(() => {
        setIsLoading(true);
        setLoadError('');
        try {
            const colRef = collection(db, 'stock');
            const q = query(colRef, orderBy('updatedAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const items: StockItem[] = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    // Handle timestamp/ISO string gracefully
                    let updatedISO = new Date().toISOString();
                    const ts = data.updatedAt;
                    if (ts) {
                        if (ts instanceof Timestamp) {
                            updatedISO = ts.toDate().toISOString();
                        } else if (typeof ts === 'string') {
                            const parsed = Date.parse(ts);
                            if (!isNaN(parsed)) updatedISO = new Date(parsed).toISOString();
                        }
                    }
                    return {
                        id: doc.id,
                        name: data.name || 'Unnamed',
                        category: data.category || 'Uncategorized',
                        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
                        unit: data.unit || '',
                        price: data.price || '',
                        updatedAt: updatedISO,
                    };
                });
                setStockItems(items);
                setIsLoading(false);
            }, (err) => {
                console.error('Stock listener error', err);
                setLoadError('Failed to load stock items.');
                setIsLoading(false);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error('Stock subscription setup failed', e);
            setLoadError('Failed to subscribe to stock updates.');
            setIsLoading(false);
        }
    }, []);

    // Validate form
    function validateNewItem() {
        if (!newItem.name.trim()) return 'Item name is required';
        if (!newItem.category.trim()) return 'Category is required';
        if (newItem.quantity <= 0 || Number.isNaN(newItem.quantity)) return 'Quantity must be a positive number';
        if (!newItem.unit.trim()) return 'Unit is required';
        if (newItem.price <= 0 || Number.isNaN(newItem.price)) return 'Price must be a positive number';
        return '';
    }

    // Handle adding new stock (Firestore persistence)
    const handleAddStock = async () => {
        const validation = validateNewItem();
        if (validation) {
            setFormError(validation);
            return;
        }
        setFormError('');
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'stock'), {
                name: newItem.name.trim(),
                category: newItem.category.trim(),
                quantity: newItem.quantity,
                unit: newItem.unit.trim(),
                price: newItem.price,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            // Close and reset
            setIsAddModalOpen(false);
            setNewItem({ name: '', category: '', quantity: 0, unit: '', price: 0 });
        } catch (e) {
            console.error('Add stock failed', e);
            setFormError('Failed to save item. Please retry.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Stock Management</h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                    + Add Stock Item
                </button>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto"></div>
                        <p className="mt-2 text-gray-500">Loading stock data...</p>
                    </div>
                ) : loadError ? (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <p className="text-sm text-red-700">{loadError}</p>
                    </div>
                ) : stockItems.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-gray-500">No stock items found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{item.category}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity} {item.unit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.price}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.updatedAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                className="text-indigo-600 hover:text-indigo-800 mr-3"
                                                onClick={() => { setEditItem(item); setIsEditModalOpen(true); setEditError(''); }}
                                            >Edit</button>
                                            <button
                                                className="text-red-600 hover:text-red-800"
                                                onClick={() => { setEditItem(item); setIsDeleteModalOpen(true); setDeleteError(''); }}
                                            >Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Stock Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-50/90 flex items-center justify-center z-50">
                    <div className="bg-white shadow-xl rounded-lg p-8 max-w-2xl w-full mx-4">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">Add New Stock Item</h2>

                        {formError && (
                            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                                <p className="text-sm text-red-700">{formError}</p>
                            </div>
                        )}

                        <div className="space-y-4 text-gray-700">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter item name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    type="text"
                                    value={newItem.category}
                                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter category"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value || '0', 10) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter quantity"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <input
                                        type="text"
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., pcs, kg, liters"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                <input
                                    type="text"
                                    value={newItem.price}
                                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter unit Price"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => { setIsAddModalOpen(false); setFormError(''); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddStock}
                                disabled={isSaving}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60"
                            >
                                {isSaving ? 'Saving...' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Stock Modal */}
            {isEditModalOpen && editItem && (
                <div className="fixed inset-0 bg-slate-50/90 flex items-center justify-center z-50">
                    <div className="bg-white shadow-xl rounded-lg p-8 max-w-2xl w-full mx-4">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Stock Item</h2>

                        {editError && (
                            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                                <p className="text-sm text-red-700">{editError}</p>
                            </div>
                        )}

                        <div className="space-y-4 text-gray-700">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <input
                                    type="text"
                                    value={editItem.name}
                                    onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter item name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    type="text"
                                    value={editItem.category}
                                    onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter category"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        value={editItem.quantity}
                                        onChange={(e) => setEditItem({ ...editItem, quantity: parseInt(e.target.value || '0', 10) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter quantity"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <input
                                        type="text"
                                        value={editItem.unit}
                                        onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., pcs, kg, liters"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                <input
                                    type="text"
                                    value={editItem.price}
                                    onChange={(e) => setEditItem({ ...editItem, price: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter unit Price"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => { setIsEditModalOpen(false); setEditItem(null); setEditError(''); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setEditError('');
                                    setIsSaving(true);
                                    try {
                                        if (!editItem.name.trim()) throw new Error('Item name is required');
                                        if (!editItem.category.trim()) throw new Error('Category is required');
                                        if (editItem.quantity <= 0 || Number.isNaN(editItem.quantity)) throw new Error('Quantity must be a positive number');
                                        if (!editItem.unit.trim()) throw new Error('Unit is required');
                                        if (editItem.price <= 0 || Number.isNaN(editItem.price)) throw new Error('Price must be a positive number');
                                        await updateDoc(doc(db, 'stock', editItem.id), {
                                            name: editItem.name.trim(),
                                            category: editItem.category.trim(),
                                            quantity: editItem.quantity,
                                            unit: editItem.unit.trim(),
                                            price: editItem.price,
                                            updatedAt: serverTimestamp(),
                                        });
                                        setIsEditModalOpen(false);
                                        setEditItem(null);
                                    } catch (e: unknown) {
                                        setEditError(e instanceof Error ? e.message : 'Failed to update item.');
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                disabled={isSaving}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Stock Modal */}
            {isDeleteModalOpen && editItem && (
                <div className="fixed inset-0 bg-slate-50/90 flex items-center justify-center z-50">
                    <div className="bg-white shadow-xl rounded-lg p-8 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">Delete Stock Item</h2>
                        {deleteError && (
                            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                                <p className="text-sm text-red-700">{deleteError}</p>
                            </div>
                        )}
                        <p className="mb-6 text-gray-700">Are you sure you want to delete <span className="font-semibold">{editItem.name}</span>? This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setIsDeleteModalOpen(false); setEditItem(null); setDeleteError(''); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setDeleteError('');
                                    setIsSaving(true);
                                    try {
                                        await deleteDoc(doc(db, 'stock', editItem.id));
                                        setIsDeleteModalOpen(false);
                                        setEditItem(null);
                                    } catch (e: unknown) {
                                        setDeleteError(e instanceof Error ? e.message : 'Failed to delete item.');
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                disabled={isSaving}
                                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
                            >
                                {isSaving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}