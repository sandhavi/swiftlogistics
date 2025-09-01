"use client";

import { useEffect, useState } from 'react';
import AdminHeader from './components/Dashboard/AdminHeader';
import AdminSidebar from './components/Dashboard/AdminSidebar';
import DashboardStats from './components/Dashboard/DashboardStats';
import StockManagement from './components/Stock/StockManagement';
import DriverManagement from './components/Drivers/DriverManagement';
import ClientManagement from './components/Clients/ClientManagement';
import { getCurrentUserAndRole } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        (async () => {
            const { user, role } = await getCurrentUserAndRole();
            if (!user) {
                router.replace('/login');
                return;
            }
            if (role !== 'admin') {
                // Send to their appropriate dashboard
                if (role === 'client') router.replace('/client');
                else if (role === 'driver') router.replace('/driver');
                else router.replace('/');
                return;
            }
            setAuthChecked(true);
        })();
    }, [router]);

    // Handle tab changes from sidebar
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    // Render the active component based on the selected tab
    const renderActiveComponent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6 font-poppins">
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

    if (!authChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center font-poppins">Checking access…</div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-poppins">
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
