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
    items: cart.map((item) => {
      const isFree = freeIds.has(String(item.id));
      const regularPrice = isFree
        ? (Object.prototype.hasOwnProperty.call(originalPrices, item.id)
            ? Number(originalPrices[item.id]) || 0
            : Number(item.unitPrice) || 0)
        : 0;
      return {
        id: item.id,
        name: item.name,
        quantity: Number(item.qty) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        amount: (Number(item.unitPrice) || 0) * (Number(item.qty) || 0),
        isFreeItem: isFree,
        regularPrice,
      };
    }),
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
    items: (order.items || []).map((item) => {
      const isFree = !!meta.promoCode && Number(item.unit_price) === 0;
      const qty = Number(item.quantity) || 1;
      const regularPrice = isFree
        ? Number((Number(item.line_revenue) / qty).toFixed(2)) || 0
        : 0;
      return {
        id: item.id,
        name: item.product_name,
        quantity: qty,
        unitPrice: Number(item.unit_price) || 0,
        amount: Number(item.line_revenue) || 0,
        isFreeItem: isFree,
        regularPrice,
      };
    }),
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
  const logoImage = await loadImage(bannerUrl || invoiceBannerUrl);

  const scratch = document.createElement('canvas');
  const sCtx = scratch.getContext('2d');
  sCtx.font = '800 24px Inter, Arial, sans-serif';

  const tableX = 120;
  const tableY = 620;
  const tableW = width - 240;
  const rowLineHeight = 30;

  const itemRowHeights = invoice.items.map((item) => {
    const lines = wrapCanvasText(sCtx, item.name, item.isFreeItem ? 680 : 820).slice(0, 2);
    return Math.max(76, lines.length * rowLineHeight + 28);
  });

  const itemsStartY = tableY + 108;
  const itemsTotalH = itemRowHeights.reduce((s, h) => s + h, 0);
  const itemsEndY   = itemsStartY + itemsTotalH;

  const totalsX = width - 760;
  const totalsW = 640;
  const totalsY = itemsEndY + 80;
  const shippingY = totalsY + (invoice.promoCode ? 174 : 116);
  const totalAmountBaseY = shippingY + 150;
  const footerBaseY      = totalAmountBaseY + 120;
  const height = Math.max(1800, footerBaseY + 220);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width  = width;
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
    const logoY = 100;
    const logoW = 1430;
    const logoH = 405;
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

  ctx.fillStyle = '#FF4F9A';
  roundRect(ctx, tableX, tableY, tableW, 68, 20);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 23px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Item', tableX + 28, tableY + 44);
  ctx.textAlign = 'center';
  ctx.fillText('Qty', tableX + 940, tableY + 44);
  ctx.fillText('Unit Price', tableX + 1160, tableY + 44);
  ctx.textAlign = 'right';
  ctx.fillText('Amount', tableX + tableW - 28, tableY + 44);

  let y = itemsStartY;
  ctx.textAlign = 'left';
  invoice.items.forEach((item, itemIndex) => {
    const badgePadX = 18;
    const badgePadY = 6;
    const badgeFontSize = 14;
    const badgeText = 'FREE ITEM';
    const badgeGap = 12;
    ctx.fillStyle = '#3A3A3A';
    ctx.font = '800 24px Inter, Arial, sans-serif';

    const allLines = wrapCanvasText(ctx, item.name, item.isFreeItem ? 680 : 820).slice(0, 2);
    allLines.forEach((line, index) => ctx.fillText(line, tableX + 28, y + index * rowLineHeight));

    if (item.isFreeItem) {
      const lastLineIndex = allLines.length - 1;
      const lastLineText = allLines[lastLineIndex] || '';
      ctx.font = '800 24px Inter, Arial, sans-serif';
      const nameTextWidth = ctx.measureText(lastLineText).width;
      ctx.font = `900 ${badgeFontSize}px Inter, Arial, sans-serif`;
      const badgeTextWidth = ctx.measureText(badgeText).width;
      const badgeW = badgeTextWidth + badgePadX * 2;
      const badgeH = badgeFontSize + badgePadY * 2;
      const badgeX = tableX + 28 + nameTextWidth + badgeGap;
      const badgeBaselineY = y + lastLineIndex * rowLineHeight;
      const badgeY = badgeBaselineY - badgeFontSize - badgePadY + 2;
      ctx.fillStyle = '#FF4F9A';
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(badgeText, badgeX + badgePadX, badgeBaselineY - 2);

      if (item.regularPrice > 0) {
        const regularPriceFontSize = 19;
        const regularPriceText = `(Regular Price ${formatCurrency(item.regularPrice)})`;
        ctx.font = `600 ${regularPriceFontSize}px Inter, Arial, sans-serif`;
        ctx.fillStyle = '#9CA3AF';
        ctx.fillText(regularPriceText, badgeX + badgeW + 10, badgeBaselineY - 1);
      }
    }

    ctx.font = '800 24px Inter, Arial, sans-serif';
    ctx.fillStyle = '#3A3A3A';
    ctx.textAlign = 'center';
    ctx.fillText(String(item.quantity), tableX + 940, y);
    ctx.fillText(formatCurrency(item.unitPrice), tableX + 1160, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(item.amount), tableX + tableW - 28, y);
    ctx.textAlign = 'left';

    const rowHeight = itemRowHeights[itemIndex];
    ctx.fillStyle = '#FFEAF3';
    ctx.fillRect(tableX + 28, y + rowHeight - 28, tableW - 56, 2);
    y += rowHeight;
  });

  drawTotal(ctx, 'Subtotal (Products)', invoice.originalSubtotal ?? invoice.subtotal, totalsX, totalsY);
  if (invoice.promoCode) {
    drawTextTotal(ctx, 'Promo Applied', `${invoice.promoCode}`, totalsX, totalsY + 58, '#217A54');
  }
  if ((invoice.promoSavings || 0) > 0) {
    drawTotal(ctx, 'You Saved', -invoice.promoSavings, totalsX, totalsY + (invoice.promoCode ? 116 : 58), '#217A54');
  }
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
  ctx.fillText(formatCurrency(invoice.total), totalsX + totalsW, totalAmountBaseY);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#8A204C';
  ctx.font = '800 25px Inter, Arial, sans-serif';
  ctx.fillText('Thank you for choosing lovieNglow.', 120, footerBaseY);
  ctx.fillStyle = '#6B7280';
  ctx.font = '600 22px Inter, Arial, sans-serif';
  ctx.fillText('Please send your payment receipt to complete order confirmation.', 120, footerBaseY + 40);

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

