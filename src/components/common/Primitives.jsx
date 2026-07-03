import React from 'react';
import { Loader2, Inbox, X } from 'lucide-react';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 text-ink-soft py-16">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-paper border border-border flex items-center justify-center mb-4">
        <Icon size={20} className="text-ink-faint" />
      </div>
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="text-sm text-ink-soft mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-rust-50 text-rust-600 text-sm px-4 py-3 border border-rust-500/20">{message}</div>
  );
}

export function Modal({ open, onClose, title, children, wide, size }) {
  if (!open) return null;
  const maxWidth = size === 'xl' ? 'md:max-w-4xl' : wide ? 'md:max-w-2xl' : 'md:max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-surface w-full ${maxWidth} md:rounded-xl rounded-t-2xl shadow-popover max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-ink-faint hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ tone = 'default', children }) {
  const tones = {
    default: 'bg-paper text-ink-soft border border-border',
    success: 'bg-brand-50 text-brand-600',
    warning: 'bg-gold-50 text-gold-500',
    danger: 'bg-rust-50 text-rust-500',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}
