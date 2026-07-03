import React, { useMemo, useState } from 'react';
import { Search, PackageX, Tags } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { EmptyState } from '../common/Primitives';

export default function ProductPicker({ products, categories = [], onSelect }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (products || []).filter((product) => {
      const productCategoryId = product.category_id || product.category?.id;
      const matchesCategory = !categoryFilter || productCategoryId === categoryFilter;
      const matchesSearch = !term
        || product.name?.toLowerCase().includes(term)
        || product.sku?.toLowerCase().includes(term)
        || product.barcode?.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, products, search]);

  const selectedCategoryName = categories.find((category) => category.id === categoryFilter)?.name;
  const emptyDescription = categoryFilter
    ? `No products match ${search ? `"${search}" in ` : ''}${selectedCategoryName || 'this category'}.`
    : 'Try a different search term or category.';

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input-field pl-9"
            placeholder="Search products to add…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative md:w-56">
          <Tags size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <select
            className="input-field pl-9"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter products by category"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!filtered.length ? (
        <EmptyState icon={PackageX} title="No products found" description={emptyDescription} />
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
