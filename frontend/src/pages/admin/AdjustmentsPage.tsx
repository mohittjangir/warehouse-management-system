import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService, masterService, productService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product, Warehouse } from '../../types';

const schema = z.object({
  product_id: z.string().min(1, 'Product required'),
  warehouse_id: z.string().min(1, 'Warehouse required'),
  location_id: z.string().optional(),
  quantity: z.coerce.number().refine(v => v !== 0, 'Cannot be zero'),
  reason: z.string().min(3, 'Reason required (min 3 chars)'),
  reference_number: z.string().optional(),
  remarks: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AdjustmentsPage() {
  const qc = useQueryClient();
  const [result, setResult] = useState<any>(null);

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-active'],
    queryFn: () => productService.list({ status: 'ACTIVE', page_size: 200 }).then(r => r.data),
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => masterService.warehouses.list().then(r => r.data),
  });

  const qty = watch('quantity');

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        product_id: Number(data.product_id),
        warehouse_id: Number(data.warehouse_id),
        location_id: data.location_id ? Number(data.location_id) : null,
        quantity: Number(data.quantity),
        reason: data.reason,
        reference_number: data.reference_number,
        remarks: data.remarks,
      };
      const res = await inventoryService.adjustment(payload);
      setResult(res.data);
      toast.success('Adjustment recorded');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Adjustment failed');
    }
  };

  return (
    <>
      <TopBar title="Inventory Adjustment" subtitle="Controlled stock correction with audit trail" />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Warning */}
        <div className="glass rounded-xl px-4 py-3 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300 font-semibold">Admin-Only Action</p>
            <p className="text-slate-400 mt-0.5">Adjustments create permanent audit records. Use positive values to add stock, negative to reduce. Never deletes history.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCcw size={20} className="text-amber-400" />
            <h3 className="text-white font-semibold">Adjustment Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 form-group">
              <label className="form-label">Product *</label>
              <select {...register('product_id')} className="form-select" id="adj-product">
                <option value="">— Select Product —</option>
                {products?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              {errors.product_id && <p className="form-error">{errors.product_id.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Warehouse *</label>
              <select {...register('warehouse_id')} className="form-select" id="adj-warehouse">
                <option value="">— Select Warehouse —</option>
                {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {errors.warehouse_id && <p className="form-error">{errors.warehouse_id.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Quantity (±) *</label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number" step="1"
                className={`form-input ${qty > 0 ? 'text-emerald-400' : qty < 0 ? 'text-red-400' : ''}`}
                placeholder="+100 or -50"
                id="adj-quantity"
              />
              {qty !== 0 && qty && (
                <p className={`text-xs mt-1 ${qty > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {qty > 0 ? `▲ Adding ${qty} units` : `▼ Removing ${Math.abs(qty)} units`}
                </p>
              )}
              {errors.quantity && <p className="form-error">{errors.quantity.message}</p>}
            </div>

            <div className="md:col-span-2 form-group">
              <label className="form-label">Reason *</label>
              <input {...register('reason')} className="form-input" placeholder="e.g. Physical count correction, Damaged goods write-off" id="adj-reason" />
              {errors.reason && <p className="form-error">{errors.reason.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Reference Number</label>
              <input {...register('reference_number')} className="form-input" placeholder="e.g. ADJ-2026-001" id="adj-ref" />
            </div>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <input {...register('remarks')} className="form-input" placeholder="Additional notes" id="adj-remarks" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-warning btn w-full justify-center py-3" id="submit-adjustment">
            {isSubmitting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
            ) : (
              <><RefreshCcw size={18} />Submit Adjustment</>
            )}
          </button>
        </form>

        {result && (
          <div className="card space-y-3">
            <p className="text-white font-semibold">Adjustment Recorded ✓</p>
            <div className="glass rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction #</span>
                <span className="text-white font-mono">{result.transaction_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Adjustment</span>
                <span className={`font-bold ${result.quantity >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.quantity >= 0 ? '+' : ''}{result.quantity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">New Balance</span>
                <span className="text-white font-bold">{result.new_balance?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
