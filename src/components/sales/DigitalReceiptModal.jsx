import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Download, X } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import {
  buildReceiptDocument,
  renderReceiptPng,
  downloadDataUrl,
  INVOICE_BANNER_URL,
} from '../../utils/salesDocuments';

const INVOICE_BANNER_STORAGE_KEY = 'invory:invoice-banner:v1';

function fmtReceiptDateJS(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(value));
  } catch { return String(value); }
}

function loadBannerUrl() {
  try { return localStorage.getItem(INVOICE_BANNER_STORAGE_KEY) || INVOICE_BANNER_URL; } catch { return INVOICE_BANNER_URL; }
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function DigitalReceiptPreview({ receipt, bannerUrl }) {
  const infoRows = [
    ['Receipt Date', fmtReceiptDateJS(receipt.receiptDate)],
    ['Receipt Number', receipt.receiptNumber],
    ['Invoice Number', receipt.invoiceNumber],
    ['Payment Method', receipt.paymentMethod],
    ['Payment Status', receipt.paymentStatus],
    ['Reference Number', receipt.referenceNumber || '—'],
  ];

  return (
    <div style={{ background: '#FFF7FB', padding: '20px', borderRadius: '16px' }}>
      <div style={{
        background: '#FFFFFF',
        border: '2px solid #FFB5D5',
        borderRadius: '16px',
        overflow: 'hidden',
        fontFamily: '"Inter", system-ui, Arial, sans-serif',
        boxShadow: '0 4px 24px rgba(255,79,154,0.08)',
      }}>

        {/* ── Dual Banner Row ───────────────────────────────────────────────── */}
        <div style={{ padding: '20px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left banner */}
          <div style={{ height: '60px', width: '200px', flexShrink: 0 }}>
            <img
              src={bannerUrl || INVOICE_BANNER_URL}
              alt="lovieNglow"
              style={{ height: '100%', width: '100%', objectFit: 'contain', objectPosition: 'left center' }}
            />
          </div>
          {/* Right banner */}
          <div style={{ height: '60px', width: '200px', flexShrink: 0 }}>
            <img
              src={bannerUrl || INVOICE_BANNER_URL}
              alt="lovieNglow"
              style={{ height: '100%', width: '100%', objectFit: 'contain', objectPosition: 'right center' }}
            />
          </div>
        </div>

        {/* ── Amount Received Card (below left banner) ─────────────────────── */}
        <div style={{ padding: '14px 32px 0' }}>
          <div style={{
            width: '200px',
            background: 'linear-gradient(150deg, #FF6FAD 0%, #FF4F9A 55%)',
            borderRadius: '12px',
            padding: '14px 16px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 6px 18px rgba(255,79,154,0.30)',
          }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.82)', fontWeight: 600, margin: 0, textAlign: 'center' }}>
              Amount Received
            </p>
            <div style={{ width: '80%', height: '1px', background: 'rgba(255,255,255,0.25)', margin: '6px auto' }} />
            <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: 900, margin: 0, textAlign: 'center', lineHeight: 1.2 }}>
              {formatCurrency(receipt.amountReceived)}
            </p>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '100px', padding: '2px 10px', marginTop: '8px' }}>
              <p style={{ fontSize: '9px', color: '#FFFFFF', fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>✓ PAID</p>
            </div>
          </div>
        </div>

        {/* Divider 1 */}
        <div style={{ height: '1px', background: '#FFDDE8', margin: '18px 32px 0' }} />

        {/* ── Title ─────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '16px 32px 12px' }}>
          <p style={{ fontSize: '21px', fontWeight: 900, color: '#1F2937', margin: 0, letterSpacing: '0.07em' }}>
            DIGITAL RECEIPT
          </p>
        </div>

        {/* Divider 2 */}
        <div style={{ height: '1px', background: '#FFDDE8', margin: '0 32px' }} />

        {/* ── Payment Info — 2-column grid ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', padding: '20px 32px 18px' }}>
          {infoRows.map(([label, value]) => (
            <div key={label} style={{ marginBottom: '13px' }}>
              <p style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{label}</p>
              <p style={{ fontSize: '13px', color: '#111827', fontWeight: 700, margin: '2px 0 0', lineHeight: 1.4 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Divider 3 */}
        <div style={{ height: '1px', background: '#FFDDE8', margin: '0 32px' }} />


        {/* ── Received From ─────────────────────────────────────────────────── */}
        <div style={{ padding: '18px 32px 16px' }}>
          <p style={{ fontSize: '9px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 5px' }}>
            Received From
          </p>
          <p style={{ fontSize: '15px', color: '#111827', fontWeight: 800, margin: 0 }}>
            {receipt.customerName}
          </p>
        </div>

        {/* Divider 4 */}
        <div style={{ height: '1px', background: '#FFDDE8', margin: '0 32px' }} />

        {/* ── Payment For Table ─────────────────────────────────────────────── */}
        <div style={{ padding: '18px 32px 24px' }}>
          <p style={{ fontSize: '14px', color: '#111827', fontWeight: 800, margin: '0 0 12px' }}>
            Payment For
          </p>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #FFDDE8' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#FF4F9A' }}>
                  {['Invoice Number', 'Invoice Date', 'Invoice Amount', 'Payment Amount', 'Balance'].map((h, i) => (
                    <th key={h} style={{
                      color: '#FFFFFF', fontWeight: 700, padding: '10px 11px',
                      textAlign: i === 0 ? 'left' : 'right',
                      fontSize: '10px', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipt.invoiceRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#FFF7FB' : '#FFFFFF' }}>
                    {[
                      row.invoiceNumber,
                      fmtReceiptDateJS(row.invoiceDate),
                      formatCurrency(row.invoiceAmount),
                      formatCurrency(row.paymentAmount),
                      formatCurrency(row.balance),
                    ].map((val, ci) => (
                      <td key={ci} style={{
                        padding: '10px 11px',
                        color: '#111827',
                        fontWeight: ci === 0 ? 600 : 400,
                        textAlign: ci === 0 ? 'left' : 'right',
                        borderTop: '1px solid #FFDDE8',
                        whiteSpace: 'nowrap',
                      }}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #FFDDE8', padding: '16px 32px 22px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#FF4F9A', fontWeight: 800, margin: '0 0 4px' }}>
            Thank you for choosing lovieNglow.
          </p>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
            This serves as your official digital receipt.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function DigitalReceiptModal({ order, onClose }) {
  const [generating, setGenerating] = useState(false);
  const bannerUrl = useMemo(loadBannerUrl, []);
  const receipt = useMemo(() => buildReceiptDocument(order), [order]);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const png = await renderReceiptPng(receipt, bannerUrl);
      downloadDataUrl(png, `${receipt.receiptNumber}.png`);
    } catch {
      toast.error('Could not generate receipt PNG. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink/50 px-4 py-8">
      <div className="mx-auto flex min-h-full max-w-2xl items-start justify-center">
        <div className="my-8 w-full rounded-2xl border border-border bg-surface shadow-card">

          {/* Modal header */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">Digital Receipt</h3>
              <p className="text-sm text-ink-soft">
                {receipt.receiptNumber} · {receipt.customerName}
              </p>
            </div>
            <button type="button" className="p-1.5 text-ink-faint hover:text-ink" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Preview */}
          <div className="overflow-auto bg-paper/40 p-1">
            <DigitalReceiptPreview receipt={receipt} bannerUrl={bannerUrl} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
            <p className="text-xs text-ink-faint">
              Optimized for sharing via Messenger, Instagram, Discord, and other platforms.
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleDownload}
                disabled={generating}
              >
                <Download size={15} />
                {generating ? 'Generating…' : 'Download PNG'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