// ─── Digital Receipt ──────────────────────────────────────────────────────────

const RECEIPT_COUNTER_KEY = 'invory:receipt-counters:v1';

export function createReceiptNumber() {
  const date = new Date();
  const stamp = getDateStamp(date);
  let counters = {};
  try { counters = JSON.parse(localStorage.getItem(RECEIPT_COUNTER_KEY) || '{}'); } catch { counters = {}; }
  const next = Number(counters[stamp] || 0) + 1;
  counters[stamp] = next;
  localStorage.setItem(RECEIPT_COUNTER_KEY, JSON.stringify(counters));
  return `REC-${stamp}-${String(next).padStart(6, '0')}`;
}

export function buildReceiptDocument(order) {
  const meta = parseSaleNotes(order.notes);
  const saved = getOrderArtifacts()[order.id] || {};
  let receiptNumber = saved.receiptNumber;
  if (!receiptNumber) {
    receiptNumber = createReceiptNumber();
    saveOrderArtifact(order.id, { receiptNumber });
  }
  const receiptDate = meta.paymentDate || order.created_at;
  const invNumber = meta.invoiceNumber || order.order_number;
  const amount = Number(order.total) || 0;
  return {
    receiptNumber,
    receiptDate,
    invoiceNumber: invNumber,
    invoiceDate: order.created_at,
    paymentMethod: paymentLabel(order.payment_method),
    paymentStatus: 'Paid',
    referenceNumber: '',
    amountReceived: amount,
    customerName: order.customer_name || 'Walk-in',
    invoiceRows: [{
      invoiceNumber: invNumber,
      invoiceDate: order.created_at,
      invoiceAmount: amount,
      paymentAmount: amount,
      balance: 0,
    }],
  };
}

function fmtReceiptDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  } catch { return String(value); }
}

