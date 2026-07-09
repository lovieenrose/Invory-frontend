import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Clipboard, Trash2, Loader2, ShoppingCart, X } from 'lucide-react';
import { salesService } from '../../api/services';
import { formatCurrency } from '../../utils/format';
import { EmptyState } from '../common/Primitives';

const PAYMENT_LABELS = {
  maya: 'Maya',
  maribank: 'Maribank',
  gotyme: 'GoTyme',
  gcash: 'GCash',
  bpi: 'BPI',
  cash: 'Cash',
  others: 'Others',
};

const DISCOUNT_TYPES = [
  { value: 'complete_set', label: 'Complete Set discount' },
  { value: 'duo_set', label: 'Duo set Discount' },
  { value: 'promo', label: 'Promo discount' },
];

export default function CartPanel({ cart, onUpdateQty, onUpdatePrice, onRemove, onClear, onCheckoutSuccess }) {
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState('promo');
  const [shippingFee, setShippingFee] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('maya');
  const [receiptData, setReceiptData] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const items = cart.map((c) => ({ product_id: c.id, quantity: c.qty, unit_price: c.unitPrice }));
  const paymentLabel = PAYMENT_LABELS[paymentMethod] || paymentMethod;
  const discountTypeLabel = DISCOUNT_TYPES.find((type) => type.value === discountType)?.label || 'Promo discount';

  useEffect(() => {
    if (!cart.length) {
      setPreview(null);
      return;
    }
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await salesService.preview({
          items,
          discount: Number(discount) || 0,
          shipping_fee: Number(shippingFee) || 0,
        });
        setPreview(res.data);
      } catch (err) {
        // Non-fatal — likely a stale item; ignore, checkout will validate again
      } finally {
        setPreviewLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), discount, shippingFee]);

  const buildCustomerReceipt = (order) => {
    const subtotal = Number(preview?.subtotal) || 0;
    const shipping = Number(shippingFee) || 0;
    const discountValue = Number(discount) || 0;
    const total = Number(preview?.total) || subtotal + shipping - discountValue;
    return {
      orderNumber: order.order_number,
      customerName: customerName || 'Walk-in',
      paymentLabel,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.qty,
        amount: item.unitPrice * item.qty,
      })),
      subtotal,
      shipping,
      discount: discountValue,
      discountTypeLabel,
      total,
    };
  };

  const handleCheckout = async () => {
    if (!cart.length) return;
    setCheckingOut(true);
    try {
      const res = await salesService.checkout({
        items,
        discount: Number(discount) || 0,
        shipping_fee: Number(shippingFee) || 0,
        customer_name: customerName || null,
        payment_method: paymentMethod,
        notes: `[DISCOUNT_TYPE:${discountType}]`,
      });
      toast.success(`Sale completed — ${res.data.order_number}`);
      setReceiptData(buildCustomerReceipt(res.data));
      onCheckoutSuccess();
      setDiscount('0');
      setDiscountType('promo');
      setShippingFee('0');
      setCustomerName('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="card p-5 flex flex-col gap-4 sticky top-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <ShoppingCart size={18} /> Current Order
        </h2>
        {!!cart.length && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-rust-600 hover:bg-rust-50"
            onClick={onClear}
          >
            <Trash2 size={13} /> Clear all
          </button>
        )}
      </div>

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
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Payment Method</span>
              <select className="input-field flex-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="maya">Maya</option>
                <option value="maribank">Maribank</option>
                <option value="gotyme">GoTyme</option>
                <option value="gcash">GCash</option>
                <option value="bpi">BPI</option>
                <option value="cash">Cash</option>
                <option value="others">Others</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Shipping Fee</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="Shipping"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Discount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="Discount"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Discount Type</span>
              <select className="input-field" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
          </div>

          {preview && (
            <div className="border-t border-border pt-3 flex flex-col gap-1.5 text-sm">
              <Row label="Subtotal" value={formatCurrency(preview.subtotal)} />
              <Row label="Shipping Fee" value={formatCurrency(preview.shipping_fee || 0)} />
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
      {receiptData && (
        <ReceiptModal
          title="Customer Copy"
          receipt={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
}

function receiptToText(receipt) {
  return [
    'CUSTOMER COPY',
    `Order #: ${receipt.orderNumber}`,
    `Customer: ${receipt.customerName}`,
    `Payment: ${receipt.paymentLabel}`,
    '',
    'Items:',
    ...receipt.items.map((item) => `${item.quantity}x ${item.name} - ${formatCurrency(item.amount)}`),
    '',
    `Subtotal: ${formatCurrency(receipt.subtotal)}`,
    `Shipping Fee: ${formatCurrency(receipt.shipping)}`,
    receipt.discount > 0 ? `${receipt.discountTypeLabel}: -${formatCurrency(receipt.discount)}` : `Discount: -${formatCurrency(receipt.discount)}`,
    `Total: ${formatCurrency(receipt.total)}`,
  ].join('\n');
}

function ReceiptModal({ title, receipt, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          <button type="button" className="p-1.5 text-ink-faint hover:text-ink" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 font-mono text-sm text-ink shadow-sm">
          <div className="text-center">
            <p className="text-base font-black tracking-wide">INVORY</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-ink-soft">Customer Receipt</p>
          </div>
          <div className="my-4 border-t border-dashed border-border" />
          <div className="space-y-1 text-xs">
            <ReceiptRow label="Order" value={receipt.orderNumber} />
            <ReceiptRow label="Customer" value={receipt.customerName} />
            <ReceiptRow label="Payment" value={receipt.paymentLabel} />
          </div>
          <div className="my-4 border-t border-dashed border-border" />
          <div className="space-y-2">
            {receipt.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[auto_1fr_auto] gap-2">
                <span>{item.quantity}x</span>
                <span className="min-w-0">{item.name}</span>
                <span className="tabular-nums">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
          <div className="my-4 border-t border-dashed border-border" />
          <div className="space-y-1">
            <ReceiptRow label="Subtotal" value={formatCurrency(receipt.subtotal)} />
            <ReceiptRow label="Shipping" value={formatCurrency(receipt.shipping)} />
            <ReceiptRow
              label={receipt.discount > 0 ? receipt.discountTypeLabel : 'Discount'}
              value={`-${formatCurrency(receipt.discount)}`}
            />
          </div>
          <div className="my-4 border-t border-dashed border-border" />
          <div className="flex items-center justify-between text-base font-black">
            <span>Total</span>
            <span>{formatCurrency(receipt.total)}</span>
          </div>
          <p className="mt-5 text-center text-[11px] uppercase tracking-[0.18em] text-ink-soft">Thank you for your purchase</p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              navigator.clipboard?.writeText(receiptToText(receipt));
              toast.success('Customer copy copied');
            }}
          >
            <Clipboard size={16} /> Copy
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ReceiptRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-semibold">{value}</span>
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
