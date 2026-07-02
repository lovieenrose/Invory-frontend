import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency, formatDate } from '../../utils/format';
import { EmptyState } from '../common/Primitives';
import { TrendingUp } from 'lucide-react';

export default function SalesTrendChart({ data = [] }) {
  if (!data.length) {
    return <EmptyState icon={TrendingUp} title="No sales yet" description="Your sales trend will appear here once you complete your first order." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F6F4F" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#2F6F4F" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C68A2E" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#C68A2E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EB" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(d, { month: 'short', day: 'numeric' })}
          tick={{ fontSize: 12, fill: '#8B93A1' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          tick={{ fontSize: 12, fill: '#8B93A1' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value, name) => [formatCurrency(value), name === 'revenue' ? 'Revenue' : 'Profit']}
          labelFormatter={(d) => formatDate(d)}
          contentStyle={{ borderRadius: 10, border: '1px solid #E4E7EB', fontSize: 13 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#2F6F4F" strokeWidth={2} fill="url(#revenueGradient)" />
        <Area type="monotone" dataKey="profit" stroke="#C68A2E" strokeWidth={2} fill="url(#profitGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
