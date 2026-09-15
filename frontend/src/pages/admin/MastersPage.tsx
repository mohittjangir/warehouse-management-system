import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { masterService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { Plus, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Category, Unit, Warehouse, StorageLocation, Supplier, Customer } from '../../types';

type TabType = 'categories' | 'units' | 'warehouses' | 'locations' | 'suppliers' | 'customers';

const TABS: { id: TabType; label: string }[] = [
  { id: 'categories', label: 'Categories' },
  { id: 'units', label: 'Units' },
  { id: 'warehouses', label: 'Warehouses' },
  { id: 'locations', label: 'Locations' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'customers', label: 'Customers' },
];

export default function MastersPage({ tab: initialTab }: { tab: TabType }) {
  const [tab, setTab] = useState<TabType>(initialTab || 'categories');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const queryKey = [tab];
  const { data: items, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      switch (tab) {
        case 'categories': return masterService.categories.list().then(r => r.data);
        case 'units': return masterService.units.list().then(r => r.data);
        case 'warehouses': return masterService.warehouses.list().then(r => r.data);
        case 'locations': return masterService.locations.list().then(r => r.data);
        case 'suppliers': return masterService.suppliers.list().then(r => r.data);
        case 'customers': return masterService.customers.list().then(r => r.data);
      }
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-for-locations'],
    queryFn: () => masterService.warehouses.list().then(r => r.data),
    enabled: tab === 'locations',
  });

  const openCreate = () => { setEditing(null); reset({}); setShowModal(true); };
  const openEdit = (item: any) => { setEditing(item); reset(item); setShowModal(true); };

  const onSubmit = async (data: any) => {
    try {
      if (editing) {
        switch (tab) {
          case 'categories': await masterService.categories.update(editing.id, data); break;
          case 'units': await masterService.units.update(editing.id, data); break;
          case 'warehouses': await masterService.warehouses.update(editing.id, data); break;
          case 'locations': await masterService.locations.update(editing.id, data); break;
          case 'suppliers': await masterService.suppliers.update(editing.id, data); break;
          case 'customers': await masterService.customers.update(editing.id, data); break;
        }
        toast.success('Updated successfully');
      } else {
        switch (tab) {
          case 'categories': await masterService.categories.create(data); break;
          case 'units': await masterService.units.create(data); break;
          case 'warehouses': await masterService.warehouses.create(data); break;
          case 'locations': await masterService.locations.create(data); break;
          case 'suppliers': await masterService.suppliers.create(data); break;
          case 'customers': await masterService.customers.create(data); break;
        }
        toast.success('Created successfully');
      }
      qc.invalidateQueries({ queryKey });
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Operation failed');
    }
  };

  const tabLabel = TABS.find(t => t.id === tab)?.label || '';

  const renderForm = () => {
    switch (tab) {
      case 'categories':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input {...register('name', { required: true })} className="form-input" id="cat-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input {...register('description')} className="form-input" id="cat-desc" />
            </div>
          </>
        );
      case 'units':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Unit Name *</label>
              <input {...register('name', { required: true })} className="form-input" placeholder="e.g. Piece" id="unit-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Short Code *</label>
              <input {...register('short_code', { required: true })} className="form-input" placeholder="e.g. PCS" id="unit-code" />
            </div>
          </>
        );
      case 'warehouses':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Warehouse Name *</label>
              <input {...register('name', { required: true })} className="form-input" id="wh-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input {...register('code', { required: true })} className="form-input" placeholder="e.g. WH-001" id="wh-code" />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input {...register('address')} className="form-input" id="wh-address" />
            </div>
          </>
        );
      case 'locations':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Warehouse *</label>
              <select {...register('warehouse_id', { required: true })} className="form-select" id="loc-wh">
                <option value="">— Select —</option>
                {(warehouses as Warehouse[] || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location Name *</label>
              <input {...register('name', { required: true })} className="form-input" placeholder="e.g. Rack A - Shelf 1" id="loc-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input {...register('code', { required: true })} className="form-input" placeholder="e.g. A1" id="loc-code" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input {...register('description')} className="form-input" id="loc-desc" />
            </div>
          </>
        );
      case 'suppliers':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Supplier Name *</label>
              <input {...register('name', { required: true })} className="form-input" id="sup-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input {...register('contact_person')} className="form-input" id="sup-contact" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input {...register('phone')} className="form-input" id="sup-phone" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input {...register('email')} type="email" className="form-input" id="sup-email" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input {...register('address')} className="form-input" id="sup-address" />
            </div>
          </>
        );
      case 'customers':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input {...register('name', { required: true })} className="form-input" id="cust-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input {...register('phone')} className="form-input" id="cust-phone" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input {...register('email')} type="email" className="form-input" id="cust-email" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input {...register('address')} className="form-input" id="cust-address" />
            </div>
          </>
        );
    }
  };

  const renderRow = (item: any) => {
    switch (tab) {
      case 'categories':
        return (
          <tr key={item.id}>
            <td className="text-white font-medium">{item.name}</td>
            <td className="text-slate-400 text-sm">{item.description || '—'}</td>
            <td><span className={`badge ${item.status ? 'badge-healthy' : 'badge-out'}`}>{item.status ? 'Active' : 'Inactive'}</span></td>
            <td><button onClick={() => openEdit(item)} className="btn-icon btn-secondary btn-sm" id={`edit-cat-${item.id}`}><Edit size={14} /></button></td>
          </tr>
        );
      case 'units':
        return (
          <tr key={item.id}>
            <td className="text-white font-medium">{item.name}</td>
            <td className="font-mono text-indigo-400 text-sm">{item.short_code}</td>
            <td><button onClick={() => openEdit(item)} className="btn-icon btn-secondary btn-sm" id={`edit-unit-${item.id}`}><Edit size={14} /></button></td>
          </tr>
        );
      case 'warehouses':
        return (
          <tr key={item.id}>
            <td className="text-white font-medium">{item.name}</td>
            <td className="font-mono text-indigo-400 text-sm">{item.code}</td>
            <td className="text-slate-400 text-sm">{item.address || '—'}</td>
            <td><span className={`badge ${item.status ? 'badge-healthy' : 'badge-out'}`}>{item.status ? 'Active' : 'Inactive'}</span></td>
            <td><button onClick={() => openEdit(item)} className="btn-icon btn-secondary btn-sm" id={`edit-wh-${item.id}`}><Edit size={14} /></button></td>
          </tr>
        );
      case 'locations':
        return (
          <tr key={item.id}>
            <td className="text-white font-medium">{item.name}</td>
            <td className="font-mono text-indigo-400 text-sm">{item.code}</td>
            <td className="text-slate-400 text-sm">{item.description || '—'}</td>
            <td><span className={`badge ${item.status ? 'badge-healthy' : 'badge-out'}`}>{item.status ? 'Active' : 'Inactive'}</span></td>
            <td><button onClick={() => openEdit(item)} className="btn-icon btn-secondary btn-sm" id={`edit-loc-${item.id}`}><Edit size={14} /></button></td>
          </tr>
        );
      case 'suppliers':
      case 'customers':
        return (
          <tr key={item.id}>
            <td className="text-white font-medium">{item.name}</td>
            <td className="text-slate-400 text-sm">{item.phone || '—'}</td>
            <td className="text-slate-400 text-sm">{item.email || '—'}</td>
            <td className="text-slate-500 text-xs">{item.address || '—'}</td>
            <td><span className={`badge ${item.status ? 'badge-healthy' : 'badge-out'}`}>{item.status ? 'Active' : 'Inactive'}</span></td>
            <td><button onClick={() => openEdit(item)} className="btn-icon btn-secondary btn-sm" id={`edit-${tab}-${item.id}`}><Edit size={14} /></button></td>
          </tr>
        );
    }
  };

  const headers = {
    categories: ['Name', 'Description', 'Status', ''],
    units: ['Name', 'Code', ''],
    warehouses: ['Name', 'Code', 'Address', 'Status', ''],
    locations: ['Name', 'Code', 'Description', 'Status', ''],
    suppliers: ['Name', 'Phone', 'Email', 'Address', 'Status', ''],
    customers: ['Name', 'Phone', 'Email', 'Address', 'Status', ''],
  }[tab] || [];

  return (
    <>
      <TopBar title={tabLabel} subtitle={`Manage ${tabLabel.toLowerCase()} master data`} />

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-indigo-600 text-white'
                : 'glass text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            id={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary btn" id={`create-${tab}-btn`}>
          <Plus size={16} />New {tabLabel.slice(0, -1)}
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={headers.length} />
            ) : !(items as any[])?.length ? (
              <tr><td colSpan={headers.length}>
                <EmptyState title={`No ${tabLabel.toLowerCase()}`} message="Create your first entry." action={<button onClick={openCreate} className="btn-primary btn btn-sm"><Plus size={14} />Add {tabLabel.slice(0, -1)}</button>} />
              </td></tr>
            ) : (
              (items as any[]).map(item => renderRow(item))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit ${tabLabel.slice(0, -1)}` : `New ${tabLabel.slice(0, -1)}`}
        size="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary btn">Cancel</button>
            <button form="master-form" type="submit" disabled={isSubmitting} className="btn-primary btn">
              {isSubmitting ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="master-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {renderForm()}
        </form>
      </Modal>
    </>
  );
}