export async function renderReceiptPng(receipt, bannerUrl = invoiceBannerUrl) {
  const W = 1240, H = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const banner = await loadImage(bannerUrl || invoiceBannerUrl);

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#FFF7FB';
  ctx.fillRect(0, 0, W, H);
  const bgGlow = ctx.createRadialGradient(220, 160, 10, 220, 160, 740);
  bgGlow.addColorStop(0, 'rgba(255,214,232,0.72)');
  bgGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, W, H);

  // ── Card ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 60, 60, W - 120, H - 120, 32);
  ctx.fill();
  ctx.strokeStyle = '#FFB5D5';
  ctx.lineWidth = 3;
  ctx.stroke();

  const left = 140, right = 1100, midX = (left + right) / 2;

  // ── Dual Banner Header ────────────────────────────────────────────────────
  // Left banner
  if (banner) {
    const bW = 440, bH = 136;
    const ratio = banner.width / banner.height;
    let dW = bW, dH = dW / ratio;
    if (dH > bH) { dH = bH; dW = dH * ratio; }
    ctx.drawImage(banner, left, 110 + (bH - dH) / 2, dW, dH);
  }

  // Right banner (right-aligned to `right`)
  if (banner) {
    const bW = 440, bH = 136;
    const ratio = banner.width / banner.height;
    let dW = bW, dH = dW / ratio;
    if (dH > bH) { dH = bH; dW = dH * ratio; }
    ctx.drawImage(banner, right - dW, 110 + (bH - dH) / 2, dW, dH);
  }

  // ── Amount Received Card (under left banner, in header) ───────────────────
  const cardHdrX = left;
  const cardHdrY = 270;   // sits just below the banner row
  const cardHdrW = 440;
  const cardHdrH = 168;
  ctx.fillStyle = '#FF4F9A';
  roundRect(ctx, cardHdrX, cardHdrY, cardHdrW, cardHdrH, 20);
  ctx.fill();
  const glassG = ctx.createLinearGradient(cardHdrX, cardHdrY, cardHdrX, cardHdrY + cardHdrH);
  glassG.addColorStop(0, 'rgba(255,255,255,0.18)');
  glassG.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = glassG;
  roundRect(ctx, cardHdrX, cardHdrY, cardHdrW, cardHdrH, 20);
  ctx.fill();
  // Label
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '600 17px Inter, Arial, sans-serif';
  ctx.fillText('Amount Received', cardHdrX + cardHdrW / 2, cardHdrY + 56);
  // Separator
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(cardHdrX + 48, cardHdrY + 65, cardHdrW - 96, 1);
  // Amount
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 40px Inter, Arial, sans-serif';
  ctx.fillText(formatCurrency(receipt.amountReceived), cardHdrX + cardHdrW / 2, cardHdrY + 116);
  // PAID pill
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, cardHdrX + cardHdrW / 2 - 42, cardHdrY + cardHdrH - 42, 84, 26, 13);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 13px Inter, Arial, sans-serif';
  ctx.fillText('✓  PAID', cardHdrX + cardHdrW / 2, cardHdrY + cardHdrH - 24);

  // ── Divider 1 (below header zone) ────────────────────────────────────────
  const headerBottom = cardHdrY + cardHdrH + 30;   // = 270 + 168 + 30 = 468
  ctx.fillStyle = '#FFDDE8';
  ctx.fillRect(left, headerBottom, right - left, 2);

  // ── Title ─────────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1F2937';
  ctx.font = '900 42px Inter, Arial, sans-serif';
  ctx.fillText('DIGITAL RECEIPT', midX, headerBottom + 62);

  // ── Divider 2 ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#FFDDE8';
  ctx.fillRect(left, headerBottom + 90, right - left, 2);

  // ── Payment Info (full-width grid, no amount card in body) ────────────────
  const infoTop = headerBottom + 148, rowGap = 58;
  const infoRows = [
    ['Receipt Date', fmtReceiptDate(receipt.receiptDate)],
    ['Receipt Number', receipt.receiptNumber],
    ['Invoice Number', receipt.invoiceNumber],
    ['Payment Method', receipt.paymentMethod],
    ['Payment Status', receipt.paymentStatus],
    ['Reference Number', receipt.referenceNumber || '—'],
  ];
  // Draw in two columns for compactness (3 rows each)
  const col1X = left;
  const col2X = left + 490;
  ctx.textAlign = 'left';
  infoRows.forEach(([label, value], i) => {
    const col = i < 3 ? col1X : col2X;
    const ry  = infoTop + (i % 3) * rowGap;
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 17px Inter, Arial, sans-serif';
    ctx.fillText(label, col, ry);
    ctx.fillStyle = '#111827';
    ctx.font = '700 22px Inter, Arial, sans-serif';
    ctx.fillText(value, col, ry + 27);
  });

  // ── Divider 3 (below info grid) ───────────────────────────────────────────
  const div3Y = infoTop + 3 * rowGap + 24;

  ctx.fillStyle = '#FFDDE8';
  ctx.fillRect(left, div3Y, right - left, 2);

  // ── Received From ─────────────────────────────────────────────────────────
  const rfY = div3Y + 52;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '700 16px Inter, Arial, sans-serif';
  ctx.fillText('RECEIVED FROM', left, rfY);
  ctx.fillStyle = '#111827';
  ctx.font = '800 28px Inter, Arial, sans-serif';
  ctx.fillText(receipt.customerName, left, rfY + 36);

  // ── Divider 4 ─────────────────────────────────────────────────────────────
  const div4Y = rfY + 68;
  ctx.fillStyle = '#FFDDE8';
  ctx.fillRect(left, div4Y, right - left, 2);

  // ── Payment For ───────────────────────────────────────────────────────────
  const pfY = div4Y + 46;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  ctx.font = '800 26px Inter, Arial, sans-serif';
  ctx.fillText('Payment For', left, pfY);

  const tTop = pfY + 28;
  const tW = right - left;
  const tRowH = 54;
  const pcts = [0.26, 0.21, 0.20, 0.20, 0.13];
  const colXs = pcts.map((_, i) => left + pcts.slice(0, i).reduce((s, v) => s + v * tW, 0));
  const colWs = pcts.map((p) => p * tW);

  // Table header — rounded top corners
  ctx.fillStyle = '#FF4F9A';
  ctx.beginPath();
  ctx.moveTo(left + 12, tTop);
  ctx.lineTo(left + tW - 12, tTop);
  ctx.quadraticCurveTo(left + tW, tTop, left + tW, tTop + 12);
  ctx.lineTo(left + tW, tTop + tRowH);
  ctx.lineTo(left, tTop + tRowH);
  ctx.lineTo(left, tTop + 12);
  ctx.quadraticCurveTo(left, tTop, left + 12, tTop);
  ctx.closePath();
  ctx.fill();

  const hLabels = ['Invoice Number', 'Invoice Date', 'Invoice Amount', 'Payment Amount', 'Balance'];
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 16px Inter, Arial, sans-serif';
  hLabels.forEach((lbl, i) => {
    ctx.textAlign = i === 0 ? 'left' : 'right';
    ctx.fillText(lbl, i === 0 ? colXs[i] + 14 : colXs[i] + colWs[i] - 14, tTop + tRowH - 15);
  });

  // Table data rows
  receipt.invoiceRows.forEach((row, ri) => {
    const ry = tTop + tRowH + ri * tRowH;
    ctx.fillStyle = ri % 2 === 0 ? '#FFF7FB' : '#FFFFFF';
    ctx.fillRect(left, ry, tW, tRowH);
    ctx.fillStyle = '#FFDDE8';
    ctx.fillRect(left, ry + tRowH - 1, tW, 1);
    const cells = [row.invoiceNumber, fmtReceiptDate(row.invoiceDate), formatCurrency(row.invoiceAmount), formatCurrency(row.paymentAmount), formatCurrency(row.balance)];
    ctx.fillStyle = '#111827';
    ctx.font = '600 18px Inter, Arial, sans-serif';
    cells.forEach((val, i) => {
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.fillText(val, i === 0 ? colXs[i] + 14 : colXs[i] + colWs[i] - 14, ry + tRowH - 14);
    });
  });

  // Table outer border (sides + bottom)
  const tEnd = tTop + tRowH + receipt.invoiceRows.length * tRowH;
  ctx.strokeStyle = '#FFDDE8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, tTop + tRowH);
  ctx.lineTo(left, tEnd);
  ctx.lineTo(left + tW, tEnd);
  ctx.lineTo(left + tW, tTop + tRowH);
  ctx.stroke();

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF4F9A';
  ctx.font = '800 22px Inter, Arial, sans-serif';
  ctx.fillText('Thank you for choosing lovieNglow.', midX, H - 120);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '500 18px Inter, Arial, sans-serif';
  ctx.fillText('This serves as your official digital receipt.', midX, H - 84);

  // Page number
  ctx.textAlign = 'right';
  ctx.fillStyle = '#D1D5DB';
  ctx.font = '400 18px Inter, Arial, sans-serif';
  ctx.fillText('1', right, H - 84);

  return canvas.toDataURL('image/png');
}

