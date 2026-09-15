interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
}

export function StatCard({ title, value, subtitle, icon, accentColor, trend, onClick }: StatCardProps) {
  return (
    <div
      className={`stat-card ${onClick ? 'cursor-pointer' : ''}`}
      style={{ '--card-accent': accentColor } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 break-words">{title}</p>
          <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ml-4"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
