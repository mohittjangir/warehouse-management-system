import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productService, masterService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { SearchBar } from '../../components/ui/SearchBar';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner';
import { StockBadge, CartonDisplay } from '../../components/ui/StockBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product, Category, Unit, StockStatus } from '../../types';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  sku: z.string().min(1, 'SKU required'),
  name: z.string().min(1, 'Name required'),
  product_code: z.string().optional(),
  category_id: z.string().optional(),
  unit_id: z.string().optional(),
  description: z.string().optional(),
  items_per_carton: z.coerce.number().int().positive('Must be > 0'),
  minimum_stock: z.coerce.number().min(0),
  maximum_stock: z.coerce.number().min(0).optional(),
  reorder_level: z.coerce.number().min(0),
});
type FormData = z.infer<typeof schema>;

export default function ProductsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', search],
    queryFn: () => productService.list({ search: search || undefined, page_size: 200 }).then(r => r.data),
  });
  const { data: categories } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => masterService.categories.list().then(r => r.data) });
  const { data: units } = useQuery<Unit[]>({ queryKey: ['units'], queryFn: () => masterService.units.list().then(r => r.data) });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { items_per_carton: 1, minimum_stock: 0, reorder_level: 0 },
  });

  const openCreate = () => { setEditing(null); reset({ items_per_carton: 1, minimum_stock: 0, reorder_level: 0 }); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    reset({ sku: p.sku, name: p.name, product_code: p.product_code || '', category_id: String(p.category_id || ''), unit_id: String(p.unit_id || ''), description: p.description || '', items_per_carton: p.items_per_carton, minimum_stock: p.minimum_stock, maximum_stock: p.maximum_stock || undefined, reorder_level: p.reorder_level });
    setShowModal(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, category_id: data.category_id ? Number(data.category_id) : null, unit_id: data.unit_id ? Number(data.unit_id) : null };
      if (editing) { await productService.update(editing.id, payload); toast.success('Product updated'); }
      else { await productService.create(payload); toast.success('Product created'); }
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Operation failed');
    }
  };

  return (
    <>
      <TopBar title="Products" subtitle="Manage product master data" />

      <div className="flex flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, SKU..." className="flex-1 min-w-48" />
        <button onClick={openCreate} className="btn-primary btn" id="create-product-btn">
          <Plus size={16} />New Product
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>SKU</th><th>Product Name</th><th>Category</th><th>Items/Carton</th><th>Current Stock</th><th>Min Stock</th><th>Reorder Level</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <TableSkeleton rows={6} cols={9} /> :
            !products?.length ? <tr><td colSpan={9}><EmptyState title="No products" message="Create your first product." action={<button onClick={openCreate} className="btn-primary btn"><Plus size={14} />Add Product</button>} /></td></tr>
            : products.map(p => (
              <tr key={p.id}>
                <td className="font-mono text-xs text-indigo-400">{p.sku}</td>
                <td>
                  <div>
                    <p className="text-white font-medium">{p.name}</p>
                    {p.product_code && <p className="text-slate-500 text-xs">{p.product_code}</p>}
                  </div>
                </td>
                <td className="text-slate-400 text-sm">{p.category_name || '—'}</td>
                <td className="text-slate-400 text-sm">{p.items_per_carton}</td>
                <td>
                  <CartonDisplay cartons={p.cartons || 0} looseUnits={p.loose_units || 0} totalUnits={p.total_quantity || 0} />
                </td>
                <td className="text-slate-400 text-sm">{p.minimum_stock.toLocaleString()}</td>
                <td className="text-slate-400 text-sm">{p.reorder_level.toLocaleString()}</td>
                <td>{p.stock_status ? <StockBadge status={p.stock_status as StockStatus} /> : <span className="text-slate-500 text-xs">{p.status}</span>}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/admin/products/${p.id}`)} className="btn-icon btn-secondary btn-sm" title="View" id={`view-${p.id}`}><Eye size={14} /></button>
                    <button onClick={() => openEdit(p)} className="btn-icon btn-secondary btn-sm" title="Edit" id={`edit-${p.id}`}><Edit size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'New Product'} size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary btn">Cancel</button>
            <button form="product-form" type="submit" disabled={isSubmitting} className="btn-primary btn">
              {isSubmitting ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input {...register('sku')} className="form-input" placeholder="e.g. SB-001" id="sku" />
              {errors.sku && <p className="form-error">{errors.sku.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Product Code</label>
              <input {...register('product_code')} className="form-input" placeholder="e.g. PKG-S" id="product-code" />
            </div>
            <div className="col-span-2 form-group">
              <label className="form-label">Product Name *</label>
              <input {...register('name')} className="form-input" placeholder="e.g. Small Packaging Box" id="product-name" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select {...register('category_id')} className="form-select" id="prod-category">
                <option value="">— None —</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit of Measure</label>
              <select {...register('unit_id')} className="form-select" id="prod-unit">
                <option value="">— None —</option>
                {units?.map(u => <option key={u.id} value={u.id}>{u.name} ({u.short_code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Items Per Carton *</label>
              <input {...register('items_per_carton', { valueAsNumber: true })} type="number" min="1" className="form-input" id="items-per-carton" />
              {errors.items_per_carton && <p className="form-error">{errors.items_per_carton.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Stock</label>
              <input {...register('minimum_stock', { valueAsNumber: true })} type="number" min="0" className="form-input" id="min-stock" />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Level</label>
              <input {...register('reorder_level', { valueAsNumber: true })} type="number" min="0" className="form-input" id="reorder-level" />
            </div>
            <div className="form-group">
              <label className="form-label">Maximum Stock</label>
              <input {...register('maximum_stock', { valueAsNumber: true })} type="number" min="0" className="form-input" id="max-stock" />
            </div>
            <div className="col-span-2 form-group">
              <label className="form-label">Description</label>
              <input {...register('description')} className="form-input" placeholder="Optional description" id="prod-description" />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
