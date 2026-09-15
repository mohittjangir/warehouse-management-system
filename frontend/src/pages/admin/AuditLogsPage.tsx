import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner';
import { formatDateTime } from '../../utils/helpers';
import { ClipboardList } from 'lucide-react';
import type { AuditLog } from '../../types';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'badge-in',
  STOCK_IN: 'badge-healthy',
  STOCK_OUT: 'badge-out',
  INVENTORY_ADJUSTMENT: 'badge-adj',
  PRODUCT_CREATED: 'badge-in',
  PRODUCT_UPDATED: 'badge-adj',
  USER_CREATED: 'badge-in',
  PASSWORD_RESET: 'badge-adj',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery<{ items: AuditLog[]; total: number }>({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: () => auditService.list({ page, page_size: 50, action: actionFilter || undefined }).then(r => r.data),
  });

  const logs = data?.items || [];
  const total = data?.total || 0;

  return (
    <>
      <TopBar title="Audit Logs" subtitle={`${total.toLocaleString()} total events`} />

      <div className="flex gap-3">
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="form-select w-56" id="action-filter">
          <option value="">All Actions</option>
          <option value="LOGIN">Login</option>
          <option value="STOCK_IN">Stock In</option>
          <option value="STOCK_OUT">Stock Out</option>
          <option value="INVENTORY_ADJUSTMENT">Adjustment</option>
          <option value="PRODUCT_CREATED">Product Created</option>
          <option value="USER_CREATED">User Created</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Description</th><th>Entity</th><th>IP Address</th></tr></thead>
          <tbody>
            {isLoading ? <TableSkeleton rows={8} cols={6} /> :
            !logs.length ? <tr><td colSpan={6}><EmptyState title="No logs found" /></td></tr>
            : logs.map(log => (
              <tr key={log.id}>
                <td className="text-slate-500 text-xs whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-700/40 flex items-center justify-center text-xs text-indigo-300 font-bold flex-shrink-0">
                      {(log.user_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-slate-300 text-sm">{log.user_name || 'System'}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${ACTION_COLORS[log.action] || 'badge-in'}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="text-slate-400 text-xs max-w-xs truncate">{log.description || '—'}</td>
                <td className="text-slate-500 text-xs">
                  {log.entity_type ? `${log.entity_type} #${log.entity_id}` : '—'}
                </td>
                <td className="text-slate-600 text-xs font-mono">{log.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Showing {logs.length} of {total} events</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn btn-sm">Previous</button>
          <span className="glass px-3 py-1 rounded-lg text-white">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50} className="btn-secondary btn btn-sm">Next</button>
        </div>
      </div>
    </>
  );
}
