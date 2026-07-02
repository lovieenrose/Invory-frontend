import React from 'react';

const TONE_STYLES = {
  brand: 'bg-brand-50 text-brand-600',
  rust: 'bg-rust-50 text-rust-500',
  gold: 'bg-gold-50 text-gold-500',
  ink: 'bg-paper text-ink-soft',
};

export default function KpiCard({ label, value, icon: Icon, tone = 'brand', trend, hint }) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONE_STYLES[tone]}`}>
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>
      <div className="font-display text-2xl font-semibold text-ink tabular-nums">{value}</div>
      {(trend || hint) && (
        <p className={`text-xs ${trend?.positive ? 'text-brand-600' : trend ? 'text-rust-500' : 'text-ink-faint'}`}>
          {trend ? trend.label : hint}
        </p>
      )}
    </div>
  );
}
