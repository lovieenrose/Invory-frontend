import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Loader2, ShoppingCart } from 'lucide-react';
import { salesService } from '../../api/services';
import { formatCurrency } from '../../utils/format';
import { EmptyState } from '../common/Primitives';

export default function CartPanel({ cart, onUpdateQty, onUpdatePrice, onRemove, onCheckoutSuccess }) {
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [checkingOut, setCheckingOut] = useState(false);

  const items = cart.map((c) => ({ product_id: c.id, quantity: c.qty, unit_price: c.unitPrice }));

  useEffect(() => {
    if (!cart.length) {
      setPreview(null);
      return;
    }
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await salesService.preview({ items, discount: Number(discount) || 0 });
        setPreview(res.data);
      } catch (err) {
        // Non-fatal — likely a stale item; ignore, checkout will validate again
      } finally {
        setPreviewLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), discount]);

  const handleCheckout = async () => {
    if (!cart.length) return;
    setCheckingOut(true);
    try {
      const res = await salesService.checkout({
        items,
        discount: Number(discount) || 0,
        customer_name: customerName || null,
        payment_method: paymentMethod,
      });
      toast.success(`Sale completed — ${res.data.order_number}`);
      onCheckoutSuccess();
      setDiscount('0');
      setCustomerName('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="card p-5 flex flex-col gap-4 sticky top-24">
      <h2 className="font-display font-semibold flex items-center gap-2">
        <ShoppingCart size={18} /> Current Order
      </h2>

      {!cart.length ? (
        <EmptyState icon={ShoppingCart} title="Cart is empty" description="Select products from the left to start a sale." />
      ) : (
        <>
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                  <p className="text-xs text-ink-faint">Cost {formatCurrency(item.costPrice)} each</p>
                </div>
                <input
                  type="number"
                  min="1"
                  max={item.stock}
                  className="input-field w-16 !py-1.5 text-center"
                  value={item.qty}
                  onChange={(e) => onUpdateQty(item.id, Math.max(1, Math.min(item.stock, Number(e.target.value) || 1)))}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field w-20 !py-1.5 text-center"
                  value={item.unitPrice}
                  onChange={(e) => onUpdatePrice(item.id, Number(e.target.value))}
                  title="Adjustable selling price (markup control)"
                />
                <button onClick={() => onRemove(item.id)} className="p-1.5 text-ink-faint hover:text-rust-500 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 flex flex-col gap-2">
            <input
              className="input-field"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <div className="flex gap-2">
              <select className="input-field flex-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="ewallet">E-Wallet</option>
                <option value="other">Other</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field w-28"
                placeholder="Discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>

          {preview && (
            <div className="border-t border-border pt-3 flex flex-col gap-1.5 text-sm">
              <Row label="Subtotal" value={formatCurrency(preview.subtotal)} />
              <Row label="Discount" value={`-${formatCurrency(preview.discount)}`} />
              <Row label="Total Revenue" value={formatCurrency(preview.total)} bold />
              <Row label="Total Cost (COGS)" value={formatCurrency(preview.total_cost)} muted />
              <Row label="Gross Profit" value={formatCurrency(preview.gross_profit)} tone="brand" bold />
              <Row label="Margin" value={`${preview.margin_pct}%`} tone="gold" />
            </div>
          )}

          <button onClick={handleCheckout} disabled={checkingOut || previewLoading} className="btn-primary w-full">
            {checkingOut && <Loader2 size={16} className="animate-spin" />}
            Complete Sale
          </button>
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted, tone }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-ink-faint' : 'text-ink-soft'}>{label}</span>
      <span
        className={`tabular-nums ${bold ? 'font-semibold' : ''} ${
          tone === 'brand' ? 'text-brand-600' : tone === 'gold' ? 'text-gold-500' : 'text-ink'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
