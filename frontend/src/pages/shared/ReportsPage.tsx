import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner';
import { StockBadge } from '../../components/ui/StockBadge';
import { CartonDisplay } from '../../components/ui/StockBadge';
import { Download, Activity, BarChart2 } from 'lucide-react';
import { formatDate, downloadBlob, getAgeCategory } from '../../utils/helpers';
import type { StockStatus } from '../../types';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts';

interface ReportsPageProps {
  type: 'stock' | 'ageing' | 'movements';
}

const TITLES = {
  stock: 'Current Stock Report',
  ageing: 'Stock Ageing Report',
  movements: 'Stock Movement Report',
};

export default function ReportsPage({ type }: ReportsPageProps) {
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['report', type],
    queryFn: () => {
      switch (type) {
        case 'stock': return reportService.stock().then(r => r.data);
        case 'ageing': return reportService.ageing().then(r => r.data);
        case 'movements': return reportService.movements().then(r => r.data);
      }
    },
  });

  const items = (data as any)?.items || [];

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await reportService.exportCsv(type);
      downloadBlob(res.data, `${type}_report.csv`);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const renderStockChart = () => {
    if (!items.length) return null;
    const chartData = [...items]
      .sort((a: any, b: any) => b.total_units - a.total_units)
      .slice(0, 10)
      .map(item => ({
        name: item.product_name,
        qty: item.total_units
      }));

    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Top 10 Products by Volume</h3>
          <BarChart2 size={18} className="text-indigo-400" />
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={v => v.length > 10 ? v.slice(0,10)+'...' : v} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <Bar dataKey="qty" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderStockTable = () => (
    <table className="table">
      <thead>
        <tr>
          <th>SKU</th><th>Product</th><th>Category</th><th>Warehouse</th>
          <th>Stock</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? <TableSkeleton rows={6} cols={6} /> :
        !items.length ? <tr><td colSpan={6}><EmptyState title="No data" /></td></tr> :
        items.map((item: any, i: number) => (
          <tr key={i}>
            <td className="font-mono text-xs text-indigo-400">{item.sku}</td>
            <td className="text-white font-medium">{item.product_name}</td>
            <td className="text-slate-400 text-sm">{item.category || '—'}</td>
            <td className="text-slate-400 text-sm">{item.warehouse || '—'}</td>
            <td>
              <CartonDisplay
                cartons={item.cartons || 0}
                looseUnits={item.loose_units || 0}
                totalUnits={item.total_units || 0}
              />
            </td>
            <td><StockBadge status={item.status as StockStatus} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderAgeingTable = () => (
    <table className="table">
      <thead>
        <tr>
          <th>Product</th><th>SKU</th><th>Batch</th><th>Received</th>
          <th>Age</th><th>Category</th><th>Remaining Qty</th><th>Warehouse</th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? <TableSkeleton rows={6} cols={8} /> :
        !items.length ? <tr><td colSpan={8}><EmptyState title="No data" /></td></tr> :
        items.map((item: any, i: number) => {
          const ageCat = getAgeCategory(item.age_days || 0);
          return (
            <tr key={i}>
              <td className="text-white font-medium">{item.product}</td>
              <td className="font-mono text-xs text-indigo-400">{item.sku}</td>
              <td className="font-mono text-xs text-slate-400">{item.batch_number}</td>
              <td className="text-slate-500 text-xs">{formatDate(item.received_date)}</td>
              <td className="text-white font-semibold tabular-nums">{item.age_days} days</td>
              <td><span className={`badge ${ageCat.className}`}>{ageCat.label}</span></td>
              <td className="text-slate-300 tabular-nums">{(item.remaining_quantity || 0).toLocaleString()}</td>
              <td className="text-slate-400 text-sm">{item.warehouse || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderMovementsChart = () => {
    if (!items.length) return null;
    const dayMap: Record<string, { date: string, stockIn: number, stockOut: number }> = {};
    
    // items are sorted by newest first, so we reverse to show timeline properly
    [...items].reverse().forEach((item: any) => {
      const d = formatDate(item.date);
      if (!dayMap[d]) dayMap[d] = { date: d, stockIn: 0, stockOut: 0 };
      if (item.type === 'STOCK_IN') dayMap[d].stockIn += item.quantity;
      if (item.type === 'STOCK_OUT') dayMap[d].stockOut += item.quantity;
    });

    const chartData = Object.values(dayMap);

    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold">Movement Trends</h3>
            <p className="text-slate-500 text-xs mt-0.5">Stock In vs Stock Out</p>
          </div>
          <Activity size={18} className="text-emerald-400" />
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Area type="monotone" dataKey="stockIn" name="Stock In" stroke="#10b981" strokeWidth={2} fill="url(#colorIn)" />
            <Area type="monotone" dataKey="stockOut" name="Stock Out" stroke="#ef4444" strokeWidth={2} fill="url(#colorOut)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderMovementsTable = () => (
    <table className="table">
      <thead>
        <tr>
          <th>Date</th><th>Transaction #</th><th>Type</th><th>Product</th>
          <th>Quantity</th><th>Balance</th><th>User</th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? <TableSkeleton rows={6} cols={7} /> :
        !items.length ? <tr><td colSpan={7}><EmptyState title="No data" /></td></tr> :
        items.map((item: any, i: number) => (
          <tr key={i}>
            <td className="text-slate-500 text-xs whitespace-nowrap">{formatDate(item.date)}</td>
            <td className="font-mono text-xs text-indigo-400">{item.txn_number}</td>
            <td>
              <span className={`badge ${item.type === 'STOCK_IN' ? 'badge-healthy' : item.type === 'STOCK_OUT' ? 'badge-out' : 'badge-adj'}`}>
                {item.type.replace('_', ' ')}
              </span>
            </td>
            <td className="text-white font-medium text-sm">{item.product}</td>
            <td className={`font-bold tabular-nums ${item.type === 'STOCK_IN' ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.type === 'STOCK_IN' ? '+' : '-'}{(item.quantity || 0).toLocaleString()}
            </td>
            <td className="text-slate-300 tabular-nums">{(item.new_balance || 0).toLocaleString()}</td>
            <td className="text-slate-400 text-sm">{item.user || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <TopBar title={TITLES[type]} subtitle={`${items.length} records`} />

      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-400 text-sm">{items.length} records found</p>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary btn">
          <Download size={16} />
          {exporting ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>

      {type === 'stock' && renderStockChart()}
      {type === 'movements' && renderMovementsChart()}

      <div className="table-container overflow-x-auto">
        {type === 'stock' && renderStockTable()}
        {type === 'ageing' && renderAgeingTable()}
        {type === 'movements' && renderMovementsTable()}
      </div>
    </>
  );
}
