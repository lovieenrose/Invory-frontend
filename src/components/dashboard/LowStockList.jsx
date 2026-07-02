import React from 'react';
import { Link } from 'react-router-dom';
import { PackageCheck } from 'lucide-react';
import { EmptyState, Badge } from '../common/Primitives';

export default function LowStockList({ items = [] }) {
  if (!items.length) {
    return <EmptyState icon={PackageCheck} title="All stocked up" description="No products are below their reorder level." />;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {items.map((p) => (
        <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{p.name}</p>
            <p className="text-xs text-ink-faint">Reorder at {p.reorder_level}</p>
          </div>
          <Badge tone={p.stock_quantity === 0 ? 'danger' : 'warning'}>
            {p.stock_quantity === 0 ? 'Out of stock' : `${p.stock_quantity} left`}
          </Badge>
        </div>
      ))}
      <Link to="/incoming-stock" className="text-sm font-medium text-brand-600 hover:underline pt-3">
        Create a purchase order →
      </Link>
    </div>
  );
}
