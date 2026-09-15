import type { StockStatus } from '../../types';
import { getStockBadge, getTxnBadge } from '../../utils/helpers';

export function StockBadge({ status }: { status: StockStatus }) {
  const { className, label, dotClass } = getStockBadge(status);
  return (
    <span className={className}>
      <span className={dotClass} />
      {label}
    </span>
  );
}

export function TxnBadge({ type }: { type: string }) {
  const { className, label } = getTxnBadge(type);
  return <span className={className}>{label}</span>;
}

export function CartonDisplay({
  cartons, looseUnits, totalUnits, unitCode = 'pcs',
}: {
  cartons: number;
  looseUnits: number;
  totalUnits: number;
  unitCode?: string;
}) {
  if (totalUnits === 0) {
    return <span className="text-slate-500">—</span>;
  }
  return (
    <div className="space-y-0.5">
      <div className="font-semibold text-white tabular-nums">
        {cartons > 0 && <span>{cartons} ctn</span>}
        {cartons > 0 && looseUnits > 0 && <span className="text-slate-500"> + </span>}
        {looseUnits > 0 && <span>{looseUnits} {unitCode}</span>}
        {cartons === 0 && looseUnits === 0 && totalUnits > 0 && <span>{totalUnits} {unitCode}</span>}
      </div>
      <div className="text-xs text-slate-500">{totalUnits} total {unitCode}</div>
    </div>
  );
}
