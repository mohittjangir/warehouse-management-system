import type { StockStatus } from '../types';

export function getStockBadge(status: StockStatus) {
  switch (status) {
    case 'HEALTHY': return { className: 'badge-healthy', label: 'Healthy', dotClass: 'dot-healthy' };
    case 'LOW_STOCK': return { className: 'badge-low', label: 'Low Stock', dotClass: 'dot-low' };
    case 'OUT_OF_STOCK': return { className: 'badge-out', label: 'Out of Stock', dotClass: 'dot-out' };
    case 'OVERSTOCK': return { className: 'badge-over', label: 'Overstock', dotClass: 'dot-over' };
    default: return { className: 'badge-healthy', label: status, dotClass: 'dot-healthy' };
  }
}

export function getTxnBadge(type: string) {
  switch (type) {
    case 'STOCK_IN': return { className: 'badge-healthy', label: 'Stock In' };
    case 'STOCK_OUT': return { className: 'badge-out', label: 'Stock Out' };
    case 'ADJUSTMENT': return { className: 'badge-adj', label: 'Adjustment' };
    case 'TRANSFER': return { className: 'badge-in', label: 'Transfer' };
    default: return { className: 'badge-in', label: type };
  }
}

export function formatQty(units: number, cartons: number, loose: number, unitCode?: string): string {
  const unit = unitCode || 'units';
  if (cartons === 0 && loose === 0 && units === 0) return `0 ${unit}`;
  if (cartons > 0 && loose > 0) return `${cartons} ctn + ${loose} ${unit}`;
  if (cartons > 0 && loose === 0) return `${cartons} carton${cartons !== 1 ? 's' : ''}`;
  return `${loose} ${unit}`;
}

export function formatDate(dateStr: string): string {
  const normalizedStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
  return new Date(normalizedStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatDateTime(dateStr: string): string {
  const normalizedStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
  return new Date(normalizedStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatTimeAgo(dateStr: string): string {
  const normalizedStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
  const diff = Date.now() - new Date(normalizedStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(dateStr);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getAgeCategory(days: number): { label: string; className: string } {
  if (days <= 30) return { label: '0-30 days', className: 'badge-healthy' };
  if (days <= 60) return { label: '31-60 days', className: 'badge-in' };
  if (days <= 90) return { label: '61-90 days', className: 'badge-low' };
  return { label: '90+ days', className: 'badge-out' };
}
