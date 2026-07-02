import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, SlidersHorizontal, Trash2, Settings2, Boxes } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { Spinner, ErrorBanner, EmptyState, Badge } from '../components/common/Primitives';
import ProductFormModal from '../components/inventory/ProductFormModal';
import StockAdjustModal from '../components/inventory/StockAdjustModal';
import CategorySupplierManager from '../components/inventory/CategorySupplierManager';
import { useApiData } from '../hooks/useApiData';
import { productService, categoryService, supplierService } from '../api/services';
import { formatCurrency } from '../utils/format';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const { data: categories, reload: reloadCategories } = useApiData(() => categoryService.list(), []);
  const { data: suppliers, reload: reloadSuppliers } = useApiData(() => supplierService.list(), []);
  const {
    data: products,
    loading,
    error,
    reload,
  } = useApiData(
    () =>
      productService.list({
        search: search || undefined,
        category_id: categoryFilter || undefined,
        low_stock: lowStockOnly ? 'true' : undefined,
        pageSize: 100,
      }),
    [search, categoryFilter, lowStockOnly],
  );

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await productService.remove(product.id);
      toast.success('Product deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <Topbar
        title="Inventory"
        subtitle="Manage products, stock levels, categories, and suppliers"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setManagerOpen(true)}>
              <Settings2 size={16} /> <span className="hidden sm:inline">Categories & Suppliers</span>
            </button>
            <button className="btn-primary" onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
              <Plus size={16} /> Add Product
            </button>
          </>
        }
      />

      <div className="px-4 md:px-8 pb-8 flex flex-col gap-4">
        <ErrorBanner message={error?.message} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input-field pl-9"
              placeholder="Search by name, SKU, or barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input-field sm:w-48" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors shrink-0 ${
              lowStockOnly ? 'border-rust-500 bg-rust-50 text-rust-500' : 'border-border bg-surface text-ink-soft'
            }`}
          >
            <SlidersHorizontal size={15} /> Low stock only
          </button>
        </div>

        <div className="card overflow-x-auto">
          {loading ? (
            <Spinner />
          ) : !products?.length ? (
            <EmptyState
              icon={Boxes}
              title="No products found"
              description="Add your first product to start tracking inventory."
              action={
                <button className="btn-primary" onClick={() => setFormOpen(true)}>
                  <Plus size={16} /> Add Product
                </button>
              }
            />
          ) : (
            <table className="table-shell min-w-[800px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-paper border border-border overflow-hidden shrink-0">
                          {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="font-medium text-ink">{p.name}</span>
                      </div>
                    </td>
                    <td className="text-ink-soft">{p.sku}</td>
                    <td className="text-ink-soft">{p.category?.name || '—'}</td>
                    <td className="tabular-nums">{formatCurrency(p.cost_price)}</td>
                    <td className="tabular-nums font-medium">{formatCurrency(p.selling_price)}</td>
                    <td>
                      <Badge tone={p.stock_quantity === 0 ? 'danger' : p.stock_quantity <= p.reorder_level ? 'warning' : 'success'}>
                        {p.stock_quantity} {p.unit}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setAdjustingProduct(p)}
                          className="p-1.5 rounded-md text-ink-faint hover:text-brand-600 hover:bg-brand-50"
                          title="Adjust stock"
                        >
                          <SlidersHorizontal size={15} />
                        </button>
                        <button
                          onClick={() => { setEditingProduct(p); setFormOpen(true); }}
                          className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-paper"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded-md text-ink-faint hover:text-rust-500 hover:bg-rust-50"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
      />
      <StockAdjustModal
        open={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
        onSaved={reload}
      />
      <CategorySupplierManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        categories={categories}
        suppliers={suppliers}
        onChanged={() => { reloadCategories(); reloadSuppliers(); }}
      />
    </div>
  );
}
