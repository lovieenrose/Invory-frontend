import React from 'react';
import { Package } from 'lucide-react';

export default function Topbar({ title, subtitle, actions }) {
  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-border">
      <div className="md:hidden flex items-center gap-2 px-4 h-14 border-b border-border bg-surface">
        <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
          <Package size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-display font-semibold">Invory</span>
      </div>
      <div className="flex items-center justify-between gap-4 px-4 md:px-8 py-5">
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-semibold text-ink truncate">{title}</h1>
          {subtitle && <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
