import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Minus } from 'lucide-react';
import { Modal } from '../common/Primitives';
import { productService } from '../../api/services';

const REASONS = [
  { value: 'recount', label: 'Stock recount' },
  { value: 'damaged', label: 'Damaged goods' },
  { value: 'lost', label: 'Lost / missing' },
  { value: 'returned', label: 'Customer return' },
  { value: 'correction', label: 'Data entry correction' },
  { value: 'other', label: 'Other' },
];

export default function StockAdjustModal({ open, onClose, product, onSaved }) {
  const [direction, setDirection] = useState('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('recount');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(amount);
    if (!qty || qty <= 0) return toast.error('Enter a quantity greater than 0');

    setSaving(true);
    try {
      await productService.adjustStock(product.id, {
        change: direction === 'add' ? qty : -qty,
        reason,
        notes: notes || null,
      });
      toast.success('Stock adjusted');
      onSaved();
      onClose();
      setAmount('');
      setNotes('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Adjust stock — ${product.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          Current quantity: <span className="font-semibold text-ink">{product.stock_quantity} {product.unit}</span>
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDirection('add')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
              direction === 'add' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-border text-ink-soft'
            }`}
          >
            <Plus size={15} /> Add stock
          </button>
          <button
            type="button"
            onClick={() => setDirection('remove')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
              direction === 'remove' ? 'border-rust-500 bg-rust-50 text-rust-500' : 'border-border text-ink-soft'
            }`}
          >
            <Minus size={15} /> Remove stock
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-ink block mb-1.5">Quantity</label>
          <input type="number" min="1" required className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-ink block mb-1.5">Reason</label>
          <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-ink block mb-1.5">Notes (optional)</label>
          <textarea rows={2} className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save adjustment
          </button>
        </div>
      </form>
    </Modal>
  );
}
