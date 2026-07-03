import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clock,
  Download,
  Eye,
  FileText,
  Gift,
  GripVertical,
  Image,
  Palette,
  Save,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { EmptyState, ErrorBanner, Spinner } from '../components/common/Primitives';
import { useApiData } from '../hooks/useApiData';
import { categoryService, productService, productSetsService } from '../api/services';
import { formatCurrency } from '../utils/format';

const TEMPLATE_OPTIONS = [
  {
    id: 'pink-kawaii',
    label: 'Pink Kawaii',
    primary: '#F6538F',
    secondary: '#FFE0EC',
    accent: '#FFB4D0',
    ink: '#8A204C',
    paper: '#FFF7FB',
    panel: '#FFFFFF',
    border: '#FDB6D1',
    radius: 18,
    font: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'mint-fresh',
    label: 'Mint Fresh',
    primary: '#2F8F72',
    secondary: '#DDF5E8',
    accent: '#8DD7BE',
    ink: '#1F4F42',
    paper: '#F5FFFA',
    panel: '#FFFFFF',
    border: '#A8E1CF',
    radius: 14,
    font: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'lavender-cute',
    label: 'Lavender Cute',
    primary: '#8D5FD3',
    secondary: '#E9DDF8',
    accent: '#C7AEF0',
    ink: '#49306F',
    paper: '#FBF8FF',
    panel: '#FFFFFF',
    border: '#D7C2F8',
    radius: 16,
    font: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'beige-minimal',
    label: 'Beige Minimal',
    primary: '#8B6B4E',
    secondary: '#EFE3D2',
    accent: '#D8B892',
    ink: '#49392B',
    paper: '#FFF9F1',
    panel: '#FFFFFF',
    border: '#E0C8AA',
    radius: 10,
    font: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'sky-blue',
    label: 'Sky Blue',
    primary: '#3478B8',
    secondary: '#DCEBFF',
    accent: '#9CC8F5',
    ink: '#24435F',
    paper: '#F5FAFF',
    panel: '#FFFFFF',
    border: '#B9D8F8',
    radius: 14,
    font: 'Inter, system-ui, sans-serif',
  },
];

const DEFAULT_INFO = {
  title: 'PINC LEGIT | LOVIE',
  subtitle: 'Quality you can trust!',
  location: '📍PARAÑAQUE CITY',
  nearbyAreas: '',
  services: '🚚 Lalamove (subject to availability, 24/7) | 📦 Nationwide shipping via J&T',
  activeHours: '10AM - 7PM',
  payment: 'PAYMENT FIRST. NO COD',
  logoDataUrl: '',
  logo: {
    fit: 'contain',
    zoom: 100,
    position: { x: 50, y: 50 },
  },
  promo: {
    visible: true,
    icon: 'sparkles',
    title: 'Welcome Promo',
    description: "Thank you for choosing us! Check out today's exclusive deals.",
    background: '#FFE0EC',
  },
};

const DRAFT_KEY = 'invory:pricelist:draft:v1';
const LOGO_ZOOM_MIN = 80;
const LOGO_ZOOM_MAX = 120;
const LOGO_POSITION_STEP = 8;

const STOCK_STYLES = [
  { value: 'strike', label: 'Strikethrough' },
  { value: 'fade', label: 'Gray out' },
  { value: 'hide', label: 'Hide completely' },
];

function normalizeKey(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildInitialSections(products = [], categories = [], sets = []) {
  const categoryMap = categories.reduce((acc, category) => {
    acc[category.id] = category.name;
    return acc;
  }, {});

  const grouped = products.reduce((acc, product) => {
    const categoryName = categoryMap[product.category_id] || product.category?.name || 'Uncategorized';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push({
      id: `product-${product.id}`,
      sourceId: product.id,
      sourceType: 'product',
      name: product.name,
      price: Number(product.selling_price) || 0,
      overridePrice: '',
      hidden: false,
      outOfStock: Number(product.stock_quantity) <= 0,
      badge: Number(product.stock_quantity) <= 0 ? 'OUT OF STOCK' : '',
    });
    return acc;
  }, {});

  const productSections = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, items], index) => ({
      id: `section-${normalizeKey(name)}-${index}`,
      title: name,
      icon: index % 2 ? 'heart' : 'tag',
      hidden: false,
      items,
    }));

  const setSection = sets.length
    ? [{
      id: 'section-product-sets',
      title: 'Bundles & Sets',
      icon: 'sparkle',
      hidden: false,
      items: sets.map((set) => ({
        id: `set-${set.id}`,
        sourceId: set.id,
        sourceType: 'set',
        name: set.name,
        price: set.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0,
        overridePrice: '',
        hidden: false,
        outOfStock: false,
        badge: 'SET',
      })),
    }]
    : [];

  return [...setSection, ...productSections];
}

function getItemPrice(item) {
  const override = Number(item.overridePrice);
  return item.overridePrice !== '' && !Number.isNaN(override) ? override : item.price;
}

