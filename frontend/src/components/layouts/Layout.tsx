import { Outlet } from 'react-router-dom';
import { Sidebar, SidebarProvider } from './Sidebar';

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <Sidebar role="ADMIN" />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}

export function StaffLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <Sidebar role="INVENTORY_STAFF" />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
