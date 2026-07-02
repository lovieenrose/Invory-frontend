import React, { useState } from 'react';
import { Search, PackageX } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { EmptyState } from '../common/Primitives';

export default function ProductPicker({ products, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = (products || []).filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          className="input-field pl-9"
          placeholder="Search products to add…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!filtered.length ? (
        <EmptyState icon={PackageX} title="No products found" description="Try a different search term." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              disabled={p.stock_quantity === 0}
              className="text-left rounded-lg border border-border p-3 hover:border-brand-500 hover:shadow-card transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-full aspect-square rounded-md bg-paper border border-border overflow-hidden mb-2">
                {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="text-sm font-medium text-ink truncate">{p.name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-semibold text-brand-600 tabular-nums">{formatCurrency(p.selling_price)}</span>
                <span className="text-xs text-ink-faint">{p.stock_quantity} left</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
