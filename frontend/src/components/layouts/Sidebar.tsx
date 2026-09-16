import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/api';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GlobalSearch } from '../ui/GlobalSearch';
import logoUrl from '../../assets/logo.png';
import {
  LayoutDashboard, Package, Tag, Ruler, Building2, MapPin,
  Truck, Users, BarChart3, FileText, ClipboardList, LogOut,
  ChevronDown, ChevronRight, Warehouse, Shield, AlertTriangle,
  ArrowDownCircle, ArrowUpCircle, RefreshCcw, History, Settings,
  Menu, X, TrendingUp, Sun, Moon, Bell, BellRing,
} from 'lucide-react';

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  children: { label: string; to: string; icon: React.ReactNode }[];
}

const adminNav: (NavGroup | { label: string; to: string; icon: React.ReactNode })[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Masters', icon: <Package size={18} />,
    children: [
      { label: 'Products', to: '/admin/products', icon: <Package size={16} /> },
      { label: 'Categories', to: '/admin/categories', icon: <Tag size={16} /> },
      { label: 'Units', to: '/admin/units', icon: <Ruler size={16} /> },
      { label: 'Warehouses', to: '/admin/warehouses', icon: <Building2 size={16} /> },
      { label: 'Locations', to: '/admin/locations', icon: <MapPin size={16} /> },
      { label: 'Suppliers', to: '/admin/suppliers', icon: <Truck size={16} /> },
      { label: 'Customers', to: '/admin/customers', icon: <Users size={16} /> },
    ],
  },
  {
    label: 'Inventory', icon: <Warehouse size={18} />,
    children: [
      { label: 'Current Inventory', to: '/admin/inventory', icon: <BarChart3 size={16} /> },
      { label: 'Stock In', to: '/admin/stock-in', icon: <ArrowDownCircle size={16} /> },
      { label: 'Stock Out', to: '/admin/stock-out', icon: <ArrowUpCircle size={16} /> },
      { label: 'Adjustments', to: '/admin/adjustments', icon: <RefreshCcw size={16} /> },
      { label: 'Movement History', to: '/admin/movements', icon: <History size={16} /> },
    ],
  },
  {
    label: 'Reports', icon: <FileText size={18} />,
    children: [
      { label: 'Stock Report', to: '/admin/reports/stock', icon: <BarChart3 size={16} /> },
      { label: 'Stock Ageing', to: '/admin/reports/ageing', icon: <AlertTriangle size={16} /> },
      { label: 'Stock Movement', to: '/admin/reports/movements', icon: <TrendingUp size={16} /> },
    ],
  },
  { label: 'Users', to: '/admin/users', icon: <Shield size={18} /> },
  { label: 'Audit Logs', to: '/admin/audit-logs', icon: <ClipboardList size={18} /> },
];

const staffNav = [
  { label: 'Dashboard', to: '/inventory/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Inventory', icon: <Warehouse size={18} />,
    children: [
      { label: 'Current Stock', to: '/inventory/current-stock', icon: <BarChart3 size={16} /> },
      { label: 'Stock In', to: '/inventory/stock-in', icon: <ArrowDownCircle size={16} /> },
      { label: 'Stock Out', to: '/inventory/stock-out', icon: <ArrowUpCircle size={16} /> },
      { label: 'Movement History', to: '/inventory/movements', icon: <History size={16} /> },
    ],
  },
  {
    label: 'Reports', icon: <FileText size={18} />,
    children: [
      { label: 'Stock Report', to: '/inventory/reports/stock', icon: <BarChart3 size={16} /> },
    ],
  },
];

