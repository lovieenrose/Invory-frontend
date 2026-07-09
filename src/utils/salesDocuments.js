import { formatCurrency, formatDateTime } from './format';
import invoiceLogoUrl from '../assets/lovieNglow_logo.png';
import invoiceBannerUrl from '../assets/invoice_banner.png';

export const PAYMENT_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'cash', label: 'Cash' },
  { value: 'cod', label: 'COD' },
  { value: 'others', label: 'Others' },
];

export const PAYMENT_LABELS = PAYMENT_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {
  maribank: 'Maribank',
  gotyme: 'GoTyme',
  bpi: 'BPI',
});

export const ORDER_ARTIFACTS_KEY = 'invory:sales-order-artifacts:v1';
const INVOICE_COUNTER_KEY = 'invory:invoice-counters:v1';
export const INVOICE_LOGO_URL = invoiceLogoUrl;
export const INVOICE_BANNER_URL = invoiceBannerUrl;

export function paymentLabel(value) {
  return PAYMENT_LABELS[value] || value || 'N/A';
}

export function createInvoiceNumber() {
  const date = new Date();
  const stamp = getDateStamp(date);
  let counters = {};
  try {
    counters = JSON.parse(localStorage.getItem(INVOICE_COUNTER_KEY) || '{}');
  } catch {
    counters = {};
  }
  const next = Number(counters[stamp] || 0) + 1;
  counters[stamp] = next;
  localStorage.setItem(INVOICE_COUNTER_KEY, JSON.stringify(counters));
  return `INV-${stamp}-${String(next).padStart(6, '0')}`;
}

function getDateStamp(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function parseSaleNotes(notes = '') {
  const text = String(notes || '');
  return {
    shippingFee: Number(text.match(/\[SHIPPING_FEE:([0-9.]+)\]/)?.[1]) || 0,
    discountType: text.match(/\[DISCOUNT_TYPE:([a-z_]+)\]/)?.[1] || '',
    promoCode: text.match(/\[PROMO_CODE:([^\]]+)\]/)?.[1] || '',
    invoiceNumber: text.match(/\[INVOICE:([^\]]+)\]/)?.[1] || '',
    paymentDate: text.match(/\[PAYMENT_DATE:([^\]]+)\]/)?.[1] || '',
  };
}

export function getDiscountTypeLabel(value) {
  return {
    complete_set: 'Complete Set discount',
    duo_set: 'Duo set Discount',
    promo: 'Promo discount',
  }[value] || 'Discount';
}

export function buildOrderDocumentFromCart({
  invoiceNumber,
  invoiceDate = new Date(),
  customerName,
  paymentMethod,
  cart,
  subtotal,
  shipping,
  discount,
  discountTypeLabel,
  promoCode,
  freeItemIds = [],
  originalPrices = {},
  total,
}) {
  const freeIds = new Set((freeItemIds || []).map(String));
  const originalSubtotal = cart.reduce((sum, item) => {
    const originalUnitPrice = Object.prototype.hasOwnProperty.call(originalPrices, item.id)
      ? Number(originalPrices[item.id]) || 0
      : Number(item.unitPrice) || 0;
    return sum + originalUnitPrice * (Number(item.qty) || 0);
  }, 0);
  const promoSavings = Math.max(0, originalSubtotal + (Number(shipping) || 0) - (Number(total) || 0));
  return {
    invoiceNumber,
    invoiceDate,
    customerName: customerName || 'Walk-in',
    paymentMethod,
    paymentLabel: paymentLabel(paymentMethod),
    paymentTerms: paymentMethod === 'cod' ? 'Cash on delivery' : 'Payment first before fulfillment',
    items: cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: Number(item.qty) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      amount: (Number(item.unitPrice) || 0) * (Number(item.qty) || 0),
      isFreeItem: freeIds.has(String(item.id)),
    })),
    subtotal: Number(subtotal) || 0,
    originalSubtotal,
    shipping: Number(shipping) || 0,
    discount: Number(discount) || 0,
    discountTypeLabel,
    promoCode: promoCode || '',
    promoSavings,
    total: Number(total) || 0,
  };
}

