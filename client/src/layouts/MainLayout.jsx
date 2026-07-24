import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { selectCurrentUser } from '../store/authSlice';

const BOTTOM_NAV_ROLES = ['driver', 'delivery', 'sales_rep'];

export default function MainLayout() {
  const user       = useSelector(selectCurrentUser);
  const role       = user?.Role?.name;
  const useBottomNav = BOTTOM_NAV_ROLES.includes(role);

  if (useBottomNav) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
        {/* Slim top bar — just app name + notification bell */}
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
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
