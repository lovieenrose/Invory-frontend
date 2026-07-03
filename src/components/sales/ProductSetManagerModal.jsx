import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, ChevronUp, ChevronDown, Trash2, Pencil, Package, Box, ShoppingBag, Star, Layers, Sparkles, Tag } from 'lucide-react';
import { Modal, EmptyState } from '../common/Primitives';
import { productSetsService } from '../../api/services';

const iconOptions = [
  { value: 'Package', label: 'Package' },
  { value: 'Box', label: 'Box' },
  { value: 'ShoppingBag', label: 'Shopping Bag' },
  { value: 'Star', label: 'Star' },
  { value: 'Layers', label: 'Layers' },
  { value: 'Sparkles', label: 'Sparkles' },
  { value: 'Tag', label: 'Tag' },
];

const iconMap = {
  Package,
  Box,
  ShoppingBag,
  Star,
  Layers,
  Sparkles,
  Tag,
};

function RenderIcon({ name, className }) {
  const Icon = iconMap[name] || Package;
  return <Icon className={className} />;
}

const emptySet = {
  name: '',
  color: '#EFF6FF',
  icon: 'Package',
  sort_order: 0,
  items: [{ product_id: '', quantity: 1 }],
};

export default function ProductSetManagerModal({ open, onClose, onSaved, products = [], sets = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptySet);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setForm(emptySet);
    setSearch('');
  }, [open]);

  const sortedSets = useMemo(
    () => (sets || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [sets],
  );

  const visibleSets = useMemo(
    () => sortedSets.filter((set) => set.name.toLowerCase().includes(search.toLowerCase())),
    [search, sortedSets],
  );

  const selectedSet = useMemo(() => sortedSets.find((set) => set.id === selectedId), [selectedId, sortedSets]);

  useEffect(() => {
    if (!selectedSet) return;
    setForm({
      name: selectedSet.name,
      color: selectedSet.color || '#EFF6FF',
      icon: selectedSet.icon || 'Package',
      sort_order: selectedSet.sort_order ?? 0,
      items: selectedSet.items?.map((item) => ({ ...item })) || [{ product_id: '', quantity: 1 }],
    });
  }, [selectedSet]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const setItemField = (idx, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: field === 'quantity' ? Number(value) : value };
      return { ...prev, items };
    });
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { product_id: '', quantity: 1 }] }));
  const removeItem = (idx) => setForm((prev) => ({ ...prev, items: prev.items.filter((_, index) => index !== idx) }));

  const handleStartNew = () => {
    setSelectedId(null);
    setForm(emptySet);
  };

  const handleDelete = async (setToDelete) => {
    if (!confirm(`Delete product set "${setToDelete.name}"? This cannot be undone.`)) return;
    try {
      await productSetsService.remove(setToDelete.id);
      toast.success('Product set deleted');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('A name is required.');
      return;
    }
    if (!form.items.length) {
      toast.error('Add at least one product to the set.');
      return;
    }
    const duplicate = form.items.some((item, index) =>
      form.items.findIndex((other) => other.product_id === item.product_id) !== index,
    );
    if (duplicate) {
      toast.error('Each product can only appear once in the set.');
      return;
    }
    if (form.items.some((item) => !item.product_id)) {
      toast.error('Select a product for every item row.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color || null,
        icon: form.icon || null,
        sort_order: form.sort_order,
        items: form.items.map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity) || 1 })),
      };

      if (selectedId) {
        await productSetsService.update(selectedId, payload);
        toast.success('Product set updated');
      } else {
        await productSetsService.create(payload);
        toast.success('Product set created');
      }
      onSaved();
      setSelectedId(null);
      setForm(emptySet);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const buildSetPayload = (set, sortOrder) => ({
    name: set.name,
    color: set.color || null,
    icon: set.icon || null,
    sort_order: sortOrder,
    items: (set.items || []).map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity) || 1,
    })),
  });

  const handleReorder = async (setItem, direction) => {
    const currentIndex = sortedSets.findIndex((set) => set.id === setItem.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedSets.length) return;

    const reordered = [...sortedSets];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await Promise.all(reordered.map((set, index) => (
        productSetsService.update(set.id, buildSetPayload(set, index))
      )));
      toast.success('Set order updated');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const findProduct = (id) => products.find((product) => product.id === id);

  return (
    <Modal open={open} onClose={onClose} title="Manage Product Sets" wide size="xl">
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                className="input-field pl-9"
                placeholder="Filter sets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className="btn-secondary" onClick={handleStartNew}>
              <Plus size={16} /> New
            </button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {visibleSets.length ? (
              visibleSets.map((set) => (
                <div key={set.id} className="rounded-2xl border border-border p-3 bg-paper">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => setSelectedId(set.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-white border border-border flex items-center justify-center text-brand-600">
                          <RenderIcon name={set.icon} className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{set.name}</p>
                          <p className="text-xs text-ink-faint">{set.items?.length || 0} item(s)</p>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleReorder(set, -1)}
                        disabled={sortedSets[0]?.id === set.id}
                        className="p-2 rounded-lg border border-border text-ink-faint hover:text-ink"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(set, 1)}
                        disabled={sortedSets[sortedSets.length - 1]?.id === set.id}
                        className="p-2 rounded-lg border border-border text-ink-faint hover:text-ink"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-faint">
                    <span>Color: {set.color || 'default'}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedId(set.id)}
                        className="text-brand-600 hover:underline"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(set)}
                        className="text-rust-600 hover:underline"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No product sets"
                description="Create reusable bundles for faster POS checkout."
                action={
                  <button type="button" className="btn-primary" onClick={handleStartNew}>
                    <Plus size={16} /> Create first set
                  </button>
                }
              />
            )}
          </div>
        </div>

        <div>
          <div className="rounded-3xl border border-border bg-paper p-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{selectedSet ? 'Edit product set' : 'New product set'}</p>
                <p className="text-sm text-ink-soft">Bundles are expanded into line items when added to the cart.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="TRX30 Kit"
                />
              </div>
              <div>
                <label className="label">Color</label>
                <input
                  type="color"
                  className="w-full h-12 rounded-xl border border-border p-0"
                  value={form.color}
                  onChange={(e) => setField('color', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
              <div>
                <label className="label">Icon</label>
                <select
                  className="input-field"
                  value={form.icon}
                  onChange={(e) => setField('icon', e.target.value)}
                >
                  {iconOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Display order</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.sort_order}
                  onChange={(e) => setField('sort_order', Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-semibold text-ink">Products</p>
                <p className="text-sm text-ink-soft">Each item will be added to the cart individually.</p>
              </div>

              <div className="space-y-4">
                {form.items.map((item, idx) => {
                  const product = findProduct(item.product_id);
                  return (
                    <div key={`${item.product_id || idx}`} className="rounded-2xl border border-border bg-surface p-4">
                      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_96px_44px]">
                        <div>
                          <label className="label">Product</label>
                          <select
                            className="input-field w-full"
                            value={item.product_id}
                            onChange={(e) => setItemField(idx, 'product_id', e.target.value)}
                          >
                            <option value="">Select product</option>
                            {products.map((productOption) => (
                              <option key={productOption.id} value={productOption.id}>
                                {productOption.name} ({productOption.stock_quantity} left)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">Qty</label>
                          <input
                            type="number"
                            min="1"
                            className="input-field"
                            value={item.quantity}
                            onChange={(e) => setItemField(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="btn-secondary h-11 w-11 p-0"
                          aria-label="Remove product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {product && (
                        <div className="mt-3 text-xs text-ink-faint">
                          Selected: {product.name} — {product.stock_quantity} in stock
                        </div>
                      )}
                    </div>
                  );
                })}
                <button type="button" className="btn-secondary w-full justify-center sm:w-auto" onClick={addItem}>
                  <Plus size={16} /> Add product
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : selectedSet ? 'Save changes' : 'Create set'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
