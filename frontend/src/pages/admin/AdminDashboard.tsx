import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardService } from '../../services/api';
import { StatCard } from '../../components/ui/StatCard';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { TopBar } from '../../components/layouts/Sidebar';
import {
  Package, Boxes, TrendingUp, TrendingDown, AlertTriangle,
  XCircle, Activity,
} from 'lucide-react';
import { formatTimeAgo, formatDateTime } from '../../utils/helpers';
import type { AdminDashboard } from '../../types';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

const statCards = (d: AdminDashboard) => [
  {
    title: 'Total Products',
    value: d.total_products,
    icon: <Package size={22} className="text-indigo-400" />,
    accentColor: 'linear-gradient(90deg, #6366f1, #818cf8)',
  },
  {
    title: 'Total Stock (Units)',
    value: d.total_stock.toLocaleString(),
    icon: <Boxes size={22} className="text-violet-400" />,
    accentColor: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
  },
  {
    title: 'Total Cartons',
    value: d.total_cartons.toLocaleString(),
    icon: <Package size={22} className="text-blue-400" />,
    accentColor: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
  },
  {
    title: "Stock In Today",
    value: d.stock_in_today.toLocaleString(),
    icon: <TrendingUp size={22} className="text-emerald-400" />,
    accentColor: 'linear-gradient(90deg, #10b981, #34d399)',
  },
  {
    title: "Stock Out Today",
    value: d.stock_out_today.toLocaleString(),
    icon: <TrendingDown size={22} className="text-orange-400" />,
    accentColor: 'linear-gradient(90deg, #f97316, #fb923c)',
  },
  {
    title: 'Low Stock',
    value: d.low_stock_count,
    icon: <AlertTriangle size={22} className="text-amber-400" />,
    accentColor: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
  },
  {
    title: 'Out of Stock',
    value: d.out_of_stock_count,
    icon: <XCircle size={22} className="text-red-400" />,
    accentColor: 'linear-gradient(90deg, #ef4444, #f87171)',
  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-4 py-3 text-xs space-y-1">
      <p className="text-slate-400 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value?.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery<AdminDashboard>({
    queryKey: ['admin-dashboard'],
    queryFn: () => dashboardService.admin().then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <><TopBar title="Admin Dashboard" /><PageLoader /></>;
  if (error || !data) return (
    <><TopBar title="Admin Dashboard" />
    <div className="card text-red-400 text-sm">Failed to load dashboard data. Is the backend running?</div></>
  );

  return (
    <>
      <TopBar title="Admin Dashboard" subtitle="Warehouse overview & statistics" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {statCards(data).map(card => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stock Movement Area Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Stock Movement</h3>
              <p className="text-slate-500 text-xs mt-0.5">Last 30 days — In vs Out</p>
            </div>
            <Activity size={18} className="text-indigo-400" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.stock_movement_chart} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="stock_in" name="Stock In" stroke="#10b981" strokeWidth={2}
                fill="url(#colorIn)" dot={false} />
              <Area type="monotone" dataKey="stock_out" name="Stock Out" stroke="#ef4444" strokeWidth={2}
                fill="url(#colorOut)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory by Category Pie */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">By Category</h3>
              <p className="text-slate-500 text-xs mt-0.5">Inventory distribution</p>
            </div>
          </div>
          {data.inventory_by_category.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.inventory_by_category} cx="50%" cy="45%"
                  innerRadius={50} outerRadius={80}
                  dataKey="total" nameKey="category" paddingAngle={3}>
                  {data.inventory_by_category.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{val}</span>}
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Recent Activity</h3>
          <span className="badge badge-in">Live</span>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {data.recent_activity.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No recent activity</p>
          ) : (
            data.recent_activity.map(activity => (
              <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-white/05 last:border-0">
                <div className="w-8 h-8 rounded-full bg-indigo-700/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-300">
                  {(activity.user || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">
                    <span className="text-white font-medium">{activity.user}</span>
                    {' '}&mdash;{' '}
                    <span className="text-indigo-400 font-mono text-xs">{activity.action}</span>
                  </p>
                  {activity.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{activity.description}</p>
                  )}
                </div>
                <span className="text-xs text-slate-600 flex-shrink-0">{formatTimeAgo(activity.time)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