export function buildOrderDocumentFromOrder(order) {
  const meta = parseSaleNotes(order.notes);
  const shipping = meta.shippingFee;
  const subtotal = Number(order.subtotal) || Math.max(0, Number(order.total || 0) + Number(order.discount || 0) - shipping);
  const freeItemSavings = (order.items || []).reduce((sum, item) => (
    meta.promoCode && Number(item.unit_price) === 0 ? sum + Number(item.line_revenue || 0) : sum
  ), 0);
  const promoSavings = Math.max(0, Number(order.discount) || 0, freeItemSavings);
  return {
    invoiceNumber: meta.invoiceNumber || order.order_number,
    invoiceDate: order.created_at,
    customerName: order.customer_name || 'Walk-in',
    paymentMethod: order.payment_method,
    paymentLabel: paymentLabel(order.payment_method),
    paymentTerms: order.payment_method === 'cod' ? 'Cash on delivery' : 'Payment first before fulfillment',
    paymentDate: meta.paymentDate,
    items: (order.items || []).map((item) => ({
      id: item.id,
      name: item.product_name,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      amount: Number(item.line_revenue) || 0,
      isFreeItem: !!meta.promoCode && Number(item.unit_price) === 0,
    })),
    subtotal,
    originalSubtotal: subtotal + promoSavings,
    shipping,
    discount: Number(order.discount) || 0,
    discountTypeLabel: getDiscountTypeLabel(meta.discountType),
    promoCode: meta.promoCode && meta.promoCode !== 'NONE' ? meta.promoCode : '',
    promoSavings,
    total: Number(order.total) || 0,
  };
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export async function renderInvoicePng(invoice, bannerUrl = invoiceBannerUrl) {
  const width = 1800;
  const height = 1800;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const logoImage = await loadImage(bannerUrl || invoiceBannerUrl);
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#FFF7FB';
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(260, 180, 10, 260, 180, 760);
  glow.addColorStop(0, 'rgba(255, 214, 232, 0.85)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 80, 80, width - 160, height - 160, 44);
  ctx.fill();
  ctx.strokeStyle = '#FFB5D5';
  ctx.lineWidth = 4;
  ctx.stroke();

  if (logoImage) {
    const logoX = 120;
    const logoY = 120;
    const logoW = 850;
    const logoH = 240;
    const ratio = logoImage.width / logoImage.height;
    let drawW = logoW;
    let drawH = drawW / ratio;
    if (drawH > logoH) {
      drawH = logoH;
      drawW = drawH * ratio;
    }
    ctx.drawImage(logoImage, logoX + (logoW - drawW) / 2, logoY + (logoH - drawH) / 2, drawW, drawH);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#3A3A3A';
  ctx.font = '900 58px Inter, Arial, sans-serif';
  ctx.fillText('INVOICE', width - 120, 155);
  ctx.fillStyle = '#FF4F9A';
  ctx.font = '800 28px Inter, Arial, sans-serif';
  ctx.fillText(invoice.invoiceNumber, width - 120, 200);

  const metaY = 430;
  drawMeta(ctx, 'Invoice Date', formatDate(invoice.invoiceDate), 120, metaY, 330);
  drawMeta(ctx, 'Customer', invoice.customerName, 470, metaY, 360);
  drawMeta(ctx, 'Payment Method', invoice.paymentLabel, 860, metaY, 300);
  drawMeta(ctx, 'Payment Terms', invoice.paymentTerms, 1190, metaY, 440);

  const tableX = 120;
  const tableY = 620;
  const tableW = width - 240;
  ctx.fillStyle = '#FF4F9A';
  roundRect(ctx, tableX, tableY, tableW, 68, 20);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 23px Inter, Arial, sans-serif';
  ctx.fillText('Item', tableX + 28, tableY + 44);
  ctx.textAlign = 'center';
  ctx.fillText('Qty', tableX + 940, tableY + 44);
  ctx.fillText('Unit Price', tableX + 1160, tableY + 44);
  ctx.textAlign = 'right';
  ctx.fillText('Amount', tableX + tableW - 28, tableY + 44);

  let y = tableY + 108;
  ctx.textAlign = 'left';
  invoice.items.slice(0, 9).forEach((item) => {
    ctx.fillStyle = '#FFEAF3';
    ctx.fillRect(tableX + 28, y + 46, tableW - 56, 2);
    ctx.fillStyle = '#3A3A3A';
    ctx.font = '800 24px Inter, Arial, sans-serif';
    const lines = wrapCanvasText(ctx, item.name, 820).slice(0, 2);
    lines.forEach((line, index) => ctx.fillText(line, tableX + 28, y + index * 30));
    if (item.isFreeItem) {
      ctx.fillStyle = '#FF4F9A';
      roundRect(ctx, tableX + 28, y + lines.length * 30 + 4, 138, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 15px Inter, Arial, sans-serif';
      ctx.fillText('FREE ITEM', tableX + 48, y + lines.length * 30 + 25);
    }
    ctx.font = '800 24px Inter, Arial, sans-serif';
    ctx.fillStyle = '#3A3A3A';
    ctx.textAlign = 'center';
    ctx.fillText(String(item.quantity), tableX + 940, y);
    ctx.fillText(formatCurrency(item.unitPrice), tableX + 1160, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(item.amount), tableX + tableW - 28, y);
    ctx.textAlign = 'left';
    y += Math.max(76, lines.length * 30 + 25);
  });
  if (invoice.items.length > 9) {
    ctx.fillStyle = '#8A204C';
    ctx.font = '800 22px Inter, Arial, sans-serif';
    ctx.fillText(`+ ${invoice.items.length - 9} more item(s)`, tableX + 28, y + 8);
  }

  const totalsX = width - 760;
  const totalsY = 1280;
  const totalsW = 640;
  drawTotal(ctx, 'Subtotal (Products)', invoice.originalSubtotal ?? invoice.subtotal, totalsX, totalsY);
  if (invoice.promoCode) {
    drawTextTotal(ctx, 'Promo Applied', `${invoice.promoCode}`, totalsX, totalsY + 58, '#217A54');
  }
  if ((invoice.promoSavings || 0) > 0) {
    drawTotal(ctx, 'You Saved', -invoice.promoSavings, totalsX, totalsY + (invoice.promoCode ? 116 : 58), '#217A54');
  }
  const shippingY = totalsY + (invoice.promoCode ? 174 : 116);
  drawTextTotal(ctx, 'Shipping Fee', (invoice.shipping || 0) === 0 ? 'FREE' : formatCurrency(invoice.shipping), totalsX, shippingY, (invoice.shipping || 0) === 0 ? '#217A54' : '#4B5563');
  ctx.fillStyle = '#FFB5D5';
  ctx.fillRect(totalsX, shippingY + 44, totalsW, 3);
  ctx.font = '900 31px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3A3A3A';
  ctx.fillText('TOTAL AMOUNT DUE', totalsX, shippingY + 92);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FF4F9A';
  ctx.font = '900 50px Inter, Arial, sans-serif';
  ctx.fillText(formatCurrency(invoice.total), totalsX + totalsW, shippingY + 150);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#8A204C';
  ctx.font = '800 25px Inter, Arial, sans-serif';
  ctx.fillText('Thank you for choosing lovieNglow.', 120, height - 190);
  ctx.fillStyle = '#6B7280';
  ctx.font = '600 22px Inter, Arial, sans-serif';
  ctx.fillText('Please send your payment receipt to complete order confirmation.', 120, height - 150);

  return canvas.toDataURL('image/png');
}

function drawMeta(ctx, label, value, x, y, maxWidth = 320) {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6B7280';
  ctx.font = '800 20px Inter, Arial, sans-serif';
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.fillStyle = '#111827';
  ctx.font = '800 25px Inter, Arial, sans-serif';
  wrapCanvasText(ctx, value, maxWidth).slice(0, 2).forEach((line, index) => ctx.fillText(line, x, y + 38 + index * 30));
}

function drawTotal(ctx, label, value, x, y, color = '#4B5563') {
  ctx.fillStyle = color;
  ctx.font = '700 25px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatCurrency(value), x + 620, y);
}

function drawTextTotal(ctx, label, value, x, y, color = '#4B5563') {
  ctx.fillStyle = '#4B5563';
  ctx.font = '700 25px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.fillText(value, x + 620, y);
}

function formatDate(value) {
  if (!value) return formatDateTime(new Date());
  return formatDateTime(value);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function getOrderArtifacts() {
  try {
    return JSON.parse(localStorage.getItem(ORDER_ARTIFACTS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getOrderArtifact(orderId) {
  return getOrderArtifacts()[orderId] || null;
}

export function saveOrderArtifact(orderId, artifact) {
  const artifacts = getOrderArtifacts();
  artifacts[orderId] = {
    ...(artifacts[orderId] || {}),
    ...artifact,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(ORDER_ARTIFACTS_KEY, JSON.stringify(artifacts));
}