function NavItem({ item, collapsed }: { item: unknown; collapsed?: boolean }) {
  const [open, setOpen] = useState(true);
  const i = item as any;

  if (i.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="nav-item w-full justify-between group"
        >
          <span className="flex items-center gap-3">
            {i.icon}
            <span className="text-sm">{i.label}</span>
          </span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="nav-group mt-1 mb-1 space-y-0.5">
            {i.children.map((child: any) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''} text-xs`
                }
              >
                {child.icon}
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={i.to}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      onClick={() => {
        const { setMobileOpen } = useSidebarContext();
        if (window.innerWidth < 1024) setMobileOpen(false);
      }}
    >
      {i.icon}
      {i.label}
    </NavLink>
  );
}

// Mobile sidebar state context
interface SidebarContextType {
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}
const SidebarContext = createContext<SidebarContextType>({ mobileOpen: false, setMobileOpen: () => {} });

export function useSidebarContext() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar({ role }: { role: 'ADMIN' | 'INVENTORY_STAFF' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { mobileOpen, setMobileOpen } = useSidebarContext();
  const nav = role === 'ADMIN' ? adminNav : staffNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div 
          className="px-5 py-6 border-b border-white/10 flex items-center justify-between"
          aria-label="WIMS - Warehouse Management System"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[14px] bg-white border border-indigo-400/20 shadow-sm flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-[1.03] hover:shadow-indigo-500/25 p-1.5">
              <img src={logoUrl} alt="WIMS Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-white font-bold text-[21px] leading-none tracking-tight mb-1">
                WIMS
              </p>
              <p className="text-slate-400 text-[13px] font-medium leading-[1.3]">
                Warehouse Management<br />System
              </p>
            </div>
          </div>
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-white/08">
          <span className={`badge text-xs ${role === 'ADMIN' ? 'badge-in' : 'badge-healthy'}`}>
            {role === 'ADMIN' ? '🛡 Admin Portal' : '📦 Staff Portal'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-0.5 px-1">
          {nav.map((item: any, i) => (
            <NavItem key={i} item={item} />
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/08">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary btn w-full justify-center text-xs py-2"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => dashboardService.inventory().then(r => r.data),
    refetchInterval: 30000,
  });

  const alerts: any[] = [];
  if (data?.low_stock_products) {
    data.low_stock_products.forEach((p: any) => {
      alerts.push({
        id: `low-${p.sku}`,
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${p.product_name} is running low (${p.available} left).`,
        time: 'Just now',
        icon: <AlertTriangle size={16} className="text-amber-400" />
      });
    });
  }
  if (data?.recent_stock_out) {
    data.recent_stock_out.forEach((so: any) => {
      if (so.quantity >= 100) {
        alerts.push({
          id: `so-${so.id}`,
          type: 'alert',
          title: 'Massive Adjustment',
          message: `${so.user || 'Someone'} removed ${so.quantity} units of ${so.product}.`,
          time: 'Recently',
          icon: <Package size={16} className="text-red-400" />
        });
      }
    });
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const unread = alerts.length > 0;

  return (
    <div className="relative" ref={bellRef}>
      <button 
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center glass hover:bg-white/10 transition-colors"
      >
        {unread ? <BellRing size={18} className="text-indigo-400 animate-pulse" /> : <Bell size={18} className="text-slate-400" />}
        {unread && (
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card p-0 border border-white/10 shadow-2xl overflow-hidden z-50 bg-slate-900 notification-dropdown">
          <div className="px-4 py-3 border-b border-white/10 bg-white/05 flex justify-between items-center">
            <h4 className="font-semibold text-white">Notifications</h4>
            <span className="badge badge-in">{alerts.length} New</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No new notifications
              </div>
            ) : (
              alerts.map(a => (
                <div key={a.id} className="p-4 border-b border-white/05 hover:bg-white/05 transition-colors flex gap-3 cursor-pointer">
                  <div className="mt-0.5">{a.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{a.title}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{a.message}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">{a.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { setMobileOpen } = useSidebarContext();

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-4 lg:px-6 topbar lg:w-[calc(100%-var(--sidebar-width))] w-full"
      style={{
        height: 'var(--header-height)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-3">
        <button 
          className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="page-title text-base lg:text-lg truncate">{title}</h1>
          {subtitle && <p className="page-subtitle hidden sm:block truncate">{subtitle}</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <NotificationBell />
        <button 
          onClick={toggleTheme} 
          className="w-10 h-10 rounded-full flex items-center justify-center glass hover:bg-white/10 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
        </button>
      </div>
    </header>
  );
}
