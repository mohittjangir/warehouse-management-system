import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/api';
import { StatCard } from '../../components/ui/StatCard';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { StockBadge } from '../../components/ui/StockBadge';
import { TopBar } from '../../components/layouts/Sidebar';
import {
  Package, Boxes, TrendingUp, TrendingDown, AlertTriangle, XCircle,
  ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import { formatTimeAgo } from '../../utils/helpers';
import type { InventoryDashboard, StockStatus } from '../../types';

export default function InventoryDashboardPage() {
  const { data, isLoading, error } = useQuery<InventoryDashboard>({
    queryKey: ['inventory-dashboard'],
    queryFn: () => dashboardService.inventory().then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <><TopBar title="Inventory Dashboard" /><PageLoader /></>;
  if (error || !data) return (
    <><TopBar title="Inventory Dashboard" />
    <div className="card text-red-400 text-sm">Failed to load dashboard. Is backend running?</div></>
  );

  const statCards = [
    { title: 'Total Products', value: data.total_products, icon: <Package size={22} className="text-indigo-400" />, accentColor: 'linear-gradient(90deg,#6366f1,#818cf8)' },
    { title: 'Available Stock', value: data.available_stock.toLocaleString(), icon: <Boxes size={22} className="text-violet-400" />, accentColor: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' },
    { title: 'Total Cartons', value: data.total_cartons.toLocaleString(), icon: <Package size={22} className="text-blue-400" />, accentColor: 'linear-gradient(90deg,#3b82f6,#60a5fa)' },
    { title: 'Stock In Today', value: data.stock_in_today.toLocaleString(), icon: <TrendingUp size={22} className="text-emerald-400" />, accentColor: 'linear-gradient(90deg,#10b981,#34d399)' },
    { title: 'Stock Out Today', value: data.stock_out_today.toLocaleString(), icon: <TrendingDown size={22} className="text-orange-400" />, accentColor: 'linear-gradient(90deg,#f97316,#fb923c)' },
    { title: 'Low Stock', value: data.low_stock_count, icon: <AlertTriangle size={22} className="text-amber-400" />, accentColor: 'linear-gradient(90deg,#f59e0b,#fbbf24)' },
    { title: 'Out of Stock', value: data.out_of_stock_count, icon: <XCircle size={22} className="text-red-400" />, accentColor: 'linear-gradient(90deg,#ef4444,#f87171)' },
  ];

  return (
    <>
      <TopBar title="Inventory Dashboard" subtitle="Real-time stock overview" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {statCards.map(card => <StatCard key={card.title} {...card} />)}
      </div>

      {/* Recent movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Stock In */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownCircle size={18} className="text-emerald-400" />
            <h3 className="text-white font-semibold">Recent Stock In</h3>
          </div>
          <div className="space-y-3">
            {data.recent_stock_in.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No recent stock in</p>
            ) : (
              data.recent_stock_in.map(txn => (
                <div key={txn.id} className="flex items-center justify-between py-2 border-b border-white/05 last:border-0">
                  <div>
                    <p className="text-sm text-white font-medium">{txn.product}</p>
                    <p className="text-xs text-slate-500">{txn.txn_number} · {txn.user}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-semibold text-sm">+{txn.quantity.toLocaleString()}</p>
                    <p className="text-slate-600 text-xs">{formatTimeAgo(txn.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Stock Out */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle size={18} className="text-red-400" />
            <h3 className="text-white font-semibold">Recent Stock Out</h3>
          </div>
          <div className="space-y-3">
            {data.recent_stock_out.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No recent stock out</p>
            ) : (
              data.recent_stock_out.map(txn => (
                <div key={txn.id} className="flex items-center justify-between py-2 border-b border-white/05 last:border-0">
                  <div>
                    <p className="text-sm text-white font-medium">{txn.product}</p>
                    <p className="text-xs text-slate-500">{txn.txn_number} · {txn.user}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-semibold text-sm">-{txn.quantity.toLocaleString()}</p>
                    <p className="text-slate-600 text-xs">{formatTimeAgo(txn.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert Table */}
      {data.low_stock_products.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="text-white font-semibold">Low Stock Alerts</h3>
            <span className="badge badge-low ml-auto">{data.low_stock_products.length} products</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.low_stock_products.map(p => (
                  <tr key={p.product_id}>
                    <td className="text-white font-medium">{p.product_name}</td>
                    <td className="font-mono text-xs text-slate-400">{p.sku}</td>
                    <td className="text-amber-400 font-semibold">{p.available.toLocaleString()}</td>
                    <td className="text-slate-400">{p.reorder_level.toLocaleString()}</td>
                    <td><StockBadge status={p.status as StockStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
