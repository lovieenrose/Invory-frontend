import React from 'react';
import { Receipt } from 'lucide-react';
import { EmptyState, Badge } from '../common/Primitives';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function SalesHistoryTable({ orders, loading }) {
  if (!loading && !orders?.length) {
    return <EmptyState icon={Receipt} title="No sales yet" description="Completed sales will appear here with full profit breakdowns." />;
  }

  return (
    <table className="table-shell min-w-[750px]">
      <thead>
        <tr>
          <th>Order #</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Items</th>
          <th>Revenue</th>
          <th>COGS</th>
          <th>Profit</th>
          <th>Margin</th>
        </tr>
      </thead>
      <tbody>
        {orders?.map((o) => (
          <tr key={o.id}>
            <td className="font-medium text-ink">{o.order_number}</td>
            <td className="text-ink-soft">{o.customer_name || 'Walk-in'}</td>
            <td className="text-ink-soft">{formatDateTime(o.created_at)}</td>
            <td className="text-ink-soft">{o.items?.length || 0}</td>
            <td className="tabular-nums font-medium">{formatCurrency(o.total)}</td>
            <td className="tabular-nums text-ink-soft">{formatCurrency(o.total_cost)}</td>
            <td className="tabular-nums text-brand-600 font-medium">{formatCurrency(o.gross_profit)}</td>
            <td>
              <Badge tone={o.margin_pct >= 30 ? 'success' : o.margin_pct >= 10 ? 'warning' : 'danger'}>{o.margin_pct}%</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
