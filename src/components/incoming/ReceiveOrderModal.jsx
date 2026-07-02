import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, PackageCheck } from 'lucide-react';
import { Modal, Badge } from '../common/Primitives';
import { incomingStockService } from '../../api/services';
import { formatCurrency, formatDate } from '../../utils/format';

export default function ReceiveOrderModal({ open, onClose, order, onReceived }) {
  const [saving, setSaving] = useState(false);
  if (!order) return null;

  const alreadyFullyReceived = order.status === 'received';

  const handleReceive = async () => {
    setSaving(true);
    try {
      await incomingStockService.receive(order.id); // full receipt of remaining quantities
      toast.success('Delivery received — inventory updated automatically');
      onReceived();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Purchase Order — ${order.supplier?.name || ''}`} wide>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Badge tone={order.status === 'received' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'}>
            {order.status.replace('_', ' ')}
          </Badge>
          <span className="text-sm text-ink-soft">Expected {formatDate(order.expected_date)}</span>
        </div>

        <table className="table-shell">
          <thead>
            <tr>
              <th>Product</th>
              <th>Ordered</th>
              <th>Received</th>
              <th>Unit Cost</th>
              <th className="text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td className="font-medium text-ink">{item.product?.name || item.product_id}</td>
                <td>{item.quantity_ordered}</td>
                <td>{item.quantity_received}</td>
                <td className="tabular-nums">{formatCurrency(item.unit_cost)}</td>
                <td className="text-right tabular-nums">{formatCurrency(item.unit_cost * item.quantity_ordered)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-ink-soft">
            Total cost: <span className="font-semibold text-ink">{formatCurrency(order.total_cost)}</span>
          </span>
          {!alreadyFullyReceived && (
            <button onClick={handleReceive} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
              Mark as Received
            </button>
          )}
        </div>
        <p className="text-xs text-ink-faint">
          Marking as received automatically adds these quantities to inventory and updates cost pricing — no manual stock entry needed.
        </p>
      </div>
    </Modal>
  );
}
