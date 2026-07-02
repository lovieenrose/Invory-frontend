import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, PackageCheck } from 'lucide-react';
import { Modal, Badge } from '../common/Primitives';
import { incomingStockService } from '../../api/services';
import { formatCurrency, formatDate } from '../../utils/format';

export default function ReceiveOrderModal({ open, onClose, order, onReceived, onUpdated }) {
  const [status, setStatus] = useState(order?.status || 'pending');
  const [handlingFee, setHandlingFee] = useState(order?.handling_fee ?? 0);
  const [shippingFee, setShippingFee] = useState(order?.shipping_fee ?? 0);
  const [saving, setSaving] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);

  useEffect(() => {
    if (order) {
      setStatus(order.status || 'pending');
      setHandlingFee(order.handling_fee ?? 0);
      setShippingFee(order.shipping_fee ?? 0);
    }
  }, [order]);

  if (!order) return null;

  const alreadyFullyReceived = order.status === 'received';

  const handleReceive = async () => {
    setSaving(true);
    try {
      const needsSave =
        status !== order.status ||
        Number(handlingFee) !== Number(order.handling_fee || 0) ||
        Number(shippingFee) !== Number(order.shipping_fee || 0);

      if (needsSave) {
        await incomingStockService.update(order.id, {
          status,
          handling_fee: Number(handlingFee) || 0,
          shipping_fee: Number(shippingFee) || 0,
        });
      }

      await incomingStockService.receive(order.id);
      toast.success('Delivery received — inventory updated automatically');
      onReceived();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSavingUpdate(true);
    try {
      await incomingStockService.update(order.id, {
        status,
        handling_fee: Number(handlingFee) || 0,
        shipping_fee: Number(shippingFee) || 0,
      });
      toast.success('Purchase order updated');
      if (onUpdated) await onUpdated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingUpdate(false);
    }
  };

  const orderBaseTotal = Number(order.total_cost || 0) - (Number(order.handling_fee) || 0) - (Number(order.shipping_fee) || 0);
  const currentTotal = orderBaseTotal + (Number(handlingFee) || 0) + (Number(shippingFee) || 0);

  return (
    <Modal open={open} onClose={onClose} title={`Purchase Order — ${order.supplier?.name || ''}`} wide>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge tone={order.status === 'received' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'}>
              {order.status.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-ink-soft">Expected {formatDate(order.expected_date)}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-ink block">Status</label>
              <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button onClick={handleUpdate} disabled={savingUpdate} className="btn-secondary self-end">
              {savingUpdate ? <Loader2 size={16} className="animate-spin" /> : 'Save changes'}
            </button>
          </div>
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 border-t border-border pt-4">
          <div className="space-y-1">
            <p className="text-sm text-ink-soft">Handling fee</p>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={handlingFee}
              onChange={(e) => setHandlingFee(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-ink-soft">Shipping fee</p>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-ink-soft">Current total</p>
            <p className="font-semibold text-ink">{formatCurrency(currentTotal)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-ink-faint">
            Marking as received automatically adds these quantities to inventory and updates cost pricing — no manual stock entry needed.
          </p>
          {!alreadyFullyReceived && (
            <button onClick={handleReceive} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
              Mark as Received
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
