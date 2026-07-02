import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../common/Primitives';
import { incomingStockService } from '../../api/services';
import { formatCurrency } from '../../utils/format';

export default function PurchaseOrderFormModal({ open, onClose, onSaved, suppliers, products }) {
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity_ordered: '', unit_cost: '' }]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSupplierId('');
    setExpectedDate('');
    setNotes('');
    setItems([{ product_id: '', quantity_ordered: '', unit_cost: '' }]);
  };

  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };

  const handleProductPick = (idx, productId) => {
    const product = products?.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, product_id: productId, unit_cost: product ? product.cost_price : it.unit_cost } : it)),
    );
  };

  const addRow = () => setItems((prev) => [...prev, { product_id: '', quantity_ordered: '', unit_cost: '' }]);
  const removeRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((s, it) => s + (Number(it.quantity_ordered) || 0) * (Number(it.unit_cost) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) return toast.error('Select a supplier');
    const validItems = items.filter((it) => it.product_id && it.quantity_ordered);
    if (!validItems.length) return toast.error('Add at least one item');

    setSaving(true);
    try {
      await incomingStockService.create({
        supplier_id: supplierId,
        expected_date: expectedDate || null,
        notes: notes || null,
        items: validItems.map((it) => ({
          product_id: it.product_id,
          quantity_ordered: Number(it.quantity_ordered),
          unit_cost: Number(it.unit_cost) || 0,
        })),
      });
      toast.success('Purchase order created');
      onSaved();
      onClose();
      reset();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Purchase Order" wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Supplier *</label>
            <select required className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Expected delivery date</label>
            <input type="date" className="input-field" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink">Items</label>
            <button type="button" onClick={addRow} className="text-sm text-brand-600 font-medium flex items-center gap-1 hover:underline">
              <Plus size={14} /> Add item
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  className="input-field flex-1"
                  value={item.product_id}
                  onChange={(e) => handleProductPick(idx, e.target.value)}
                >
                  <option value="">Select product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  className="input-field w-20"
                  value={item.quantity_ordered}
                  onChange={(e) => updateItem(idx, 'quantity_ordered', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit cost"
                  className="input-field w-28"
                  value={item.unit_cost}
                  onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="p-2 rounded-md text-ink-faint hover:text-rust-500 hover:bg-rust-50 shrink-0"
                  disabled={items.length === 1}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink block mb-1.5">Notes</label>
          <textarea rows={2} className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-ink-soft">
            Estimated total: <span className="font-semibold text-ink">{formatCurrency(total)}</span>
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={16} className="animate-spin" />}
              Create order
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
