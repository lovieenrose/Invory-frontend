import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Modal } from '../common/Primitives';
import { financialsService } from '../../api/services';

const CATEGORIES = ['Shipping Fees', 'Handling Fees', 'Marketing', 'Supplies', 'Salary', 'Software'];

export default function ExpenseFormModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ category: 'Shipping Fees', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await financialsService.createExpense({ ...form, amount: Number(form.amount) });
      toast.success('Expense recorded');
      onSaved();
      onClose();
      setForm({ category: 'other', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Expense">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-ink block mb-1.5">Category</label>
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-ink block mb-1.5">Description</label>
          <input required className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Amount</label>
            <input required type="number" min="0.01" step="0.01" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Date</label>
            <input required type="date" className="input-field" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save expense
          </button>
        </div>
      </form>
    </Modal>
  );
}
