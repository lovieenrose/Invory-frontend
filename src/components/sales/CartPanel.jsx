import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Download, FileImage, Loader2, Pencil, Plus, ShoppingCart, Tag, Trash2, Upload, X } from 'lucide-react';
import { salesService } from '../../api/services';
import { formatCurrency } from '../../utils/format';
import { EmptyState } from '../common/Primitives';
import {
  PAYMENT_OPTIONS,
  INVOICE_BANNER_URL,
  buildOrderDocumentFromCart,
  createInvoiceNumber,
  downloadDataUrl,
  paymentLabel,
  readFileAsDataUrl,
  renderInvoicePng,
  saveOrderArtifact,
} from '../../utils/salesDocuments';

const PROMOTIONS_KEY = 'invory:promotions:v1';
const INVOICE_BANNER_STORAGE_KEY = 'invory:invoice-banner:v1';
const REWARD_TYPES = [
  { value: 'free_item', label: 'Free item' },
  { value: 'percentage_discount', label: 'Percentage discount' },
  { value: 'fixed_amount_discount', label: 'Fixed amount discount' },
];
const DEFAULT_PROMOTIONS = [
  {
    id: 'promo-firstday',
    code: 'FIRSTDAY',
    triggerProductIds: [],
    rewardType: 'free_item',
    rewardProductIds: [],
    rewardValue: '',
    enabled: true,
  },
];

function getEmptyPromotion() {
  return {
    id: '',
    code: '',
    triggerProductIds: [],
    rewardType: 'free_item',
    rewardProductIds: [],
    rewardValue: '',
    enabled: true,
  };
}

function toIdList(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function sanitizePromotion(promo) {
  const code = String(promo.code || '').trim().toUpperCase();
  if (!code) return null;
  const rewardType = REWARD_TYPES.some((type) => type.value === promo.rewardType) ? promo.rewardType : 'free_item';
  return {
    id: promo.id || `promo-${code.toLowerCase()}`,
    code,
    triggerProductIds: toIdList(promo.triggerProductIds),
    rewardType,
    rewardProductIds: toIdList(promo.rewardProductIds || promo.rewardItemIds),
    rewardValue: promo.rewardValue || '',
    enabled: promo.enabled !== false,
    createdAt: promo.createdAt,
    updatedAt: promo.updatedAt,
  };
}

function loadPromotions() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROMOTIONS_KEY) || 'null');
    const cleaned = Array.isArray(stored) ? stored.map(sanitizePromotion).filter(Boolean) : [];
    const hasFirstDay = cleaned.some((promo) => promo.code === 'FIRSTDAY');
    return cleaned.length ? (hasFirstDay ? cleaned : [...DEFAULT_PROMOTIONS, ...cleaned]) : DEFAULT_PROMOTIONS;
  } catch {
    return DEFAULT_PROMOTIONS;
  }
}

function savePromotions(promotions) {
  localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(promotions));
}