function formatLastSaved(value) {
  if (!value) return 'Not saved yet';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLogoSettings(logo = {}) {
  const position = logo.position || {};
  const zoom = Number(logo.zoom);
  const x = Number(position.x);
  const y = Number(position.y);
  return {
    fit: logo.fit === 'cover' ? 'cover' : 'contain',
    zoom: clamp(Number.isFinite(zoom) ? zoom : 100, LOGO_ZOOM_MIN, LOGO_ZOOM_MAX),
    position: {
      x: clamp(Number.isFinite(x) ? x : 50, 0, 100),
      y: clamp(Number.isFinite(y) ? y : 50, 0, 100),
    },
  };
}

function getLogoImageStyle(logo) {
  const settings = normalizeLogoSettings(logo);
  return {
    objectFit: settings.fit,
    objectPosition: `${settings.position.x}% ${settings.position.y}%`,
    transform: `scale(${settings.zoom / 100})`,
  };
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function colorWithAlpha(hex, alpha) {
  const value = hex?.replace('#', '') || 'ffffff';
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const numeric = Number.parseInt(full, 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke, lineWidth = 1) {
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
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function splitCanvasText(ctx, text, maxWidth) {
  return String(text || '').split('\n').flatMap((line) => {
    const words = line.split(' ');
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
    lines.push(current);
    return lines;
  });
}

function drawTextBlock(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
  const lines = splitCanvasText(ctx, text, maxWidth);
  ctx.fillStyle = options.color || '#111827';
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    const drawX = options.align === 'center' ? x + maxWidth / 2 : x;
    ctx.fillText(line, drawX, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

function getPromoIconGlyph(icon) {
  if (icon === 'gift') return '🎁';
  if (icon === 'heart') return '♥';
  return '✧';
}

async function renderPricelistImage({ info, sections, template, stockStyle, exportQuality, exportFormat }) {
  const scale = exportQuality === 'print' ? 3 : exportQuality === 'high' ? 2 : 1;
  const width = 1200;
  const margin = 48;
  const gap = 24;
  const contentWidth = width - margin * 2;
  const columnWidth = (contentWidth - gap) / 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const logoImage = await loadCanvasImage(info.logoDataUrl);

  ctx.font = '700 22px Inter, Arial, sans-serif';
  const visibleSectionsForExport = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.hidden && !(item.outOfStock && stockStyle === 'hide')),
  })).filter((section) => section.items.length);

  const sectionHeights = visibleSectionsForExport.map((section) => {
    ctx.font = '900 24px Inter, Arial, sans-serif';
    const titleLines = splitCanvasText(ctx, section.title.toUpperCase(), columnWidth - 128).length;
    return Math.max(84, 34 + titleLines * 30) + 36 + section.items.length * 38 + 34;
  });

  ctx.font = '800 20px Inter, Arial, sans-serif';
  const shippingTextHeight = splitCanvasText(ctx, info.services, contentWidth - 116).length * 28;
  const shippingHeight = Math.max(98, shippingTextHeight + 58);
  ctx.font = '900 22px Inter, Arial, sans-serif';
  const promoTitleHeight = info.promo?.visible ? splitCanvasText(ctx, info.promo.title, contentWidth - 220).length * 26 : 0;
  ctx.font = '700 17px Inter, Arial, sans-serif';
  const promoDescriptionHeight = info.promo?.visible ? splitCanvasText(ctx, info.promo.description, contentWidth - 220).length * 23 : 0;
  const promoBlockHeight = info.promo?.visible ? Math.max(96, promoTitleHeight + promoDescriptionHeight + 46) : 0;
  const tileY = 300;
  const tileHeight = 176;
  const shippingY = tileY + tileHeight + 22;
  const promoY = shippingY + shippingHeight + (info.promo?.visible ? 22 : 0);
  const headerHeight = (info.promo?.visible ? promoY + promoBlockHeight : shippingY + shippingHeight) - margin + 34;
  const rowHeights = [];
  for (let index = 0; index < sectionHeights.length; index += 2) {
    rowHeights.push(Math.max(sectionHeights[index], sectionHeights[index + 1] || 0));
  }
  const bodyHeight = rowHeights.reduce((sum, value) => sum + value, 0) + Math.max(0, rowHeights.length - 1) * gap;
  const footerHeight = 76;
  const height = margin + headerHeight + gap + bodyHeight + footerHeight + margin;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, template.paper);
  background.addColorStop(1, template.secondary);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  drawRoundRect(ctx, margin, margin, contentWidth, headerHeight, 30, 'rgba(255,255,255,0.82)', template.border, 2);

  const logoSize = 164;
  const logoX = margin + 36;
  const logoY = margin + 36;
  drawRoundRect(ctx, logoX, logoY, logoSize, logoSize, 28, 'rgba(255,255,255,0.9)', template.border, 2);
  if (logoImage) {
    const settings = normalizeLogoSettings(info.logo);
    const padding = settings.fit === 'cover' ? 0 : 8;
    const frame = logoSize - padding * 2;
    const imageRatio = logoImage.width / logoImage.height;
    const frameRatio = frame / frame;
    const cover = settings.fit === 'cover';
    let drawWidth = frame;
    let drawHeight = frame;
    if ((cover && imageRatio > frameRatio) || (!cover && imageRatio < frameRatio)) {
      drawHeight = cover ? frame : frame / imageRatio;
      drawWidth = drawHeight * imageRatio;
    } else {
      drawWidth = cover ? frame * imageRatio : frame;
      drawHeight = drawWidth / imageRatio;
    }
    drawWidth *= settings.zoom / 100;
    drawHeight *= settings.zoom / 100;
    const offsetX = ((settings.position.x - 50) / 50) * 18;
    const offsetY = ((settings.position.y - 50) / 50) * 18;
    ctx.save();
    drawRoundRect(ctx, logoX, logoY, logoSize, logoSize, 28);
    ctx.clip();
    ctx.drawImage(logoImage, logoX + logoSize / 2 - drawWidth / 2 + offsetX, logoY + logoSize / 2 - drawHeight / 2 + offsetY, drawWidth, drawHeight);
    ctx.restore();
  } else {
    ctx.fillStyle = template.primary;
    drawRoundRect(ctx, logoX + 50, logoY + 42, 64, 64, 20, template.primary);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↑', logoX + logoSize / 2, logoY + 58);
    ctx.fillStyle = template.ink;
    ctx.font = '900 14px Inter, Arial, sans-serif';
    ctx.fillText('UPLOAD LOGO', logoX + logoSize / 2, logoY + 120);
  }

  const titleX = logoX + logoSize + 36;
  const titleWidth = contentWidth - logoSize - 96;
  drawRoundRect(ctx, titleX, logoY + 28, 238, 38, 19, template.primary);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 13px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✧ PINC X MINT PRICELIST ✧', titleX + 119, logoY + 47);

  ctx.font = '900 58px Inter, Arial, sans-serif';
  const titleEndY = drawTextBlock(ctx, info.title, titleX, logoY + 84, titleWidth, 60, { color: template.primary });
  ctx.font = '800 18px Inter, Arial, sans-serif';
  drawTextBlock(ctx, info.subtitle, titleX, titleEndY + 8, titleWidth, 24, { color: template.ink });

  const drawInfoTile = (label, value, x, y, w, h, secondaryLabel, secondaryValue) => {
    drawRoundRect(ctx, x, y, w, h, 24, 'rgba(255,255,255,0.68)', 'rgba(255,255,255,0.78)', 1);
    ctx.font = '900 15px Inter, Arial, sans-serif';
    drawTextBlock(ctx, label.toUpperCase(), x + 22, y + 20, w - 44, 20, { color: colorWithAlpha(template.ink, 0.64) });
    ctx.font = '800 18px Inter, Arial, sans-serif';
    const nextY = drawTextBlock(ctx, value, x + 22, y + 50, w - 44, 26, { color: template.ink });
    if (secondaryValue) {
      ctx.font = '900 15px Inter, Arial, sans-serif';
      drawTextBlock(ctx, secondaryLabel.toUpperCase(), x + 22, nextY + 18, w - 44, 20, { color: colorWithAlpha(template.ink, 0.64) });
      ctx.font = '800 18px Inter, Arial, sans-serif';
      drawTextBlock(ctx, secondaryValue, x + 22, nextY + 48, w - 44, 26, { color: template.ink });
    }
  };
  drawInfoTile('Location', info.location, margin + 36, tileY, (contentWidth - 96) / 2, tileHeight, 'Nearby Areas', info.nearbyAreas);
  drawInfoTile('Active Hours', info.activeHours, margin + 60 + (contentWidth - 96) / 2, tileY, (contentWidth - 96) / 2, tileHeight);
  drawRoundRect(ctx, margin + 36, shippingY, contentWidth - 72, shippingHeight, 24, 'rgba(255,255,255,0.68)', 'rgba(255,255,255,0.78)', 1);
  ctx.font = '900 15px Inter, Arial, sans-serif';
  drawTextBlock(ctx, 'SHIPPING', margin + 58, shippingY + 18, contentWidth - 116, 20, { color: colorWithAlpha(template.ink, 0.64) });
  ctx.font = '800 20px Inter, Arial, sans-serif';
  drawTextBlock(ctx, info.services, margin + 58, shippingY + 48, contentWidth - 116, 28, { color: template.ink });

  if (info.promo?.visible) {
    drawRoundRect(ctx, margin + 36, promoY, contentWidth - 72, promoBlockHeight, 28, colorWithAlpha(info.promo.background || template.secondary, 0.62), template.border, 2);
    drawRoundRect(ctx, margin + 64, promoY + 24, 48, 48, 24, template.primary);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(getPromoIconGlyph(info.promo.icon), margin + 88, promoY + 34);
    ctx.textAlign = 'left';
    ctx.font = '900 22px Inter, Arial, sans-serif';
    const promoTitleEndY = drawTextBlock(ctx, info.promo.title, margin + 134, promoY + 20, contentWidth - 220, 26, { color: template.ink });
    ctx.font = '700 17px Inter, Arial, sans-serif';
    drawTextBlock(ctx, info.promo.description, margin + 134, promoTitleEndY + 6, contentWidth - 220, 23, { color: colorWithAlpha(template.ink, 0.8) });
  }

  const columnY = margin + headerHeight + gap;
  let rowY = columnY;
  visibleSectionsForExport.forEach((section, index) => {
    const column = index % 2;
    const rowIndex = Math.floor(index / 2);
    const x = margin + column * (columnWidth + gap);
    const y = rowY;
    const heightForSection = rowHeights[rowIndex];
    drawRoundRect(ctx, x, y, columnWidth, heightForSection, 20, 'rgba(255,255,255,0.82)', template.border, 2);
    ctx.font = '900 24px Inter, Arial, sans-serif';
    const titleLines = splitCanvasText(ctx, section.title.toUpperCase(), columnWidth - 128);
    const headerHeightForSection = Math.max(84, 34 + titleLines.length * 30);
    drawRoundRect(ctx, x, y, columnWidth, headerHeightForSection, 20, template.primary);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    titleLines.forEach((line, lineIndex) => {
      ctx.fillText(line, x + columnWidth / 2, y + 22 + lineIndex * 30);
    });
    ctx.font = '900 18px Inter, Arial, sans-serif';
    ctx.fillText(getPromoIconGlyph(section.icon), x + 42, y + headerHeightForSection / 2 - 10);
    ctx.fillText(getPromoIconGlyph(section.icon), x + columnWidth - 42, y + headerHeightForSection / 2 - 10);

    let itemY = y + headerHeightForSection + 24;
    section.items.forEach((item, itemIndex) => {
      const isOut = item.outOfStock;
      ctx.globalAlpha = isOut && stockStyle === 'fade' ? 0.55 : 1;
      ctx.textBaseline = 'middle';
      ctx.font = '700 18px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = template.ink;
      ctx.fillText(item.name, x + 24, itemY);
      const itemNameWidth = ctx.measureText(item.name).width;
      if (isOut && stockStyle === 'strike') {
        ctx.strokeStyle = colorWithAlpha(template.ink, 0.82);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + 24, itemY);
        ctx.lineTo(x + 24 + itemNameWidth, itemY);
        ctx.stroke();
      }
      if (item.badge) {
        const badgeX = x + 24 + Math.min(itemNameWidth + 14, columnWidth - 150);
        drawRoundRect(ctx, badgeX, itemY - 17, 48, 22, 11, isOut ? '#8B93A1' : template.accent);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.badge, badgeX + 24, itemY - 12);
      }
      ctx.font = '900 18px Inter, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = template.ink;
      const priceText = formatCurrency(getItemPrice(item));
      ctx.fillText(priceText, x + columnWidth - 24, itemY);
      if (isOut && stockStyle === 'strike') {
        const priceWidth = ctx.measureText(priceText).width;
        ctx.strokeStyle = colorWithAlpha(template.ink, 0.82);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + columnWidth - 24 - priceWidth, itemY);
        ctx.lineTo(x + columnWidth - 24, itemY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (itemIndex < section.items.length - 1) {
        ctx.strokeStyle = template.border;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x + 24, itemY + 18);
        ctx.lineTo(x + columnWidth - 24, itemY + 18);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      itemY += 38;
    });
    ctx.fillStyle = colorWithAlpha(template.ink, 0.45);
    ctx.font = '700 18px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('---------', x + columnWidth / 2, itemY + 8);
    if (column === 1 || index === visibleSectionsForExport.length - 1) {
      rowY += heightForSection + gap;
    }
  });

  const footerY = height - margin - footerHeight;
  drawRoundRect(ctx, margin, footerY, contentWidth, footerHeight, 20, template.primary);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.payment, width / 2, footerY + footerHeight / 2);

  return canvas;
}

