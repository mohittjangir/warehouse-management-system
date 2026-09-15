import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { inventoryService, masterService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { SearchBar } from '../../components/ui/SearchBar';
import { StockBadge, CartonDisplay } from '../../components/ui/StockBadge';
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner';
import { ArrowDownCircle, ArrowUpCircle, Eye, Filter, Download } from 'lucide-react';
import { formatDate, downloadBlob } from '../../utils/helpers';
import { reportService } from '../../services/api';
import type { InventoryBalance, Warehouse, Category, StockStatus } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function CurrentStockPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data: inventory, isLoading } = useQuery<InventoryBalance[]>({
    queryKey: ['inventory', warehouseFilter, page],
    queryFn: () => inventoryService.balance({
      warehouse_id: warehouseFilter || undefined,
      page, page_size: 50,
    }).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => masterService.warehouses.list().then(r => r.data),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => masterService.categories.list().then(r => r.data),
  });

  const basePath = user?.role === 'ADMIN' ? '/admin' : '/inventory';

  // Client-side filter
  const filtered = (inventory || []).filter(item => {
    const matchSearch = !search ||
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || item.category_name === categoryFilter;
    const matchStatus = !statusFilter || item.stock_status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await reportService.exportCsv('stock');
      downloadBlob(res.data, 'stock_report.csv');
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <TopBar title="Current Inventory" subtitle={`${filtered.length} items`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search product, SKU..."
          className="flex-1 min-w-48"
        />
        <select
          value={warehouseFilter}
          onChange={e => { setWarehouseFilter(e.target.value); setPage(1); }}
          className="form-select w-44"
          id="warehouse-filter"
        >
          <option value="">All Warehouses</option>
          {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="form-select w-44"
          id="category-filter"
        >
          <option value="">All Categories</option>
          {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-select w-40"
          id="status-filter"
        >
          <option value="">All Status</option>
          <option value="HEALTHY">Healthy</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
          <option value="OVERSTOCK">Overstock</option>
        </select>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary btn">
          <Download size={16} />
          {exporting ? 'Exporting...' : 'CSV'}
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th>Available Stock</th>
              <th>Items/Carton</th>
              <th>Warehouse</th>
              <th>Location</th>
              <th>Oldest Batch</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={10} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <EmptyState title="No inventory found" message="Try adjusting your filters or add stock." />
                </td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={`${item.product_id}-${item.warehouse_id}`}>
                  <td className="font-mono text-xs text-indigo-400">{item.sku}</td>
                  <td>
                    <p className="text-white font-medium">{item.product_name}</p>
                  </td>
                  <td className="text-slate-400 text-xs">{item.category_name || '—'}</td>
                  <td>
                    <CartonDisplay
                      cartons={item.cartons}
                      looseUnits={item.loose_units}
                      totalUnits={item.total_quantity}
                    />
                  </td>
                  <td className="text-slate-400 text-sm">{item.items_per_carton}</td>
                  <td className="text-slate-400 text-sm">{item.warehouse_name || '—'}</td>
                  <td className="text-slate-500 text-xs">{item.location_name || '—'}</td>
                  <td className="text-slate-500 text-xs">
                    {item.oldest_batch_date ? formatDate(item.oldest_batch_date) : '—'}
                  </td>
                  <td><StockBadge status={item.stock_status} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => navigate(`${basePath}/products/${item.product_id}`)}
                          className="btn-icon btn-secondary btn-sm"
                          title="View Details"
                          id={`view-${item.product_id}`}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`${basePath}/stock-in?product=${item.product_id}`)}
                        className="btn-icon btn-success btn-sm"
                        title="Stock In"
                        id={`stock-in-${item.product_id}`}
                      >
                        <ArrowDownCircle size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`${basePath}/stock-out?product=${item.product_id}`)}
                        className="btn-icon btn-danger btn-sm"
                        title="Stock Out"
                        id={`stock-out-${item.product_id}`}
                        disabled={item.total_quantity <= 0}
                      >
                        <ArrowUpCircle size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Showing {filtered.length} records</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary btn btn-sm"
          >Previous</button>
          <span className="glass px-3 py-1 rounded-lg text-white">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(inventory?.length || 0) < 50}
            className="btn-secondary btn btn-sm"
          >Next</button>
        </div>
      </div>
    </>
  );
}