function getPromotionStatus(promo) {
  return promo.enabled ? 'Active' : 'Inactive';
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function productNameIncludes(product, terms) {
  const name = compactText(product?.name);
  return terms.every((term) => name.includes(compactText(term)));
}

function buildFirstDayPromo(products) {
  const triggerProductIds = products
    .filter((product) => (
      productNameIncludes(product, ['Tirzepatide', '30mg'])
      || productNameIncludes(product, ['Retatrutide', '20mg'])
    ))
    .map((product) => String(product.id));
  const rewardProductIds = products
    .filter((product) => productNameIncludes(product, ['Bac Water']) && (
      productNameIncludes(product, ['3ml']) || productNameIncludes(product, ['5ml'])
    ))
    .map((product) => String(product.id));

  return {
    ...DEFAULT_PROMOTIONS[0],
    triggerProductIds,
    rewardProductIds,
  };
}

function hasConfiguredProducts(ids) {
  return Array.isArray(ids) && ids.length > 0;
}

function loadInvoiceBanner() {
  try {
    return localStorage.getItem(INVOICE_BANNER_STORAGE_KEY) || INVOICE_BANNER_URL;
  } catch {
    return INVOICE_BANNER_URL;
  }
}

function validatePromotion(promo, cart, subtotal, shipping) {
  if (!promo) return { ok: false, message: 'Promo code not found.' };
  if (!promo.enabled) return { ok: false, message: 'Promo code is inactive.' };

  const triggerIds = toIdList(promo.triggerProductIds);
  const rewardIds = toIdList(promo.rewardProductIds);
  const hasTriggerProduct = hasConfiguredProducts(triggerIds) && cart.some((item) => triggerIds.includes(String(item.id)));
  if (!hasTriggerProduct) return { ok: false, message: 'Promo requirements not met.' };

  if (promo.rewardType === 'free_item') {
    const freeItem = hasConfiguredProducts(rewardIds) ? cart.find((item) => rewardIds.includes(String(item.id))) : null;
    if (!freeItem) return { ok: false, message: 'Promo requirements not met.' };
    return { ok: true, message: `${freeItem.name} applied as FREE ITEM.`, freeItemId: freeItem.id, discount: 0, shippingFee: shipping };
  }

  if (promo.rewardType === 'percentage_discount') {
    const percent = Math.max(0, Math.min(100, Number(promo.rewardValue) || 0));
    if (!percent) return { ok: false, message: 'Promo reward is not configured.' };
    return { ok: true, message: `${percent}% promo discount applied.`, discount: subtotal * (percent / 100), shippingFee: shipping };
  }

  if (promo.rewardType === 'fixed_amount_discount') {
    const amount = Math.max(0, Number(promo.rewardValue) || 0);
    if (!amount) return { ok: false, message: 'Promo reward is not configured.' };
    return { ok: true, message: `${formatCurrency(amount)} promo discount applied.`, discount: Math.min(amount, subtotal), shippingFee: shipping };
  }

  return { ok: false, message: 'Promo reward is not supported.' };
}

export default function CartPanel({ cart, products = [], onUpdateQty, onUpdatePrice, onRemove, onClear, onCheckoutSuccess }) {
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoMessageTone, setPromoMessageTone] = useState('muted');
  const [promoFreeItemIds, setPromoFreeItemIds] = useState([]);
  const [shippingFee, setShippingFee] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [promotions, setPromotions] = useState(() => loadPromotions());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const originalPromoPricesRef = useRef({});

  const items = cart.map((c) => ({ product_id: c.id, quantity: c.qty, unit_price: c.unitPrice }));
  const activePromotionsCount = promotions.filter((promo) => getPromotionStatus(promo) === 'Active').length;
  const discountTypeLabel = promoCode.trim() ? `Promo / Discount Code (${promoCode.trim().toUpperCase()})` : 'Promo / Discount Code';
  const subtotal = Number(preview?.subtotal) || cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const shipping = Number(shippingFee) || 0;
  const discountValue = Number(discount) || 0;
  const total = Number(preview?.total) || subtotal + shipping - discountValue;

  const restorePromoPrices = () => {
    Object.entries(originalPromoPricesRef.current).forEach(([id, price]) => {
      const item = cart.find((cartItem) => String(cartItem.id) === String(id));
      if (item && Number(item.unitPrice) !== Number(price)) {
        onUpdatePrice(item.id, Number(price));
      }
    });
    originalPromoPricesRef.current = {};
    setPromoFreeItemIds([]);
  };

  useEffect(() => {
    if (!products.length) return;
    setPromotions((current) => {
      const firstDay = buildFirstDayPromo(products);
      const hasFirstDay = current.some((promo) => promo.code === 'FIRSTDAY');
      const next = hasFirstDay
        ? current.map((promo) => {
          if (promo.code !== 'FIRSTDAY') return promo;
          const needsHydration = !hasConfiguredProducts(promo.triggerProductIds) || !hasConfiguredProducts(promo.rewardProductIds);
          return needsHydration ? { ...promo, ...firstDay, enabled: promo.enabled !== false } : promo;
        })
        : [firstDay, ...current];
      if (JSON.stringify(next) !== JSON.stringify(current)) savePromotions(next);
      return next;
    });
  }, [products]);

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

  useEffect(() => {
    const code = promoCode.trim().toUpperCase();
    const timeout = setTimeout(() => {
      if (!cart.length) {
        restorePromoPrices();
        setDiscount('0');
        setPromoMessage('');
        setPromoMessageTone('muted');
        return;
      }
      if (!code) {
        restorePromoPrices();
        setDiscount('0');
        setPromoMessage('');
        setPromoMessageTone('muted');
        return;
      }

      const promo = promotions.find((item) => item.code?.trim().toUpperCase() === code);
      const result = validatePromotion(promo, cart, cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), Number(shippingFee) || 0);

      if (!result.ok) {
        restorePromoPrices();
        setDiscount('0');
        setPromoMessage(result.message);
        setPromoMessageTone('error');
        return;
      }

      if (result.freeItemId) {
        const freeItem = cart.find((item) => item.id === result.freeItemId);
        if (freeItem) {
          if (!Object.prototype.hasOwnProperty.call(originalPromoPricesRef.current, freeItem.id)) {
            originalPromoPricesRef.current[freeItem.id] = freeItem.unitPrice;
          }
          if (Number(freeItem.unitPrice) !== 0) {
            onUpdatePrice(freeItem.id, 0);
          }
          setPromoFreeItemIds([freeItem.id]);
        }
        setDiscount('0');
      } else {
        restorePromoPrices();
        setDiscount(String(result.discount || 0));
      }
      setPromoMessage(result.message);
      setPromoMessageTone('success');
    }, 150);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoCode, promotions, JSON.stringify(cart.map((item) => [item.id, item.name, item.qty, item.unitPrice])), shippingFee]);

  const invoiceData = useMemo(() => buildOrderDocumentFromCart({
    invoiceNumber: invoiceNumber || 'INV-DRAFT',
    customerName,
    paymentMethod,
    cart,
    subtotal,
    shipping,
    discount: discountValue,
    discountTypeLabel,
    promoCode: promoCode.trim().toUpperCase(),
    freeItemIds: promoFreeItemIds,
    originalPrices: originalPromoPricesRef.current,
    total,
  }), [cart, customerName, discountTypeLabel, discountValue, invoiceNumber, paymentMethod, promoCode, promoFreeItemIds, shipping, subtotal, total]);

  const openOrderForm = () => {
    if (!cart.length) return;
    setInvoiceNumber((value) => value || createInvoiceNumber());
    setOrderFormOpen(true);
  };

  const handleCheckout = async ({ invoicePng, paymentReceipt }) => {
    if (!cart.length) return;
    setCheckingOut(true);
    try {
      const paymentDate = new Date().toISOString();
      const res = await salesService.checkout({
        items,
        discount: Number(discount) || 0,
        shipping_fee: Number(shippingFee) || 0,
        customer_name: customerName || null,
        payment_method: paymentMethod,
        notes: `[DISCOUNT_TYPE:promo] [PROMO_CODE:${promoCode.trim().toUpperCase() || 'NONE'}] [INVOICE:${invoiceData.invoiceNumber}] [PAYMENT_DATE:${paymentDate}]`,
      });
      if (res.data?.id) {
        saveOrderArtifact(res.data.id, {
          invoicePng,
          paymentReceipt,
          paymentMethod,
          paymentLabel: paymentLabel(paymentMethod),
          paymentDate,
          invoiceNumber: invoiceData.invoiceNumber,
          order: invoiceData,
        });
      }
      toast.success(`Sale completed — ${res.data.order_number}`);
      onCheckoutSuccess();
      setDiscount('0');
      setPromoCode('');
      setPromoMessage('');
      setPromoMessageTone('muted');
      setPromoFreeItemIds([]);
      originalPromoPricesRef.current = {};
      setShippingFee('0');
      setCustomerName('');
      setPaymentMethod('bank_transfer');
      setInvoiceNumber('');
      setOrderFormOpen(false);
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
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                    {promoFreeItemIds.includes(item.id) && (
                      <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-700">
                        FREE ITEM
                      </span>
                    )}
                  </div>
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
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Promo / Discount Code</span>
                <input
                  className="input-field uppercase"
                  placeholder="FIRSTDAY"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                />
              </label>
            </div>
            {!!promoMessage && (
              <p className={`text-xs font-semibold ${promoMessageTone === 'success' ? 'text-brand-600' : 'text-rust-600'}`}>
                {promoMessage}
              </p>
            )}
            <button
              type="button"
              className="btn-secondary w-full justify-center"
              onClick={() => setPromotionModalOpen(true)}
            >
              <Plus size={16} /> Add Promo / Discount
            </button>
            {!!promotions.length && (
              <p className="text-xs text-ink-soft">
                {promotions.length} promo{promotions.length === 1 ? '' : 's'} saved • {activePromotionsCount} active
              </p>
            )}
          </div>

          {preview && (
            <div className="border-t border-border pt-3 flex flex-col gap-1.5 text-sm">
              <Row label="Subtotal" value={formatCurrency(preview.subtotal)} />
              <Row label="Shipping Fee" value={formatCurrency(preview.shipping_fee || 0)} />
              <Row label="Promo / Discount Code" value={promoCode.trim() ? promoCode.trim().toUpperCase() : 'None'} muted />
              <Row label="Discount" value={`-${formatCurrency(preview.discount)}`} />
              <Row label="Total Revenue" value={formatCurrency(preview.total)} bold />
              <Row label="Total Cost (COGS)" value={formatCurrency(preview.total_cost)} muted />
              <Row label="Gross Profit" value={formatCurrency(preview.gross_profit)} tone="brand" bold />
              <Row label="Margin" value={`${preview.margin_pct}%`} tone="gold" />
            </div>
          )}

          <button onClick={openOrderForm} disabled={checkingOut || previewLoading || !preview} className="btn-primary w-full">
            Make Order Form
          </button>

        </>
      )}
      {orderFormOpen && (
        <OrderFormModal
          invoice={invoiceData}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          checkingOut={checkingOut}
          onClose={() => setOrderFormOpen(false)}
          onComplete={handleCheckout}
        />
      )}
      {promotionModalOpen && (
        <PromotionManagerModal
          promotions={promotions}
          setPromotions={setPromotions}
          products={products}
          onClose={() => setPromotionModalOpen(false)}
        />
      )}
    </div>
  );
}

