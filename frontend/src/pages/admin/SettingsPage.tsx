import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TopBar } from '../../components/layouts/Sidebar';
import { User, Shield, Palette, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = () => {
    setIsSaving(true);
    // Mock save delay
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Settings saved successfully');
    }, 800);
  };

  return (
    <>
      <TopBar title="Settings & Profile" subtitle="Manage your account preferences" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 border-b border-slate-200 dark:border-white/10">
          {[
            { id: 'profile', label: 'My Profile', icon: User },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'preferences', label: 'Preferences', icon: Palette }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.id 
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400' 
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card">
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile Information</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your account's profile information and email address.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="input-field" defaultValue={user?.name || ''} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="input-field" defaultValue={user?.email || ''} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input type="text" className="input-field opacity-70 cursor-not-allowed" defaultValue={user?.role || 'Staff'} disabled />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Your role cannot be changed here. Contact an admin.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Update Password</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ensure your account is using a long, random password to stay secure.</p>
              </div>
              
              <div className="space-y-4 max-w-md">
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" className="input-field" placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" className="input-field" placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" className="input-field" placeholder="••••••••" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Display Preferences</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Customize how the application looks and feels.</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Interface Theme</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Toggle between Light and Dark mode.</p>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className="px-4 py-2 rounded-lg font-medium text-sm border transition-all duration-200 
                      bg-white text-slate-900 border-slate-200 shadow-sm hover:bg-slate-50 
                      dark:bg-slate-800 dark:text-white dark:border-white/10 dark:hover:bg-slate-700"
                  >
                    {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          
        </div>
      </div>
    </>
  );
}