function SectionIcon({ type }) {
  if (type === 'sparkle') return <Sparkles size={13} />;
  if (type === 'heart') return <span className="text-xs">♥</span>;
  return <Tag size={13} />;
}

export default function Pricelist() {
  const [activeTab, setActiveTab] = useState('content');
  const [info, setInfo] = useState(DEFAULT_INFO);
  const [sections, setSections] = useState([]);
  const [templateId, setTemplateId] = useState('pink-kawaii');
  const [stockStyle, setStockStyle] = useState('strike');
  const [zoom, setZoom] = useState('fit');
  const [exportFormat, setExportFormat] = useState('png');
  const [exportQuality, setExportQuality] = useState('high');
  const [draggingId, setDraggingId] = useState(null);
  const [syncedInventory, setSyncedInventory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { data: products, loading: productsLoading, error: productsError } = useApiData(
    () => productService.list({ pageSize: 500 }),
    [],
  );
  const { data: categories } = useApiData(() => categoryService.list(), []);
  const { data: productSets } = useApiData(() => productSetsService.list(), []);

  useEffect(() => {
    const rawDraft = localStorage.getItem(DRAFT_KEY);
    if (!rawDraft) {
      setDraftLoaded(true);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);
      setInfo({
        ...DEFAULT_INFO,
        ...draft.info,
        logo: normalizeLogoSettings({ ...DEFAULT_INFO.logo, ...draft.info?.logo }),
        promo: { ...DEFAULT_INFO.promo, ...draft.info?.promo },
      });
      setSections(draft.sections || []);
      setTemplateId(draft.templateId || 'pink-kawaii');
      setStockStyle(draft.stockStyle || 'strike');
      setLastSaved(draft.savedAt || null);
      setSyncedInventory(true);
    } catch (error) {
      localStorage.removeItem(DRAFT_KEY);
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded || !products || !categories || !productSets || syncedInventory) return;
    setSections(buildInitialSections(products, categories, productSets));
    setSyncedInventory(true);
  }, [categories, draftLoaded, productSets, products, syncedInventory]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const handleNavigationClick = (event) => {
      const link = event.target.closest?.('a[href]');
      if (!link || link.target || link.origin !== window.location.origin || link.pathname === window.location.pathname) return;
      if (window.confirm('You have unsaved pricelist changes. Leave without saving?')) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleNavigationClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleNavigationClick, true);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges || !sections.length) return undefined;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ info, sections, templateId, stockStyle, savedAt }));
      setLastSaved(savedAt);
      setHasUnsavedChanges(false);
    }, 45000);
    return () => window.clearTimeout(timer);
  }, [hasUnsavedChanges, info, sections, stockStyle, templateId]);

  const template = TEMPLATE_OPTIONS.find((item) => item.id === templateId) || TEMPLATE_OPTIONS[0];
  const visibleSections = useMemo(() => sections.filter((section) => !section.hidden), [sections]);
  const visibleItemCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.items.filter((item) => !item.hidden).length, 0),
    [sections],
  );

  const markUnsaved = () => setHasUnsavedChanges(true);

  const updateInfo = (field, value) => {
    setInfo((prev) => ({ ...prev, [field]: value }));
    markUnsaved();
  };

  const updatePromo = (field, value) => {
    setInfo((prev) => ({
      ...prev,
      promo: { ...prev.promo, [field]: value },
    }));
    markUnsaved();
  };

  const updateLogo = (patch) => {
    setInfo((prev) => ({
      ...prev,
      logo: normalizeLogoSettings({
        ...prev.logo,
        ...patch,
        position: patch.position || prev.logo?.position,
      }),
    }));
    markUnsaved();
  };

  const updateSection = (sectionId, patch) => {
    setSections((prev) => prev.map((section) => (
      section.id === sectionId ? { ...section, ...patch } : section
    )));
    markUnsaved();
  };

  const updateItem = (sectionId, itemId, patch) => {
    setSections((prev) => prev.map((section) => (
      section.id === sectionId
        ? {
          ...section,
          items: section.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        }
        : section
    )));
    markUnsaved();
  };

  const moveSection = (sectionId, direction) => {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.id === sectionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [section] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, section);
      return copy;
    });
    markUnsaved();
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `section-custom-${Date.now()}`,
        title: 'New Section',
        icon: 'tag',
        hidden: false,
        items: [],
      },
    ]);
    markUnsaved();
  };

  const addItem = (sectionId) => {
    updateSection(sectionId, {
      items: [
        ...(sections.find((section) => section.id === sectionId)?.items || []),
        {
          id: `custom-${Date.now()}`,
          sourceType: 'custom',
          name: 'New Item',
          price: 0,
          overridePrice: '',
          hidden: false,
          outOfStock: false,
          badge: '',
        },
      ],
    });
  };

  const deleteSection = (sectionId) => {
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
    markUnsaved();
  };

  const deleteItem = (sectionId, itemId) => {
    updateSection(sectionId, {
      items: (sections.find((section) => section.id === sectionId)?.items || []).filter((item) => item.id !== itemId),
    });
  };

  const handleDropSection = (targetId) => {
    if (!draggingId || draggingId === targetId) return;
    setSections((prev) => {
      const sourceIndex = prev.findIndex((section) => section.id === draggingId);
      const targetIndex = prev.findIndex((section) => section.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      const copy = [...prev];
      const [section] = copy.splice(sourceIndex, 1);
      copy.splice(targetIndex, 0, section);
      return copy;
    });
    setDraggingId(null);
    markUnsaved();
  };

  const handleSave = () => {
    const savedAt = new Date().toISOString();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ info, sections, templateId, stockStyle, savedAt }));
    setLastSaved(savedAt);
    setHasUnsavedChanges(false);
    toast.success('Pricelist saved successfully.');
  };

  const handleLogoFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a PNG, SVG, JPG, or other image file.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateInfo('logoDataUrl', dataUrl);
      toast.success('Logo uploaded.');
    } catch (error) {
      toast.error('Could not upload logo.');
    }
  };

  const resetLogo = () => {
    setInfo((prev) => ({
      ...prev,
      logoDataUrl: '',
      logo: DEFAULT_INFO.logo,
    }));
    markUnsaved();
  };

  const handleExport = async () => {
    try {
      const canvas = await renderPricelistImage({
        info,
        sections: visibleSections,
        template,
        stockStyle,
        exportQuality,
        exportFormat,
      });
      const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const extension = exportFormat === 'jpg' ? 'jpg' : 'png';
      const dataUrl = canvas.toDataURL(mimeType, 0.95);
      const filename = `${normalizeKey(info.title) || 'pricelist'}.${extension}`;
      downloadDataUrl(dataUrl, filename);
      toast.success(`Pricelist exported as ${extension.toUpperCase()}.`);
    } catch (error) {
      toast.error('Could not export image. Please try again.');
    }
  };

  return (
    <div>
      <Topbar
        title="Pricelist"
        subtitle="Create, edit, and export marketing-ready product posters"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-ink-faint mr-1">
              <Clock size={14} />
              <span>{formatLastSaved(lastSaved)}</span>
              {hasUnsavedChanges && <span className="text-gold-500">Unsaved</span>}
            </div>
            <button type="button" className="btn-secondary" onClick={handleSave}>
              <Save size={16} /> Save
            </button>
            <button type="button" className="btn-secondary" onClick={() => setZoom((value) => (value === 'fit' ? '100' : 'fit'))}>
              <Eye size={16} /> Preview
            </button>
            <button type="button" className="btn-primary" onClick={handleExport}>
              <Download size={16} /> Export
            </button>
          </div>
        }
      />

      <div className="px-4 md:px-8 pb-8">
        <ErrorBanner message={productsError?.message} />

        {productsLoading && !products ? (
          <Spinner label="Building your pricelist workspace..." />
        ) : (
          <div className="grid grid-cols-1 2xl:grid-cols-[360px_1fr] gap-5">
            <aside className="card overflow-hidden 2xl:sticky 2xl:top-5 2xl:max-h-[calc(100vh-7rem)] 2xl:overflow-y-auto">
              <div className="grid grid-cols-3 border-b border-border bg-paper/70">
                {[
                  { value: 'content', label: 'Content', icon: FileText },
                  { value: 'design', label: 'Design', icon: Palette },
                  { value: 'settings', label: 'Settings', icon: Settings2 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={`flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold transition-colors ${
                        activeTab === tab.value ? 'bg-surface text-brand-600' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline 2xl:hidden 3xl:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {activeTab === 'content' && (
                <div className="p-4 space-y-5">
                  <PanelTitle title="General Info" />
                  <InputField label="Pricelist Title" value={info.title} onChange={(value) => updateInfo('title', value)} maxLength={60} />
                  <InputField label="Subtitle / Tagline" value={info.subtitle} onChange={(value) => updateInfo('subtitle', value)} maxLength={80} />
                  <InputField label="Location" value={info.location} onChange={(value) => updateInfo('location', value)} maxLength={80} />
                  <InputField label="Nearby Areas" value={info.nearbyAreas} onChange={(value) => updateInfo('nearbyAreas', value)} maxLength={160} textarea />
                  <InputField label="Shipping Info" value={info.services} onChange={(value) => updateInfo('services', value)} textarea />
                  <InputField label="Active Hours" value={info.activeHours} onChange={(value) => updateInfo('activeHours', value)} maxLength={120} textarea />
                  <InputField label="Payment Banner" value={info.payment} onChange={(value) => updateInfo('payment', value)} maxLength={80} />

                  <PanelTitle title="Brand Logo" />
                  <LogoUploader
                    logoDataUrl={info.logoDataUrl}
                    logo={info.logo}
                    onUpload={handleLogoFile}
                    onReset={resetLogo}
                    onLogoChange={updateLogo}
                  />

                  <PanelTitle title="Promo Badge" />
                  <div className="space-y-3 rounded-xl border border-border bg-paper/60 p-3">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      <input
                        type="checkbox"
                        checked={info.promo.visible}
                        onChange={(event) => updatePromo('visible', event.target.checked)}
                      />
                      Show promo badge
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_96px] gap-3">
                      <InputField label="Promo Title" value={info.promo.title} onChange={(value) => updatePromo('title', value)} maxLength={80} textarea />
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Icon</span>
                        <select className="input-field" value={info.promo.icon} onChange={(event) => updatePromo('icon', event.target.value)}>
                          <option value="sparkles">Sparkles</option>
                          <option value="gift">Gift</option>
                          <option value="heart">Heart</option>
                        </select>
                      </label>
                    </div>
                    <InputField label="Promo Description" value={info.promo.description} onChange={(value) => updatePromo('description', value)} textarea />
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Background Color</span>
                      <input
                        type="color"
                        className="h-11 w-full rounded-lg border border-border bg-surface p-1"
                        value={info.promo.background}
                        onChange={(event) => updatePromo('background', event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <PanelTitle title="Section Management" />
                    <button type="button" className="text-xs font-semibold text-brand-600 hover:underline" onClick={addSection}>
                      + Add Section
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sections.map((section, index) => (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={() => setDraggingId(section.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleDropSection(section.id)}
                        className="rounded-lg border border-border bg-surface p-3"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical size={16} className="text-ink-faint" />
                          <textarea
                            rows={2}
                            className="min-w-0 flex-1 resize-none bg-transparent text-sm font-semibold leading-snug text-ink focus:outline-none"
                            value={section.title}
                            onChange={(event) => updateSection(section.id, { title: event.target.value })}
                          />
                          <button type="button" className="p-1.5 text-ink-faint hover:text-ink" onClick={() => moveSection(section.id, -1)} disabled={index === 0}>
                            <ArrowUp size={14} />
                          </button>
                          <button type="button" className="p-1.5 text-ink-faint hover:text-ink" onClick={() => moveSection(section.id, 1)} disabled={index === sections.length - 1}>
                            <ArrowDown size={14} />
                          </button>
                          <button type="button" className="p-1.5 text-rust-500 hover:bg-rust-50 rounded-md" onClick={() => deleteSection(section.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <label className="inline-flex items-center gap-2 text-ink-soft">
                            <input
                              type="checkbox"
                              checked={!section.hidden}
                              onChange={(event) => updateSection(section.id, { hidden: !event.target.checked })}
                            />
                            Show section
                          </label>
                          <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => addItem(section.id)}>
                            + Add item
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <PanelTitle title="Item Management" />
                  <div className="space-y-4">
                    {sections.map((section) => (
                      <div key={`items-${section.id}`} className="rounded-xl border border-border bg-paper/60 p-3">
                        <p className="mb-3 whitespace-pre-line text-sm font-semibold leading-snug text-ink">{section.title}</p>
                        <div className="space-y-2">
                          {section.items.length ? section.items.map((item) => (
                            <div key={item.id} className="rounded-lg bg-surface border border-border p-2.5 space-y-2">
                              <div className="grid grid-cols-[1fr_92px_auto] gap-2 items-center">
                                <input
                                  className="min-w-0 bg-transparent text-xs font-medium text-ink focus:outline-none"
                                  value={item.name}
                                  onChange={(event) => updateItem(section.id, item.id, { name: event.target.value })}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input-field px-2 py-1.5 text-xs"
                                  placeholder={String(item.price)}
                                  value={item.overridePrice}
                                  onChange={(event) => updateItem(section.id, item.id, { overridePrice: event.target.value })}
                                />
                                <button type="button" className="p-1.5 text-rust-500 hover:bg-rust-50 rounded-md" onClick={() => deleteItem(section.id, item.id)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                                <label className="inline-flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={!item.hidden}
                                    onChange={(event) => updateItem(section.id, item.id, { hidden: !event.target.checked })}
                                  />
                                  Show
                                </label>
                                <label className="inline-flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={item.outOfStock}
                                    onChange={(event) => updateItem(section.id, item.id, { outOfStock: event.target.checked })}
                                  />
                                  Out of stock
                                </label>
                                <input
                                  className="min-w-[110px] flex-1 rounded-md border border-border px-2 py-1 text-xs"
                                  placeholder="Badge"
                                  value={item.badge}
                                  onChange={(event) => updateItem(section.id, item.id, { badge: event.target.value })}
                                />
                              </div>
                            </div>
                          )) : (
                            <p className="text-xs text-ink-faint">No items in this section.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'design' && (
                <div className="p-4 space-y-5">
                  <PanelTitle title="Choose a Template" />
                  <div className="grid grid-cols-2 gap-3">
                    {TEMPLATE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setTemplateId(option.id);
                          markUnsaved();
                        }}
                        className={`rounded-xl border p-2 text-left transition-all ${
                          templateId === option.id ? 'border-brand-500 shadow-card' : 'border-border hover:border-brand-200'
                        }`}
                      >
                        <div
                          className="h-24 rounded-lg border mb-2"
                          style={{
                            background: `linear-gradient(135deg, ${option.paper}, ${option.secondary})`,
                            borderColor: option.border,
                          }}
                        >
                          <div className="m-2 h-4 rounded-full" style={{ backgroundColor: option.primary }} />
                          <div className="mx-2 mt-2 h-10 rounded-md bg-white/80" />
                        </div>
                        <p className="text-xs font-semibold text-ink">{option.label}</p>
                      </button>
                    ))}
                  </div>

                  <PanelTitle title="Live Preview Size" />
                  <div className="grid grid-cols-4 rounded-lg border border-border bg-paper p-1">
                    {['fit', '50', '75', '100'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setZoom(value)}
                        className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
                          zoom === value ? 'bg-surface text-brand-600 shadow-sm' : 'text-ink-soft'
                        }`}
                      >
                        {value === 'fit' ? 'Fit' : `${value}%`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="p-4 space-y-5">
                  <PanelTitle title="Out of Stock Display" />
                  <select
                    className="input-field"
                    value={stockStyle}
                    onChange={(event) => {
                      setStockStyle(event.target.value);
                      markUnsaved();
                    }}
                  >
                    {STOCK_STYLES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <PanelTitle title="Poster Summary" />
                  <div className="grid grid-cols-2 gap-3">
                    <SummaryTile label="Sections" value={sections.length} />
                    <SummaryTile label="Visible Items" value={visibleItemCount} />
                    <SummaryTile label="Products" value={products?.length || 0} />
                    <SummaryTile label="Sets" value={productSets?.length || 0} />
                  </div>

                  <PanelTitle title="Export Options" />
                  <div className="space-y-3">
                    <select className="input-field" value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
                      <option value="png">PNG Image</option>
                      <option value="jpg">JPEG Image</option>
                    </select>
                    <select className="input-field" value={exportQuality} onChange={(event) => setExportQuality(event.target.value)}>
                      <option value="standard">Standard</option>
                      <option value="high">High</option>
                      <option value="print">Print Quality</option>
                    </select>
                    <button type="button" className="btn-primary w-full" onClick={handleExport}>
                      <Download size={16} /> Export Now
                    </button>
                  </div>
                </div>
              )}
            </aside>

            <main className="space-y-4">
              <FeatureStrip />
              <div className="card p-4 overflow-auto bg-paper/60">
                {visibleSections.length ? (
                  <div className="mx-auto pricelist-preview-shell" style={{ width: zoom === 'fit' ? 'min(100%, 760px)' : `${Number(zoom) * 7.6}px` }}>
                    <PosterPreview
                      info={info}
                      sections={visibleSections}
                      template={template}
                      stockStyle={stockStyle}
                    />
                  </div>
                ) : (
                  <EmptyState
                    icon={Image}
                    title="No visible sections"
                    description="Show at least one section to preview your pricelist poster."
                  />
                )}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function PosterPreview({ info, sections, template, stockStyle }) {
  const posterStyle = {
    '--pl-primary': template.primary,
    '--pl-secondary': template.secondary,
    '--pl-accent': template.accent,
    '--pl-ink': template.ink,
    '--pl-paper': template.paper,
    '--pl-panel': template.panel,
    '--pl-border': template.border,
    '--pl-radius': `${template.radius}px`,
    fontFamily: template.font,
  };

  return (
    <article className="pricelist-print-target relative overflow-hidden rounded-[var(--pl-radius)] border p-5 shadow-card" style={posterStyle}>
      <Decorations />
      <header className="relative z-10 rounded-3xl border bg-white/80 p-5 shadow-sm backdrop-blur" style={{ borderColor: template.border }}>
        <div className="grid gap-5 sm:grid-cols-[132px_1fr] sm:items-center">
          <BrandLogoCard logoDataUrl={info.logoDataUrl} logo={info.logo} template={template} />
          <div className="min-w-0 text-center sm:text-left">
            <p className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase text-white shadow-sm" style={{ backgroundColor: template.primary }}>
              <Sparkles size={13} /> PINC X MINT Pricelist <Sparkles size={13} />
            </p>
            <h1 className="mt-3 text-3xl sm:text-5xl font-black leading-none tracking-normal" style={{ color: template.primary }}>
              {info.title}
            </h1>
            <p className="mt-2 text-base font-semibold" style={{ color: template.ink }}>{info.subtitle}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2" style={{ color: template.ink }}>
          <InfoChip label="Location" value={info.location} secondaryLabel="Nearby Areas" secondaryValue={info.nearbyAreas} />
          <InfoChip label="Active Hours" value={info.activeHours} />
          <div className="sm:col-span-2">
            <InfoChip label="Shipping" value={info.services} />
          </div>
        </div>

        {info.promo?.visible && (
          <PromoBadge promo={info.promo} template={template} />
        )}
      </header>

      <div className="relative z-10 mt-4 grid gap-3 md:grid-cols-2">
        {sections.map((section) => {
          const items = section.items.filter((item) => !item.hidden && !(item.outOfStock && stockStyle === 'hide'));
          if (!items.length) return null;
          return (
            <section key={section.id} className="overflow-hidden rounded-2xl border bg-white/82 shadow-sm" style={{ borderColor: template.border }}>
              <div className="grid min-h-14 grid-cols-[28px_1fr_28px] items-center gap-2 px-3 py-2 text-sm font-black uppercase text-white" style={{ backgroundColor: template.primary }}>
                <span className="flex justify-center">
                  <SectionIcon type={section.icon} />
                </span>
                <span className="whitespace-pre-line text-center leading-snug">{section.title}</span>
                <span className="flex justify-center">
                  <SectionIcon type={section.icon} />
                </span>
              </div>
              <div className="p-3">
                {items.map((item) => {
                  const out = item.outOfStock;
                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[1fr_auto] gap-3 border-b border-dashed py-1.5 text-xs last:border-b-0 ${
                        out && stockStyle === 'fade' ? 'opacity-55' : ''
                      }`}
                      style={{ borderColor: template.border, color: template.ink }}
                    >
                      <div className="min-w-0">
                        <span className={`font-semibold ${out && stockStyle === 'strike' ? 'line-through' : ''}`}>{item.name}</span>
                        {item.badge && (
                          <span className="ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white" style={{ backgroundColor: out ? '#8B93A1' : template.accent }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className={`font-black tabular-nums ${out && stockStyle === 'strike' ? 'line-through' : ''}`}>
                        {formatCurrency(getItemPrice(item))}
                      </span>
                    </div>
                  );
                })}
                <div className="pt-2 text-center text-xs font-semibold tracking-[0.18em] opacity-45" style={{ color: template.ink }}>
                  ---------
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <footer className="relative z-10 mt-4 rounded-2xl px-4 py-3 text-center text-lg font-black uppercase text-white shadow-sm" style={{ backgroundColor: template.primary }}>
        {info.payment}
      </footer>
    </article>
  );
}

function Decorations() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
      <span className="absolute left-6 top-24 text-2xl text-[var(--pl-accent)]">♡</span>
      <span className="absolute right-8 top-20 text-xl text-[var(--pl-accent)]">✦</span>
      <span className="absolute bottom-20 left-10 text-xl text-[var(--pl-accent)]">✦</span>
      <span className="absolute bottom-28 right-12 text-2xl text-[var(--pl-accent)]">♡</span>
    </div>
  );
}

function BrandLogoCard({ logoDataUrl, logo, template }) {
  const settings = normalizeLogoSettings(logo);

  return (
    <div
      className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border bg-white/90 shadow-sm"
      style={{ borderColor: template.border }}
    >
      {logoDataUrl ? (
        <img
          src={logoDataUrl}
          alt=""
          className={`h-full w-full select-none ${settings.fit === 'contain' ? 'p-1.5' : ''}`}
          style={getLogoImageStyle(settings)}
          draggable="false"
        />
      ) : (
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: template.primary }}>
            <Upload size={20} />
          </div>
          <p className="text-xs font-black uppercase" style={{ color: template.ink }}>Upload Logo</p>
        </div>
      )}
    </div>
  );
}

function InfoChip({ label, value, secondaryLabel, secondaryValue }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/65 px-3 py-2 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide opacity-65">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-xs font-semibold leading-relaxed">{value}</p>
      {secondaryValue && (
        <div className="mt-3">
          {secondaryLabel && <p className="text-[10px] font-black uppercase tracking-wide opacity-65">{secondaryLabel}</p>}
          <p className="mt-0.5 whitespace-pre-line text-xs font-semibold leading-relaxed">{secondaryValue}</p>
        </div>
      )}
    </div>
  );
}

function PromoIcon({ icon }) {
  if (icon === 'gift') return <Gift size={15} />;
  if (icon === 'heart') return <span className="text-sm">♥</span>;
  return <Sparkles size={15} />;
}

function PromoBadge({ promo, template }) {
  return (
    <div
      className="mt-5 rounded-3xl border px-4 py-3 shadow-sm"
      style={{
        borderColor: template.border,
        background: `linear-gradient(135deg, ${promo.background || template.secondary}, rgba(255,255,255,0.9))`,
        color: template.ink,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: template.primary }}>
          <PromoIcon icon={promo.icon} />
        </div>
        <div className="min-w-0">
          <p className="whitespace-pre-line text-sm font-black leading-snug">{promo.title}</p>
          <p className="mt-0.5 whitespace-pre-line text-xs font-semibold leading-relaxed opacity-80">{promo.description}</p>
        </div>
      </div>
    </div>
  );
}

function LogoUploader({ logoDataUrl, logo, onUpload, onReset, onLogoChange }) {
  const settings = normalizeLogoSettings(logo);

  const handleChange = (event) => {
    onUpload(event.target.files?.[0]);
    event.target.value = '';
  };

  const handlePositionFromPointer = (event) => {
    if (!logoDataUrl) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onLogoChange({
      position: {
        x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
        y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
      },
    });
  };

  const nudgeLogo = (x, y) => {
    onLogoChange({
      position: {
        x: clamp(settings.position.x + x, 0, 100),
        y: clamp(settings.position.y + y, 0, 100),
      },
    });
  };

  return (
    <div
      className="rounded-xl border border-dashed border-border bg-paper/70 p-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onUpload(event.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${
            logoDataUrl ? 'cursor-crosshair' : 'cursor-pointer'
          }`}
          onClick={logoDataUrl ? handlePositionFromPointer : undefined}
          onPointerMove={(event) => {
            if (event.buttons === 1) handlePositionFromPointer(event);
          }}
          title={logoDataUrl ? 'Drag to reposition logo' : 'Upload logo'}
        >
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt=""
              className={`h-full w-full ${settings.fit === 'contain' ? 'p-1' : ''}`}
              style={getLogoImageStyle(settings)}
              draggable="false"
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-faint">
              <Upload size={18} />
              <span className="text-[10px] font-bold uppercase">Upload Logo</span>
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Brand Logo Card</p>
          <p className="mt-0.5 text-xs text-ink-soft">Drop a PNG, SVG, or JPG. Transparent logos are supported.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">
              <Upload size={14} /> {logoDataUrl ? 'Replace logo' : 'Upload logo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
            </label>
            {logoDataUrl && (
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={onReset}>
                <X size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {logoDataUrl && (
        <div className="mt-4 space-y-3 border-t border-border/70 pt-3">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Logo Fit</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'contain', label: 'Contain' },
                { value: 'cover', label: 'Fill/Cover' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    settings.fit === option.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-border bg-surface text-ink-soft hover:text-ink'
                  }`}
                  onClick={() => onLogoChange({ fit: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-soft">
              Zoom
              <span>{settings.zoom}%</span>
            </span>
            <input
              type="range"
              min={LOGO_ZOOM_MIN}
              max={LOGO_ZOOM_MAX}
              value={settings.zoom}
              onChange={(event) => onLogoChange({ zoom: Number(event.target.value) })}
              className="w-full accent-brand-500"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Position</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary h-8 w-8 p-0" onClick={() => nudgeLogo(0, -LOGO_POSITION_STEP)} title="Move logo up">
                <ArrowUp size={14} />
              </button>
              <button type="button" className="btn-secondary h-8 w-8 p-0" onClick={() => nudgeLogo(-LOGO_POSITION_STEP, 0)} title="Move logo left">
                <ArrowLeft size={14} />
              </button>
              <button type="button" className="btn-secondary h-8 w-8 p-0" onClick={() => nudgeLogo(LOGO_POSITION_STEP, 0)} title="Move logo right">
                <ArrowRight size={14} />
              </button>
              <button type="button" className="btn-secondary h-8 w-8 p-0" onClick={() => nudgeLogo(0, LOGO_POSITION_STEP)} title="Move logo down">
                <ArrowDown size={14} />
              </button>
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => onLogoChange({ zoom: 100, position: { x: 50, y: 50 } })}>
                Center
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelTitle({ title }) {
  return <h2 className="text-xs font-black uppercase tracking-wide text-ink-soft">{title}</h2>;
}

function InputField({ label, value, onChange, maxLength, textarea }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-soft">
        {label}
        {maxLength && <span>{value.length}/{maxLength}</span>}
      </span>
      {textarea ? (
        <textarea
          rows={3}
          className="input-field resize-none"
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="input-field"
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-paper p-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-1 text-xl font-black text-ink tabular-nums">{value}</p>
    </div>
  );
}

function FeatureStrip() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Fully Editable', 'Edit text, sections, prices, badges, and layout.'],
        ['Inventory Synced', 'Products load directly from inventory.'],
        ['Out of Stock', 'Strike, fade, or hide unavailable items.'],
        ['Export Ready', 'Print or save the poster as PDF from your browser.'],
      ].map(([title, description]) => (
        <div key={title} className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Sparkles size={16} />
          </div>
          <p className="text-sm font-black text-ink">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>
        </div>
      ))}
    </div>
  );
}
