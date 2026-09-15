import { Outlet } from 'react-router-dom';
import { Sidebar, TopBar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export function AdminLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar role="ADMIN" />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export function StaffLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar role="INVENTORY_STAFF" />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
