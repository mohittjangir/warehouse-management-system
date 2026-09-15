import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { SearchBar } from '../../components/ui/SearchBar';
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner';
import { TxnBadge } from '../../components/ui/StockBadge';
import { formatDateTime } from '../../utils/helpers';
import { exportTableToCSV } from '../../utils/export';
import { Download } from 'lucide-react';
import type { StockTransaction } from '../../types';

export default function MovementsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: movements, isLoading } = useQuery<StockTransaction[]>({
    queryKey: ['movements', typeFilter, page, search],
    queryFn: () => inventoryService.movements({
      transaction_type: typeFilter || undefined,
      search: search || undefined,
      page, page_size: 50,
    }).then(r => r.data),
  });

  const filtered = movements || [];

  const handleExport = () => {
    const exportData = filtered.map(m => ({
      'Date': formatDateTime(m.created_at),
      'Transaction Number': m.transaction_number,
      'Type': m.transaction_type,
      'Product': m.product_name,
      'SKU': m.product_sku,
      'Quantity': m.quantity,
      'Previous Balance': m.previous_balance,
      'New Balance': m.new_balance,
      'Warehouse': m.warehouse_name,
      'User': m.user_name,
      'Remarks': m.remarks || ''
    }));
    exportTableToCSV(exportData, 'stock_movements_report.csv');
  };

  return (
    <>
      <TopBar title="Stock Movement History" subtitle="Complete ledger of all inventory movements" />

      <div className="flex flex-wrap gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search transaction #, reference..." className="flex-1 min-w-48" />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="form-select w-44" id="type-filter">
          <option value="">All Types</option>
          <option value="STOCK_IN">Stock In</option>
          <option value="STOCK_OUT">Stock Out</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="TRANSFER">Transfer</option>
        </select>
        <button onClick={handleExport} className="btn-secondary btn">
          <Download size={16} /> Download CSV
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Transaction #</th>
              <th>Type</th>
              <th>Product</th>
              <th>Batch</th>
              <th>Quantity</th>
              <th>Prev Balance</th>
              <th>New Balance</th>
              <th>Warehouse</th>
              <th>User</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton rows={8} cols={10} /> :
            !movements?.length ? (
              <tr><td colSpan={10}><EmptyState title="No movements found" message="No stock transactions match your filters." /></td></tr>
            ) : movements.map(m => (
              <tr key={m.id}>
                <td className="font-mono text-xs text-indigo-400">{m.transaction_number}</td>
                <td><TxnBadge type={m.transaction_type} /></td>
                <td>
                  <div>
                    <p className="text-white font-medium text-sm">{m.product_name}</p>
                    <p className="text-slate-500 text-xs font-mono">{m.product_sku}</p>
                  </div>
                </td>
                <td className="text-slate-400 text-xs font-mono">{m.batch_number || '—'}</td>
                <td>
                  <span className={`font-bold ${m.transaction_type === 'STOCK_IN' ? 'text-emerald-400' : m.transaction_type === 'STOCK_OUT' ? 'text-red-400' : 'text-amber-400'}`}>
                    {m.transaction_type === 'STOCK_IN' ? '+' : m.transaction_type === 'STOCK_OUT' ? '-' : ''}{m.quantity.toLocaleString()}
                  </span>
                </td>
                <td className="text-slate-500 tabular-nums">{m.previous_balance.toLocaleString()}</td>
                <td className="text-white font-medium tabular-nums">{m.new_balance.toLocaleString()}</td>
                <td className="text-slate-400 text-xs">{m.warehouse_name || '—'}</td>
                <td className="text-slate-400 text-xs">{m.user_name || '—'}</td>
                <td className="text-slate-500 text-xs whitespace-nowrap">{formatDateTime(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Showing {movements?.length || 0} records</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn btn-sm">Previous</button>
          <span className="glass px-3 py-1 rounded-lg text-white">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(movements?.length || 0) < 50} className="btn-secondary btn btn-sm">Next</button>
        </div>
      </div>
    </>
  );
}
