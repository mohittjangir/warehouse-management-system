import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { inventoryService, masterService, productService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { ArrowDownCircle, Calculator, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product, Warehouse, StorageLocation, Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';

const schema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  location_id: z.string().optional(),
  supplier_id: z.string().optional(),
  batch_number: z.string().min(1, 'Batch number is required'),
  carton_quantity: z.coerce.number().min(0, 'Cannot be negative').default(0),
  unit_quantity: z.coerce.number().min(0, 'Cannot be negative').default(0),
  manufacturing_date: z.string().optional(),
  expiry_date: z.string().optional(),
  reference_number: z.string().optional(),
  remarks: z.string().optional(),
}).refine(d => Number(d.carton_quantity) + Number(d.unit_quantity) > 0, {
  message: 'Enter at least carton quantity or unit quantity',
  path: ['carton_quantity'],
});

type FormData = {
  product_id: string;
  warehouse_id: string;
  location_id?: string;
  supplier_id?: string;
  batch_number: string;
  carton_quantity?: number;
  unit_quantity?: number;
  manufacturing_date?: string;
  expiry_date?: string;
  reference_number?: string;
  remarks?: string;
};

export default function StockInPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [totalUnits, setTotalUnits] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const { register, handleSubmit, watch, setValue, control,
    formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      carton_quantity: 0,
      unit_quantity: 0,
      product_id: searchParams.get('product') || '',
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-active'],
    queryFn: () => productService.list({ status: 'ACTIVE', page_size: 200 }).then(r => r.data),
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => masterService.warehouses.list().then(r => r.data),
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => masterService.suppliers.list().then(r => r.data),
  });

  const watchWarehouse = watch('warehouse_id');
  const { data: locations } = useQuery<StorageLocation[]>({
    queryKey: ['locations', watchWarehouse],
    queryFn: () => masterService.locations.list(Number(watchWarehouse)).then(r => r.data),
    enabled: !!watchWarehouse,
  });

  // Auto-calculate total units
  const watchProduct = watch('product_id');
  const watchCartons = watch('carton_quantity');
  const watchLoose = watch('unit_quantity');

  useEffect(() => {
    const product = products?.find(p => p.id === Number(watchProduct));
    setSelectedProduct(product || null);
    const itemsPerCarton = product?.items_per_carton || 1;
    setTotalUnits((Number(watchCartons) * itemsPerCarton) + Number(watchLoose));
  }, [watchProduct, watchCartons, watchLoose, products]);

  // Pre-select product from query param
  useEffect(() => {
    const pid = searchParams.get('product');
    if (pid) setValue('product_id', pid);
  }, [searchParams]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        product_id: Number(data.product_id),
        warehouse_id: Number(data.warehouse_id),
        location_id: data.location_id ? Number(data.location_id) : null,
        supplier_id: data.supplier_id ? Number(data.supplier_id) : null,
        batch_number: data.batch_number,
        carton_quantity: Number(data.carton_quantity),
        unit_quantity: Number(data.unit_quantity),
        manufacturing_date: data.manufacturing_date ? new Date(data.manufacturing_date).toISOString() : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date).toISOString() : null,
        reference_number: data.reference_number,
        remarks: data.remarks,
      };
      const res = await inventoryService.stockIn(payload);
      setSuccess(res.data);
      toast.success(`Stock In successful! ${totalUnits} units added.`);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Stock In failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const basePath = user?.role === 'ADMIN' ? '/admin' : '/inventory';

  if (success) {
    return (
      <>
        <TopBar title="Stock In" subtitle="Record received inventory" />
        <div className="max-w-xl mx-auto">
          <div className="card text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Stock In Successful!</h3>
              <p className="text-slate-400 text-sm mt-1">Transaction recorded</p>
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
                <span className="text-slate-400">Units Added</span>
                <span className="text-emerald-400 font-bold">+{success.quantity?.toLocaleString()}</span>
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
              <button onClick={() => setSuccess(null)} className="btn-primary btn flex-1">
                <ArrowDownCircle size={16} />
                New Stock In
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
      <TopBar title="Stock In" subtitle="Record received inventory" />
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle size={20} className="text-emerald-400" />
              <h3 className="text-white font-semibold">Stock In Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product */}
              <div className="md:col-span-2 form-group">
                <label className="form-label">Product *</label>
                <select {...register('product_id')} className="form-select" id="product-select">
                  <option value="">— Select Product —</option>
                  {products?.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                {errors.product_id && <p className="form-error">{errors.product_id.message}</p>}
                {selectedProduct && (
                  <p className="text-xs text-indigo-400 mt-1">
                    1 Carton = {selectedProduct.items_per_carton} {selectedProduct.unit_short_code || 'units'}
                  </p>
                )}
              </div>

              {/* Warehouse */}
              <div className="form-group">
                <label className="form-label">Warehouse *</label>
                <select {...register('warehouse_id')} className="form-select" id="warehouse-select">
                  <option value="">— Select Warehouse —</option>
                  {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                {errors.warehouse_id && <p className="form-error">{errors.warehouse_id.message}</p>}
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label">Storage Location</label>
                <select {...register('location_id')} className="form-select" id="location-select">
                  <option value="">— Select Location —</option>
                  {locations?.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                </select>
              </div>

              {/* Supplier */}
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select {...register('supplier_id')} className="form-select" id="supplier-select">
                  <option value="">— Select Supplier —</option>
                  {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Batch Number */}
              <div className="form-group">
                <label className="form-label">Batch / Lot Number *</label>
                <input {...register('batch_number')} className="form-input" placeholder="e.g. BATCH-2026-001" id="batch-number" />
                {errors.batch_number && <p className="form-error">{errors.batch_number.message}</p>}
              </div>
            </div>
          </div>

          {/* Quantity section */}
          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={20} className="text-indigo-400" />
              <h3 className="text-white font-semibold">Quantity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Number of Cartons</label>
                <input
                  {...register('carton_quantity', { valueAsNumber: true })}
                  type="number" min="0" step="1"
                  className="form-input" placeholder="0"
                  id="carton-qty"
                />
                {errors.carton_quantity && <p className="form-error">{errors.carton_quantity.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Loose Units</label>
                <input
                  {...register('unit_quantity', { valueAsNumber: true })}
                  type="number" min="0" step="1"
                  className="form-input" placeholder="0"
                  id="unit-qty"
                />
              </div>

              {/* Total Units preview */}
              <div className="form-group">
                <label className="form-label">Total Units (calculated)</label>
                <div className="form-input bg-indigo-900/20 border-indigo-500/30 text-indigo-300 font-bold text-lg cursor-default select-none">
                  {totalUnits.toLocaleString()}
                </div>
                {selectedProduct && (
                  <p className="text-xs text-slate-500 mt-1">
                    {watch('carton_quantity')} × {selectedProduct.items_per_carton} + {watch('unit_quantity')} = {totalUnits}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dates and Refs */}
          <div className="card space-y-5">
            <h3 className="text-white font-semibold">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Manufacturing Date</label>
                <input {...register('manufacturing_date')} type="date" className="form-input" id="mfg-date" />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input {...register('expiry_date')} type="date" className="form-input" id="expiry-date" />
              </div>
              <div className="form-group">
                <label className="form-label">Reference Number</label>
                <input {...register('reference_number')} className="form-input" placeholder="e.g. PO-12345" id="reference-number" />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input {...register('remarks')} className="form-input" placeholder="Optional notes" id="remarks" />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || totalUnits === 0}
              className="btn-success btn flex-1 justify-center py-3"
              id="submit-stock-in"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
              ) : (
                <><ArrowDownCircle size={18} />Submit Stock In ({totalUnits} units)</>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary btn px-6"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
