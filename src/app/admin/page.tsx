"use client";

import { useState } from 'react';
import AdminHeader from './components/Dashboard/AdminHeader';
import AdminSidebar from './components/Dashboard/AdminSidebar';
import DashboardStats from './components/Dashboard/DashboardStats';
import StockManagement from './components/Stock/StockManagement';
import DriverManagement from './components/Drivers/DriverManagement';
import ClientManagement from './components/Clients/ClientManagement';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');

    // Handle tab changes from sidebar
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    // Render the active component based on the selected tab
    const renderActiveComponent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                        <DashboardStats />
                    </div>
                );
            case 'stock':
                return <StockManagement />;
            case 'drivers':
                return <DriverManagement />;
            case 'clients':
                return <ClientManagement />;
            default:
                return <div>Select a tab from the sidebar</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <AdminHeader />

            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16">
                    <AdminSidebar onTabChange={handleTabChange} activeTab={activeTab} />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-8 overflow-auto">
                    {renderActiveComponent()}
                </div>
            </div>
        </div>
    );
}
