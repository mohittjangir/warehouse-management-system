import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { inventoryService, masterService, productService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { ArrowUpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product, Warehouse, StorageLocation, Customer, InventoryBalance } from '../../types';
import { useAuth } from '../../context/AuthContext';

const schema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  location_id: z.string().optional(),
  customer_id: z.string().optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  reason: z.string().optional(),
  reference_number: z.string().optional(),
  remarks: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function StockOutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [success, setSuccess] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [stockWarning, setStockWarning] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { product_id: searchParams.get('product') || '' },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-active'],
    queryFn: () => productService.list({ status: 'ACTIVE', page_size: 200 }).then(r => r.data),
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => masterService.warehouses.list().then(r => r.data),
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => masterService.customers.list().then(r => r.data),
  });

  const watchWarehouse = watch('warehouse_id');
  const watchProduct = watch('product_id');
  const watchQuantity = watch('quantity');

  const { data: locations } = useQuery<StorageLocation[]>({
    queryKey: ['locations', watchWarehouse],
    queryFn: () => masterService.locations.list(Number(watchWarehouse)).then(r => r.data),
    enabled: !!watchWarehouse,
  });

  // Check available stock
  const { data: inventory } = useQuery<InventoryBalance[]>({
    queryKey: ['inventory-check', watchProduct, watchWarehouse],
    queryFn: () => inventoryService.balance({
      warehouse_id: watchWarehouse || undefined,
      page_size: 200,
    }).then(r => r.data),
    enabled: !!watchProduct && !!watchWarehouse,
  });

  useEffect(() => {
    if (inventory && watchProduct) {
      const item = inventory.find(i => i.product_id === Number(watchProduct));
      const avail = item?.total_quantity ?? null;
      setAvailableStock(avail);

      if (avail !== null && watchQuantity > avail) {
        setStockWarning(
          `⚠️ Insufficient stock. Available: ${avail} units. Requested: ${watchQuantity} units.`
        );
      } else {
        setStockWarning('');
      }
    }
  }, [inventory, watchProduct, watchQuantity]);

  const selectedProduct = products?.find(p => p.id === Number(watchProduct));

  const onSubmit = async (data: FormData) => {
    if (availableStock !== null && Number(data.quantity) > availableStock) {
      toast.error(`Insufficient stock. Available: ${availableStock} units.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        product_id: Number(data.product_id),
        warehouse_id: Number(data.warehouse_id),
        location_id: data.location_id ? Number(data.location_id) : null,
        customer_id: data.customer_id ? Number(data.customer_id) : null,
        quantity: Number(data.quantity),
        reason: data.reason,
        reference_number: data.reference_number,
        remarks: data.remarks,
      };
      const res = await inventoryService.stockOut(payload);
      setSuccess(res.data);
      toast.success(`Stock Out recorded! ${data.quantity} units dispatched.`);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Stock Out failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const basePath = user?.role === 'ADMIN' ? '/admin' : '/inventory';

  // Carton display helper
  const showCartons = (qty: number) => {
    if (!selectedProduct || !qty) return '';
    const c = Math.floor(qty / selectedProduct.items_per_carton);
    const l = qty % selectedProduct.items_per_carton;
    if (c > 0 && l > 0) return `(${c} cartons + ${l} loose)`;
    if (c > 0) return `(${c} cartons)`;
    return `(${l} loose)`;
  };

  if (success) {
    return (
      <>
        <TopBar title="Stock Out" subtitle="Dispatch inventory" />
        <div className="max-w-xl mx-auto">
          <div className="card text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Stock Out Successful!</h3>
              <p className="text-slate-400 text-sm mt-1">Transaction recorded via FIFO allocation</p>
            </div>
            <div className="glass rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction #</span>
                <span className="text-white font-mono">{success.transaction_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Product</span>
                <span className="text-white">{success.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Units Dispatched</span>
                <span className="text-red-400 font-bold">-{success.quantity?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Previous Balance</span>
                <span className="text-slate-300">{success.previous_balance?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">New Balance</span>
                <span className="text-white font-bold">{success.new_balance?.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSuccess(null)} className="btn-danger btn flex-1">
                <ArrowUpCircle size={16} />
                New Stock Out
              </button>
              <button onClick={() => navigate(`${basePath}/current-stock`)} className="btn-secondary btn flex-1">
                View Inventory
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Stock Out" subtitle="Dispatch inventory" />
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpCircle size={20} className="text-red-400" />
              <h3 className="text-white font-semibold">Stock Out Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product */}
              <div className="md:col-span-2 form-group">
                <label className="form-label">Product *</label>
                <select {...register('product_id')} className="form-select" id="so-product-select">
                  <option value="">— Select Product —</option>
                  {products?.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                {errors.product_id && <p className="form-error">{errors.product_id.message}</p>}
              </div>

              {/* Warehouse */}
              <div className="form-group">
                <label className="form-label">Warehouse *</label>
                <select {...register('warehouse_id')} className="form-select" id="so-warehouse-select">
                  <option value="">— Select Warehouse —</option>
                  {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                {errors.warehouse_id && <p className="form-error">{errors.warehouse_id.message}</p>}
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label">Storage Location</label>
                <select {...register('location_id')} className="form-select" id="so-location-select">
                  <option value="">— Select Location —</option>
                  {locations?.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                </select>
              </div>

              {/* Available stock indicator */}
              {availableStock !== null && watchProduct && watchWarehouse && (
                <div className="md:col-span-2">
                  <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                    availableStock <= 0
                      ? 'bg-red-500/10 border border-red-500/30'
                      : 'bg-emerald-500/10 border border-emerald-500/30'
                  }`}>
                    <span className="text-sm">
                      <span className="text-slate-400">Available Stock: </span>
                      <span className={`font-bold ${availableStock <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {availableStock.toLocaleString()} units
                      </span>
                      {selectedProduct && (
                        <span className="text-slate-500 ml-2 text-xs">
                          {showCartons(availableStock)}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="form-group">
                <label className="form-label">Quantity to Dispatch *</label>
                <input
                  {...register('quantity', { valueAsNumber: true })}
                  type="number" min="1" step="1"
                  className={`form-input ${stockWarning ? 'border-red-500/50 focus:ring-red-500/50' : ''}`}
                  placeholder="0"
                  id="so-quantity"
                />
                {errors.quantity && <p className="form-error">{errors.quantity.message}</p>}
                {watchQuantity > 0 && selectedProduct && !stockWarning && (
                  <p className="text-xs text-slate-500 mt-1">{showCartons(watchQuantity)}</p>
                )}
                {stockWarning && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle size={12} className="text-red-400" />
                    <p className="form-error">{stockWarning}</p>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="form-group">
                <label className="form-label">Customer / Destination</label>
                <select {...register('customer_id')} className="form-select" id="so-customer-select">
                  <option value="">— Select Customer —</option>
                  {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Reason */}
              <div className="form-group">
                <label className="form-label">Reason</label>
                <input {...register('reason')} className="form-input" placeholder="e.g. Customer order, Internal use" id="so-reason" />
              </div>

              {/* Reference */}
              <div className="form-group">
                <label className="form-label">Reference Number</label>
                <input {...register('reference_number')} className="form-input" placeholder="e.g. DO-12345" id="so-reference" />
              </div>

              {/* Remarks */}
              <div className="md:col-span-2 form-group">
                <label className="form-label">Remarks</label>
                <input {...register('remarks')} className="form-input" placeholder="Optional notes" id="so-remarks" />
              </div>
            </div>
          </div>

          {/* FIFO note */}
          <div className="glass rounded-xl px-4 py-3 border border-indigo-500/20 text-xs text-slate-400 flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">ℹ</span>
            <span>Stock will be allocated using <strong className="text-slate-300">FIFO</strong> — oldest batches consumed first to maintain inventory accuracy.</span>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !!stockWarning || (availableStock !== null && availableStock <= 0)}
              className="btn-danger btn flex-1 justify-center py-3"
              id="submit-stock-out"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
              ) : (
                <><ArrowUpCircle size={18} />Submit Stock Out</>
              )}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary btn px-6">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
