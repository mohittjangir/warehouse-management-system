import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminRoute, StaffRoute, ProtectedRoute } from './routes/ProtectedRoute';
import { AdminLayout, StaffLayout } from './components/layouts/Layout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboard';
import InventoryDashboardPage from './pages/inventory/InventoryDashboard';
import CurrentStockPage from './pages/inventory/CurrentStockPage';
import StockInPage from './pages/inventory/StockInPage';
import StockOutPage from './pages/inventory/StockOutPage';
import MovementsPage from './pages/inventory/MovementsPage';

// Lazy admin pages (code-split)
import { lazy, Suspense } from 'react';
import { PageLoader } from './components/ui/LoadingSpinner';

const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));
const MastersPage = lazy(() => import('./pages/admin/MastersPage'));
const ReportsPage = lazy(() => import('./pages/shared/ReportsPage'));
const AdjustmentsPage = lazy(() => import('./pages/admin/AdjustmentsPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Admin Portal */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
                <Route path="products/:id" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
                <Route path="categories" element={<Suspense fallback={<PageLoader />}><MastersPage tab="categories" /></Suspense>} />
                <Route path="units" element={<Suspense fallback={<PageLoader />}><MastersPage tab="units" /></Suspense>} />
                <Route path="warehouses" element={<Suspense fallback={<PageLoader />}><MastersPage tab="warehouses" /></Suspense>} />
                <Route path="locations" element={<Suspense fallback={<PageLoader />}><MastersPage tab="locations" /></Suspense>} />
                <Route path="suppliers" element={<Suspense fallback={<PageLoader />}><MastersPage tab="suppliers" /></Suspense>} />
                <Route path="customers" element={<Suspense fallback={<PageLoader />}><MastersPage tab="customers" /></Suspense>} />
                <Route path="inventory" element={<CurrentStockPage />} />
                <Route path="current-stock" element={<Navigate to="/admin/inventory" replace />} />
                <Route path="stock-in" element={<StockInPage />} />
                <Route path="stock-out" element={<StockOutPage />} />
                <Route path="adjustments" element={<Suspense fallback={<PageLoader />}><AdjustmentsPage /></Suspense>} />
                <Route path="movements" element={<MovementsPage />} />
                <Route path="reports/stock" element={<Suspense fallback={<PageLoader />}><ReportsPage type="stock" /></Suspense>} />
                <Route path="reports/ageing" element={<Suspense fallback={<PageLoader />}><ReportsPage type="ageing" /></Suspense>} />
                <Route path="reports/movements" element={<Suspense fallback={<PageLoader />}><ReportsPage type="movements" /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
                <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              </Route>

              {/* Inventory Staff Portal */}
              <Route path="/inventory" element={<StaffRoute><StaffLayout /></StaffRoute>}>
                <Route index element={<Navigate to="/inventory/dashboard" replace />} />
                <Route path="dashboard" element={<InventoryDashboardPage />} />
                <Route path="current-stock" element={<CurrentStockPage />} />
                <Route path="stock-in" element={<StockInPage />} />
                <Route path="stock-out" element={<StockOutPage />} />
                <Route path="movements" element={<MovementsPage />} />
                <Route path="reports/stock" element={<Suspense fallback={<PageLoader />}><ReportsPage type="stock" /></Suspense>} />
              </Route>

              {/* 404 fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
