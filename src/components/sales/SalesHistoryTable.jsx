import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Clipboard, Eye, RotateCcw, Receipt, X } from 'lucide-react';
import { EmptyState, Badge } from '../common/Primitives';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function SalesHistoryTable({ orders, loading, onReverse }) {
  const [receiptData, setReceiptData] = useState(null);

  if (!loading && !orders?.length) {
    return <EmptyState icon={Receipt} title="No sales yet" description="Completed sales will appear here with full profit breakdowns." />;
  }

  return (
    <>
      <table className="table-shell min-w-[980px]">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Status</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Items</th>
            <th>Revenue</th>
            <th>COGS</th>
            <th>Profit</th>
            <th>Margin</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((o) => {
            const reversed = (o.notes || '').startsWith('[REVERSED]');
            return (
              <tr key={o.id} className={reversed ? 'opacity-65' : ''}>
                <td className="font-medium text-ink">{o.order_number}</td>
                <td>
                  <Badge tone={reversed ? 'danger' : 'success'}>{reversed ? 'Reversed' : 'Completed'}</Badge>
                </td>
                <td className="text-ink-soft">{o.customer_name || 'Walk-in'}</td>
                <td className="text-ink-soft">{formatDateTime(o.created_at)}</td>
                <td className="text-ink-soft">{o.items?.length || 0}</td>
                <td className="tabular-nums font-medium">{formatCurrency(o.total)}</td>
                <td className="tabular-nums text-ink-soft">{formatCurrency(o.total_cost)}</td>
                <td className="tabular-nums text-brand-600 font-medium">{formatCurrency(o.gross_profit)}</td>
                <td>
                  <Badge tone={o.margin_pct >= 30 ? 'success' : o.margin_pct >= 10 ? 'warning' : 'danger'}>{o.margin_pct}%</Badge>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      onClick={() => setReceiptData(buildReceiptData(o))}
                    >
                      <Eye size={13} /> Receipt
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-rust-600 hover:bg-rust-50 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={reversed}
                      onClick={() => onReverse?.(o)}
                      title={reversed ? 'Sale already reversed' : 'Reverse sale and restore stock'}
                    >
                      <RotateCcw size={13} /> Reverse
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {receiptData && <ReceiptModal receipt={receiptData} onClose={() => setReceiptData(null)} />}
    </>
  );
}

function ReceiptModal({ receipt, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-ink">Digital Receipt</h3>
          <button type="button" className="p-1.5 text-ink-faint hover:text-ink" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <ReceiptCard receipt={receipt} />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              navigator.clipboard?.writeText(receiptToText(receipt));
              toast.success('Receipt copied');
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

function paymentLabel(value) {
  return {
    maya: 'Maya',
    maribank: 'Maribank',
    gotyme: 'GoTyme',
    gcash: 'GCash',
    bpi: 'BPI',
    cash: 'Cash',
    others: 'Others',
  }[value] || value || 'N/A';
}

function getShippingFee(order) {
  const match = String(order.notes || '').match(/\[SHIPPING_FEE:([0-9.]+)\]/);
  return match ? Number(match[1]) || 0 : 0;
}

function getDiscountTypeLabel(order) {
  const value = String(order.notes || '').match(/\[DISCOUNT_TYPE:([a-z_]+)\]/)?.[1];
  return {
    complete_set: 'Complete Set discount',
    duo_set: 'Duo set Discount',
    promo: 'Promo discount',
  }[value] || 'Discount';
}

function buildReceiptData(order) {
  const shipping = getShippingFee(order);
  const subtotal = Number(order.subtotal) || Math.max(0, Number(order.total || 0) + Number(order.discount || 0) - shipping);
  return {
    orderNumber: order.order_number,
    customerName: order.customer_name || 'Walk-in',
    date: formatDateTime(order.created_at),
    paymentLabel: paymentLabel(order.payment_method),
    items: (order.items || []).map((item) => ({
      id: item.id,
      name: item.product_name,
      quantity: item.quantity,
      amount: Number(item.line_revenue) || 0,
    })),
    subtotal,
    shipping,
    discount: Number(order.discount) || 0,
    discountTypeLabel: getDiscountTypeLabel(order),
    total: Number(order.total) || 0,
  };
}

function receiptToText(receipt) {
  return [
    'CUSTOMER COPY',
    `Order #: ${receipt.orderNumber}`,
    receipt.date ? `Date: ${receipt.date}` : null,
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
  ].filter(Boolean).join('\n');
}

function ReceiptCard({ receipt }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 font-mono text-sm text-ink shadow-sm">
      <div className="text-center">
        <p className="text-base font-black tracking-wide">INVORY</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-ink-soft">Digital Receipt</p>
      </div>
      <div className="my-4 border-t border-dashed border-border" />
      <div className="space-y-1 text-xs">
        <ReceiptRow label="Order" value={receipt.orderNumber} />
        {receipt.date && <ReceiptRow label="Date" value={receipt.date} />}
        <ReceiptRow label="Customer" value={receipt.customerName} />
        <ReceiptRow label="Payment" value={receipt.paymentLabel} />
      </div>
      <div className="my-4 border-t border-dashed border-border" />
      <div className="max-h-40 space-y-2 overflow-auto">
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
