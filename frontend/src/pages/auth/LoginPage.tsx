import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { Warehouse, Eye, EyeOff, AlertCircle } from 'lucide-react';
import logoUrl from '../../assets/logo.png';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (isAuthenticated) {
    const dest = user?.role === 'ADMIN' ? '/admin/dashboard' : '/inventory/dashboard';
    return <Navigate to={dest} replace />;
  }

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      const dest = JSON.parse(localStorage.getItem('wims_user') || '{}')?.role === 'ADMIN'
        ? '/admin/dashboard' : '/inventory/dashboard';
      navigate(dest, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Login failed. Check credentials.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 relative">
      <div className="absolute inset-0 z-0 hidden dark:block" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a0f1e 100%)' }} />
      <div className="relative z-10 flex w-full">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }} />
        <div className="relative z-10 max-w-md text-center">
          <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center mx-auto mb-8 p-3"
            style={{ boxShadow: '0 0 60px rgba(99,102,241,0.4)' }}>
            <img src={logoUrl} alt="WIMS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Warehouse Inventory
            <br /><span className="text-indigo-600 dark:text-indigo-400">Management System</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            Track every carton. Monitor every movement.
            Complete inventory visibility in real-time.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-12">
            {[
              { label: 'FIFO Tracking', icon: '🔄' },
              { label: 'Real-time Stock', icon: '📊' },
              { label: 'Audit Trail', icon: '🔒' },
            ].map(f => (
              <div key={f.label} className="glass rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="glass rounded-3xl p-6 sm:p-8" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-white border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 p-1.5 shadow-sm">
                <img src={logoUrl} alt="WIMS Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign In</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Access your warehouse portal</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@warehouse.com"
                  className="form-input"
                  id="email"
                />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="form-input pr-12"
                    id="password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary btn w-full justify-center py-3 text-sm font-semibold mt-2"
                id="login-btn"
              >
                {isSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs text-slate-400 font-semibold mb-2">🔑 Development Credentials</p>
              <div className="space-y-1 text-xs text-slate-400">
                <p><span className="text-slate-300">Admin:</span> admin@warehouse.com / Admin@123456</p>
                <p><span className="text-slate-300">Staff:</span> rahul@warehouse.com / Staff@123456</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
