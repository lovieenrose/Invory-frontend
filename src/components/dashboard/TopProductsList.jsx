import React from 'react';
import { Trophy } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/format';
import { EmptyState } from '../common/Primitives';

export default function TopProductsList({ products = [] }) {
  if (!products.length) {
    return <EmptyState icon={Trophy} title="No sales in this period" description="Top-selling products will show up here." />;
  }

  const maxUnits = Math.max(...products.map((p) => p.units_sold));

  return (
    <div className="flex flex-col gap-4">
      {products.map((p, idx) => (
        <div key={p.product_id} className="flex items-center gap-3">
          <span className="w-5 text-xs font-semibold text-ink-faint tabular-nums">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-sm font-medium text-ink truncate">{p.name}</span>
              <span className="text-sm font-semibold text-ink tabular-nums shrink-0">{formatCurrency(p.revenue)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-paper overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${(p.units_sold / maxUnits) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-ink-faint tabular-nums w-16 text-right shrink-0">
            {formatNumber(p.units_sold)} units
          </span>
        </div>
      ))}
    </div>
  );
}