function ReceiptRow({ label, value, tone }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-soft">{label}</span>
      <span className={`text-right font-semibold ${tone === 'brand' ? 'text-brand-600' : ''}`}>{value}</span>
    </div>
  );
}

function PromotionManagerModal({ promotions, setPromotions, products = [], onClose }) {
  const [form, setForm] = useState(getEmptyPromotion());
  const [editingId, setEditingId] = useState(null);

  const persistPromotions = (next) => {
    setPromotions(next);
    savePromotions(next);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(getEmptyPromotion());
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleProduct = (field, productId) => {
    const id = String(productId);
    setForm((prev) => {
      const current = toIdList(prev[field]);
      return {
        ...prev,
        [field]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      };
    });
  };

  const handleSave = () => {
    const code = form.code.trim().toUpperCase();
    if (!code) {
      toast.error('Enter a promo code.');
      return;
    }
    if (!form.triggerProductIds.length) {
      toast.error('Select at least one trigger product.');
      return;
    }
    if (form.rewardType === 'free_item' && !form.rewardProductIds.length) {
      toast.error('Select at least one reward item.');
      return;
    }
    const cleaned = {
      ...form,
      id: editingId || `promo-${Date.now()}`,
      code,
      triggerProductIds: toIdList(form.triggerProductIds),
      rewardProductIds: form.rewardType === 'free_item' ? toIdList(form.rewardProductIds) : [],
      updatedAt: new Date().toISOString(),
      createdAt: form.createdAt || new Date().toISOString(),
    };
    const next = editingId
      ? promotions.map((promo) => (promo.id === editingId ? cleaned : promo))
      : [cleaned, ...promotions];
    persistPromotions(next);
    toast.success(editingId ? 'Promotion updated.' : 'Promotion created.');
    resetForm();
  };

  const editPromo = (promo) => {
    setEditingId(promo.id);
    setForm({ ...getEmptyPromotion(), ...promo });
  };

  const deletePromo = (promo) => {
    if (!window.confirm(`Delete ${promo.code}?`)) return;
    persistPromotions(promotions.filter((item) => item.id !== promo.id));
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink/50 px-4 py-6">
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">Promo / Discount Manager</h3>
              <p className="text-sm text-ink-soft">Lightweight vouchers based on selected inventory products.</p>
            </div>
            <button type="button" className="p-1.5 text-ink-faint hover:text-ink" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[390px_1fr]">
            <div className="space-y-4 rounded-2xl border border-border bg-paper/70 p-4">
              <InputMini label="Promo Code" value={form.code} onChange={(value) => updateForm('code', value.toUpperCase())} placeholder="FIRSTDAY" />
              <ProductMultiSelect
                label="Trigger Product(s)"
                products={products}
                selectedIds={form.triggerProductIds}
                onToggle={(productId) => toggleProduct('triggerProductIds', productId)}
              />
              <SelectMini label="Reward" value={form.rewardType} onChange={(value) => updateForm('rewardType', value)} options={REWARD_TYPES} />
              {form.rewardType === 'free_item' ? (
                <ProductMultiSelect
                  label="Reward Item(s)"
                  products={products}
                  selectedIds={form.rewardProductIds}
                  onToggle={(productId) => toggleProduct('rewardProductIds', productId)}
                />
              ) : (
                <InputMini
                  label="Reward value"
                  type="number"
                  value={form.rewardValue}
                  onChange={(value) => updateForm('rewardValue', value)}
                  placeholder={form.rewardType === 'percentage_discount' ? '10' : '100'}
                />
              )}
              <CheckboxMini label="Active" checked={form.enabled} onChange={(checked) => updateForm('enabled', checked)} />

              <div className="flex gap-2 border-t border-border pt-4">
                <button type="button" className="btn-primary flex-1" onClick={handleSave}>
                  {editingId ? 'Save Changes' : 'Add Promo'}
                </button>
                {editingId && (
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold text-ink">Promo Vouchers</h4>
                <span className="text-xs text-ink-soft">{promotions.length} total</span>
              </div>
              <div className="space-y-2">
                {promotions.length ? promotions.map((promo) => (
                  <PromotionListItem
                    key={promo.id}
                    promo={promo}
                    products={products}
                    onEdit={() => editPromo(promo)}
                    onDelete={() => deletePromo(promo)}
                  />
                )) : (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <Tag className="mx-auto text-ink-faint" size={28} />
                    <p className="mt-2 font-semibold text-ink">No promotions yet</p>
                    <p className="mt-1 text-sm text-ink-soft">Add a simple voucher to start validating promo codes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PromotionListItem({ promo, products, onEdit, onDelete }) {
  const status = getPromotionStatus(promo);
  const statusTone = {
    Active: 'bg-brand-50 text-brand-700',
    Inactive: 'bg-paper text-ink-soft',
  }[status];
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{promo.code}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${statusTone}`}>{status}</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Trigger Products: {productListSummary(products, promo.triggerProductIds)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Reward: {rewardSummary(promo, products)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className="rounded-md p-1.5 text-ink-faint hover:bg-paper hover:text-ink" onClick={onEdit} title="Edit">
            <Pencil size={15} />
          </button>
          <button type="button" className="rounded-md p-1.5 text-rust-500 hover:bg-rust-50" onClick={onDelete} title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function productListSummary(products, ids) {
  const selectedIds = toIdList(ids);
  if (!selectedIds.length) return 'None selected';
  const names = selectedIds.map((id) => products.find((product) => String(product.id) === id)?.name || 'Unknown item');
  if (names.length <= 2) return names.join(' or ');
  return `${names.slice(0, 2).join(' or ')} +${names.length - 2} more`;
}

function rewardSummary(promo, products) {
  const label = REWARD_TYPES.find((type) => type.value === promo.rewardType)?.label || 'Reward';
  if (promo.rewardType === 'free_item') return `${label}: ${productListSummary(products, promo.rewardProductIds)}`;
  if (promo.rewardType === 'percentage_discount') return `${label}: ${promo.rewardValue || 0}%`;
  return `${label}: ${formatCurrency(Number(promo.rewardValue) || 0)}`;
}

function InputMini({ label, value, onChange, placeholder, type = 'text', textarea = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      {textarea ? (
        <textarea className="input-field min-h-20 resize-none" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="input-field" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ProductMultiSelect({ label, products, selectedIds, onToggle }) {
  const selected = toIdList(selectedIds);
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-ink-soft">{label}</p>
      <div className="max-h-48 overflow-auto rounded-xl border border-border bg-surface p-2">
        {products.length ? products.map((product) => {
          const id = String(product.id);
          return (
            <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-soft hover:bg-paper">
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={() => onToggle(id)}
              />
              <span className="min-w-0 flex-1 truncate">{product.name}</span>
              <span className="shrink-0 text-xs text-ink-faint">{formatCurrency(Number(product.selling_price) || 0)}</span>
            </label>
          );
        }) : (
          <p className="px-2 py-4 text-center text-xs text-ink-faint">No inventory products loaded.</p>
        )}
      </div>
      {!!selected.length && (
        <p className="mt-1 text-xs text-ink-faint">{selected.length} selected</p>
      )}
    </div>
  );
}

function SelectMini({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      <select className="input-field" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function CheckboxMini({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function OrderFormModal({ invoice, paymentMethod, setPaymentMethod, checkingOut, onClose, onComplete }) {
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [invoiceBanner, setInvoiceBanner] = useState(() => loadInvoiceBanner());

  const handleReceiptFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image receipt.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPaymentReceipt({ name: file.name, dataUrl, uploadedAt: new Date().toISOString() });
      toast.success('Payment receipt uploaded.');
    } catch (error) {
      toast.error('Could not upload payment receipt.');
    }
  };

  const handleBannerFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image banner.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setInvoiceBanner(dataUrl);
      localStorage.setItem(INVOICE_BANNER_STORAGE_KEY, dataUrl);
      toast.success('Invoice banner updated.');
    } catch (error) {
      toast.error('Could not update invoice banner.');
    }
  };

  const downloadInvoice = async () => {
    const png = await renderInvoicePng(invoice, invoiceBanner);
    downloadDataUrl(png, `${invoice.invoiceNumber}.png`);
  };

  const handlePrimary = async () => {
    if (!paymentReceipt) {
      fileInputRef.current?.click();
      return;
    }
    const invoicePng = await renderInvoicePng(invoice, invoiceBanner);
    await onComplete({ invoicePng, paymentReceipt });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink/50 px-4 py-6">
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="w-full rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">Order Form / Invoice</h3>
              <p className="text-sm text-ink-soft">Status: <span className={paymentReceipt ? 'font-semibold text-brand-600' : 'font-semibold text-gold-500'}>{paymentReceipt ? 'Payment Received' : 'Awaiting Payment'}</span></p>
            </div>
            <button type="button" className="p-1.5 text-ink-faint hover:text-ink" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
            <div className="overflow-auto rounded-2xl bg-paper p-4">
              <InvoicePreview invoice={invoice} bannerUrl={invoiceBanner} />
            </div>

            <aside className="space-y-4">
              <button type="button" className="btn-secondary w-full" onClick={downloadInvoice}>
                <Download size={16} /> Download Invoice (PNG)
              </button>

              <div className="rounded-2xl border border-border bg-paper/70 p-3">
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleBannerFile(event.target.files?.[0])}
                />
                <p className="mb-2 text-xs font-semibold text-ink-soft">Invoice Banner</p>
                <div className="overflow-hidden rounded-xl border border-pink-100 bg-white">
                  <img src={invoiceBanner} alt="Invoice banner preview" className="h-16 w-full object-contain" />
                </div>
                <button type="button" className="btn-secondary mt-3 w-full" onClick={() => bannerInputRef.current?.click()}>
                  <FileImage size={16} /> Replace Banner
                </button>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Mode of Payment</span>
                <select className="input-field" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div
                className="rounded-2xl border border-dashed border-border bg-paper/70 p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleReceiptFile(event.dataTransfer.files?.[0]);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleReceiptFile(event.target.files?.[0])}
                />
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Upload size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Upload Payment Receipt</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">Drag and drop an image here, or select a file.</p>
                  </div>
                </div>
                <button type="button" className="btn-secondary mt-3 w-full" onClick={() => fileInputRef.current?.click()}>
                  <FileImage size={16} /> Select Receipt Image
                </button>
                {paymentReceipt && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
                    <img src={paymentReceipt.dataUrl} alt="Payment receipt preview" className="max-h-52 w-full object-contain bg-white" />
                    <p className="truncate px-3 py-2 text-xs font-medium text-ink-soft">{paymentReceipt.name}</p>
                  </div>
                )}
              </div>

              <button type="button" className="btn-primary w-full" disabled={checkingOut} onClick={handlePrimary}>
                {checkingOut && <Loader2 size={16} className="animate-spin" />}
                {paymentReceipt ? 'Complete Sale' : 'Upload Payment Receipt'}
              </button>
            </aside>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InvoicePreview({ invoice, bannerUrl }) {
  return (
    <div className="mx-auto aspect-square min-w-[680px] max-w-3xl rounded-3xl border border-pink-200 bg-white p-8 text-ink shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div className="h-44 w-[560px] overflow-hidden bg-white">
          <img src={bannerUrl || INVOICE_BANNER_URL} alt="Invoice banner" className="h-full w-full object-contain" />
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tracking-tight">INVOICE</p>
          <p className="mt-1 text-sm font-semibold text-ink-soft">{invoice.invoiceNumber}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl bg-[#FFF7FB] p-4 text-sm sm:grid-cols-2">
        <InvoiceMeta label="Invoice Date" value={new Date(invoice.invoiceDate || Date.now()).toLocaleString()} />
        <InvoiceMeta label="Customer" value={invoice.customerName} />
        <InvoiceMeta label="Payment Method" value={invoice.paymentLabel} />
        <InvoiceMeta label="Payment Terms" value={invoice.paymentTerms} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-pink-100">
        <div className="grid grid-cols-[1fr_70px_110px_110px] gap-3 bg-[#FF4F9A] px-4 py-3 text-sm font-black text-white">
          <span>Item</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Unit</span>
          <span className="text-right">Amount</span>
        </div>
        {invoice.items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_70px_110px_110px] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0">
            <span className="font-semibold">
              <span className="inline-flex flex-wrap items-baseline gap-1.5 leading-snug">
                <span>{item.name}</span>
                {item.isFreeItem && (
                  <>
                    <span className="inline-flex items-center rounded-full bg-[#FF4F9A] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white" style={{ verticalAlign: 'middle', position: 'relative', top: '-1px' }}>
                      FREE ITEM
                    </span>
                    {item.regularPrice > 0 && (
                      <span className="text-[10px] font-medium text-gray-400">
                        (Regular Price {formatCurrency(item.regularPrice)})
                      </span>
                    )}
                  </>
                )}
              </span>
            </span>
            <span className="text-center">{item.quantity}</span>
            <span className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</span>
            <span className="text-right font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 ml-auto w-full max-w-sm space-y-2 text-sm">
        <ReceiptRow label="Subtotal (Products)" value={formatCurrency(invoice.originalSubtotal ?? invoice.subtotal)} />
        {invoice.promoCode && (
          <ReceiptRow
            label="Promo Applied"
            value={<span className="font-black text-brand-600">{invoice.promoCode}</span>}
          />
        )}
        {(invoice.promoSavings || 0) > 0 && (
          <ReceiptRow label="You Saved" value={`-${formatCurrency(invoice.promoSavings)}`} tone="brand" />
        )}
        <ReceiptRow
          label="Shipping Fee"
          value={(invoice.shipping || 0) === 0 ? 'FREE' : formatCurrency(invoice.shipping)}
          tone={(invoice.shipping || 0) === 0 ? 'brand' : undefined}
        />
        <div className="mt-3 border-t border-pink-100 pt-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-sm font-black uppercase tracking-wide text-ink">Total Amount Due</span>
            <span className="text-2xl font-black tabular-nums text-[#FF4F9A]">{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      <p className="mt-6 rounded-2xl bg-[#FFF7FB] px-4 py-3 text-center text-sm font-semibold text-ink-soft">
        Thank you for choosing lovieNglow. Please send your payment receipt to complete confirmation.
      </p>
    </div>
  );
}

function InvoiceMeta({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{value}</p>
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
