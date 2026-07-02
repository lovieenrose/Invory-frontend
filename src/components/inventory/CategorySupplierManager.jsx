import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { Modal } from '../common/Primitives';
import { categoryService, supplierService } from '../../api/services';

export default function CategorySupplierManager({ open, onClose, categories, suppliers, onChanged }) {
  const [tab, setTab] = useState('categories');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const list = tab === 'categories' ? categories : suppliers;
  const service = tab === 'categories' ? categoryService : supplierService;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await service.create({ name: name.trim() });
      setName('');
      onChanged();
      toast.success(tab === 'categories' ? 'Category added' : 'Supplier added');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await service.remove(id);
      onChanged();
      toast.success('Removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Categories & Suppliers">
      <div className="flex gap-1 bg-paper border border-border rounded-lg p-1 mb-4">
        {['categories', 'suppliers'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
              tab === t ? 'bg-surface shadow-card text-ink' : 'text-ink-soft'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          className="input-field"
          placeholder={tab === 'categories' ? 'New category name' : 'New supplier name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={saving} className="btn-primary px-3">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </form>

      <div className="flex flex-col divide-y divide-border max-h-64 overflow-y-auto">
        {(!list || list.length === 0) && <p className="text-sm text-ink-faint py-6 text-center">Nothing added yet.</p>}
        {list?.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-ink">{item.name}</span>
            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md text-ink-faint hover:text-rust-500 hover:bg-rust-50">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
