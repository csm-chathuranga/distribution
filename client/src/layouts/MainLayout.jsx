import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import LocationTracker from '../components/LocationTracker';
import { selectCurrentUser } from '../store/authSlice';
import { useFirestoreSync } from '../hooks/useFirestoreSync';

const BOTTOM_NAV_ROLES = ['driver', 'delivery', 'sales_rep'];

export default function MainLayout() {
  const user       = useSelector(selectCurrentUser);
  const role       = user?.Role?.name;
  const useBottomNav = BOTTOM_NAV_ROLES.includes(role);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useFirestoreSync();

  if (useBottomNav) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50/50">
        <LocationTracker />
        <Header minimal />
        <main className="flex-1 overflow-y-auto p-4 pb-24">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
