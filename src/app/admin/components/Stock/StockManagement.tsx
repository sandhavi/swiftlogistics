"use client";

import { useState, useEffect } from 'react';

// Define the Stock item interface
interface StockItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    location: string;
    updatedAt: string;
}

export default function StockManagement() {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState<Omit<StockItem, 'id' | 'updatedAt'>>({
        name: '',
        category: '',
        quantity: 0,
        unit: '',
        location: ''
    });
    const [formError, setFormError] = useState('');

    // Load stock data
    useEffect(() => {
        // In a real app, fetch from your API
        // For now, we'll use sample data
        const sampleData: StockItem[] = [
            {
                id: '1',
                name: 'Cardboard Box (Small)',
                category: 'Packaging',
                quantity: 250,
                unit: 'pcs',
                location: 'Warehouse A',
                updatedAt: '2025-08-10T10:30:00'
            },
            {
                id: '2',
                name: 'Bubble Wrap',
                category: 'Packaging',
                quantity: 500,
                unit: 'meters',
                location: 'Warehouse B',
                updatedAt: '2025-08-12T09:15:00'
            },
            {
                id: '3',
                name: 'Tape',
                category: 'Supplies',
                quantity: 75,
                unit: 'rolls',
                location: 'Warehouse A',
                updatedAt: '2025-08-15T14:20:00'
            },
            {
                id: '4',
                name: 'Labels',
                category: 'Supplies',
                quantity: 1000,
                unit: 'sheets',
                location: 'Office Storage',
                updatedAt: '2025-08-08T11:45:00'
            }
        ];

        setStockItems(sampleData);
        setIsLoading(false);
    }, []);

    // Handle adding new stock
    const handleAddStock = () => {
        if (!newItem.name || !newItem.category || newItem.quantity <= 0 || !newItem.unit || !newItem.location) {
            setFormError('Please fill in all fields correctly');
            return;
        }

        // In a real app, you'd send this to your API
        const newStockItem: StockItem = {
            id: Date.now().toString(),
            ...newItem,
            updatedAt: new Date().toISOString()
        };

        setStockItems([newStockItem, ...stockItems]);
        setIsAddModalOpen(false);
        setNewItem({
            name: '',
            category: '',
            quantity: 0,
            unit: '',
            location: ''
        });
        setFormError('');
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
                ) : stockItems.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-gray-500">No stock items found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Item Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quantity
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Updated
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {item.quantity} {item.unit}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(item.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                                            <button className="text-red-600 hover:text-red-900">Delete</button>
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
                        <h2 className="text-2xl font-bold mb-6">Add New Stock Item</h2>

                        {formError && (
                            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{formError}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <input
                                    id="itemName"
                                    type="text"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter item name"
                                />
                            </div>

                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    id="category"
                                    type="text"
                                    value={newItem.category}
                                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter category"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        id="quantity"
                                        type="number"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter quantity"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <input
                                        id="unit"
                                        type="text"
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., pcs, kg, liters"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input
                                    id="location"
                                    type="text"
                                    value={newItem.location}
                                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter storage location"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setFormError('');
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddStock}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
