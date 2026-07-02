import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Upload } from 'lucide-react';
import { Modal } from '../common/Primitives';
import { productService, uploadService } from '../../api/services';

const EMPTY = {
  name: '',
  sku: '',
  barcode: '',
  category_id: '',
  supplier_id: '',
  cost_price: '',
  selling_price: '',
  stock_quantity: '',
  reorder_level: '5',
  unit: 'pc',
  image_url: '',
  description: '',
};

export default function ProductFormModal({ open, onClose, onSaved, product, categories, suppliers }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        supplier_id: product.supplier_id || '',
        cost_price: product.cost_price ?? '',
        selling_price: product.selling_price ?? '',
        stock_quantity: product.stock_quantity ?? '',
        reorder_level: product.reorder_level ?? '5',
        unit: product.unit || 'pc',
        image_url: product.image_url || '',
        description: product.description || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [product, open]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadService.productImage(file);
      setForm((f) => ({ ...f, image_url: res.data.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
        image_url: form.image_url || null,
        barcode: form.barcode || null,
        description: form.description || null,
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        stock_quantity: Number(form.stock_quantity) || 0,
        reorder_level: Number(form.reorder_level) || 0,
      };

      if (product) {
        await productService.update(product.id, payload);
        toast.success('Product updated');
      } else {
        await productService.create(payload);
        toast.success('Product added to inventory');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit Product' : 'Add Product'} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg border border-border bg-paper overflow-hidden shrink-0 flex items-center justify-center">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Upload size={18} className="text-ink-faint" />
            )}
          </div>
          <label className="btn-secondary cursor-pointer text-xs">
            {uploading && <Loader2 size={14} className="animate-spin" />}
            {uploading ? 'Uploading…' : 'Upload product image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploading} />
          </label>
        </div>

        <Field label="Product name" required>
          <input required className="input-field" value={form.name} onChange={set('name')} placeholder="e.g. Ceramic Mug" />
        </Field>
        <Field label="SKU" required>
          <input required className="input-field" value={form.sku} onChange={set('sku')} placeholder="e.g. MUG-001" />
        </Field>
        <Field label="Barcode">
          <input className="input-field" value={form.barcode} onChange={set('barcode')} placeholder="Optional" />
        </Field>
        <Field label="Unit">
          <input className="input-field" value={form.unit} onChange={set('unit')} placeholder="pc, kg, box…" />
        </Field>
        <Field label="Category">
          <select className="input-field" value={form.category_id} onChange={set('category_id')}>
            <option value="">Uncategorized</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Supplier">
          <select className="input-field" value={form.supplier_id} onChange={set('supplier_id')}>
            <option value="">None</option>
            {suppliers?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Cost price" required>
          <input required type="number" step="0.01" min="0" className="input-field" value={form.cost_price} onChange={set('cost_price')} />
        </Field>
        <Field label="Selling price" required>
          <input required type="number" step="0.01" min="0" className="input-field" value={form.selling_price} onChange={set('selling_price')} />
        </Field>
        <Field label="Stock quantity" required>
          <input required type="number" min="0" className="input-field" value={form.stock_quantity} onChange={set('stock_quantity')} disabled={!!product} />
        </Field>
        <Field label="Reorder level" required>
          <input required type="number" min="0" className="input-field" value={form.reorder_level} onChange={set('reorder_level')} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea rows={2} className="input-field" value={form.description} onChange={set('description')} />
          </Field>
        </div>

        {product && (
          <p className="md:col-span-2 text-xs text-ink-faint -mt-2">
            Stock quantity is locked here — use "Adjust Stock" for manual corrections so every change stays audited.
          </p>
        )}

        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {product ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink block mb-1.5">
        {label} {required && <span className="text-rust-500">*</span>}
      </label>
      {children}
    </div>
  );
}
