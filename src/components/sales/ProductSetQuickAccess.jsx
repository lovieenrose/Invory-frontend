import React, { useMemo, useState } from 'react';
import { Search, Plus, Package, Box, ShoppingBag, Star, Layers, Sparkles, Tag } from 'lucide-react';
import { EmptyState } from '../common/Primitives';

const iconMap = {
  Package,
  Box,
  ShoppingBag,
  Star,
  Layers,
  Sparkles,
  Tag,
};

const defaultIcons = ['Package', 'Box', 'ShoppingBag', 'Star', 'Layers', 'Sparkles', 'Tag'];

function RenderIcon({ name, className }) {
  const Icon = iconMap[name] || Package;
  return <Icon className={className} />;
}

export function getBundleIconNames() {
  return defaultIcons;
}

export default function ProductSetQuickAccess({ sets = [], products = [], loading, onSelect, onManage }) {
  const [search, setSearch] = useState('');

  const productLookup = useMemo(
    () => (products || []).reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {}),
    [products],
  );

  const filteredSets = useMemo(() => {
    return (sets || []).filter((set) => set.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, sets]);

  return (
    <div className="card p-5 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input-field pl-9"
            placeholder="Search product sets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" onClick={onManage} className="btn-secondary whitespace-nowrap">
          <Plus size={16} /> Manage sets
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-ink-soft">Loading product sets…</div>
      ) : !filteredSets.length ? (
        <EmptyState
          title={sets?.length ? 'No matching sets' : 'No product sets yet'}
          description={sets?.length ? 'Try another search term.' : 'Create reusable product bundles for quick POS checkout.'}
          action={
            <button type="button" className="btn-primary" onClick={onManage}>
              <Plus size={16} /> Create a set
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSets.map((set) => (
            <button
              key={set.id}
              type="button"
              onClick={() => onSelect(set)}
              className="group flex min-h-[190px] flex-col text-left rounded-xl border border-border p-4 transition-shadow hover:shadow-card"
              style={{ backgroundColor: set.color || '#F8FAFC' }}
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="w-11 h-11 shrink-0 rounded-2xl bg-white/80 border border-border flex items-center justify-center text-brand-600">
                  <RenderIcon name={set.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink truncate">{set.name}</p>
                  <p className="text-xs text-ink-soft">{set.items?.length || 0} items</p>
                </div>
              </div>
              <div className="flex-1 text-sm text-ink-soft leading-6">
                {set.items?.slice(0, 3).map((item) => (
                  <p key={item.product_id} className="truncate">
                    {item.quantity}× {productLookup[item.product_id]?.name || 'Product'}
                  </p>
                ))}
                {set.items?.length > 3 && <p className="text-xs text-ink-faint">+{set.items.length - 3} more</p>}
              </div>
              <div className="mt-4 pt-3 border-t border-white/50">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/75 px-3 py-2 text-xs font-medium text-ink shadow-sm transition-colors group-hover:bg-white">
                  <Plus size={14} />
                  Quick add
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
