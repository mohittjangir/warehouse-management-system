import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/api';
import { TopBar } from '../../components/layouts/Sidebar';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Key, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import type { User } from '../../types';
import { formatDate } from '../../utils/helpers';

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['ADMIN', 'INVENTORY_STAFF']),
});
type CreateForm = z.infer<typeof createSchema>;

const resetSchema = z.object({ new_password: z.string().min(8, 'Min 8 characters') });
type ResetForm = z.infer<typeof resetSchema>;

export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => userService.list().then(r => r.data),
  });

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: 'INVENTORY_STAFF' } });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onCreateSubmit = async (data: CreateForm) => {
    try {
      await userService.create(data);
      toast.success('User created successfully');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      createForm.reset();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed'); }
  };

  const onResetSubmit = async (data: ResetForm) => {
    if (!showReset) return;
    try {
      await userService.resetPassword(showReset.id, data.new_password);
      toast.success('Password reset successfully');
      setShowReset(null);
      resetForm.reset();
    } catch (err: any) { toast.error('Reset failed'); }
  };

  const toggleStatus = async (user: User) => {
    try {
      await userService.update(user.id, { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      toast.success(`User ${user.status === 'ACTIVE' ? 'deactivated' : 'activated'}`);
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <>
      <TopBar title="User Management" subtitle="Manage inventory staff accounts" />

      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="btn-primary btn" id="create-user-btn">
          <Plus size={16} />New User
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <TableSkeleton rows={4} cols={6} /> :
            !users?.length ? <tr><td colSpan={6}><EmptyState title="No users" message="Create staff accounts." /></td></tr>
            : users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="text-slate-400 text-sm">{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'ADMIN' ? 'badge-in' : 'badge-healthy'}`}>
                    {u.role === 'ADMIN' ? '🛡 Admin' : '📦 Staff'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.status === 'ACTIVE' ? 'badge-healthy' : 'badge-out'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="text-slate-500 text-xs">{formatDate(u.created_at)}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => setShowReset(u)} className="btn-icon btn-secondary btn-sm" title="Reset Password" id={`reset-${u.id}`}><Key size={14} /></button>
                    <button onClick={() => toggleStatus(u)} className={`btn-icon btn-sm ${u.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`} title={u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} id={`toggle-${u.id}`}>
                      {u.status === 'ACTIVE' ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New User" size="md"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-secondary btn">Cancel</button>
            <button form="create-user-form" type="submit" disabled={createForm.formState.isSubmitting} className="btn-primary btn">
              {createForm.formState.isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input {...createForm.register('name')} className="form-input" placeholder="e.g. Rahul Sharma" id="user-name" />
            {createForm.formState.errors.name && <p className="form-error">{createForm.formState.errors.name.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input {...createForm.register('email')} type="email" className="form-input" placeholder="user@warehouse.com" id="user-email" />
            {createForm.formState.errors.email && <p className="form-error">{createForm.formState.errors.email.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select {...createForm.register('role')} className="form-select" id="user-role">
              <option value="INVENTORY_STAFF">Inventory Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input {...createForm.register('password')} type="password" className="form-input" placeholder="Min 8 characters" id="user-password" />
            {createForm.formState.errors.password && <p className="form-error">{createForm.formState.errors.password.message}</p>}
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!showReset} onClose={() => setShowReset(null)} title={`Reset Password — ${showReset?.name}`} size="sm"
        footer={
          <>
            <button onClick={() => setShowReset(null)} className="btn-secondary btn">Cancel</button>
            <button form="reset-form" type="submit" className="btn-primary btn">Reset</button>
          </>
        }
      >
        <form id="reset-form" onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input {...resetForm.register('new_password')} type="password" className="form-input" placeholder="Min 8 characters" id="new-password" />
            {resetForm.formState.errors.new_password && <p className="form-error">{resetForm.formState.errors.new_password.message}</p>}
          </div>
        </form>
      </Modal>
    </>
  );
}
