import React, { useState } from 'react';
import { DollarSign, TrendingUp, Wallet, Boxes, ShoppingBag, Truck, AlertTriangle } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import KpiCard from '../components/dashboard/KpiCard';
import SalesTrendChart from '../components/dashboard/SalesTrendChart';
import TopProductsList from '../components/dashboard/TopProductsList';
import LowStockList from '../components/dashboard/LowStockList';
import { Spinner, ErrorBanner } from '../components/common/Primitives';
import { useApiData } from '../hooks/useApiData';
import { financialsService } from '../api/services';
import { formatCurrency, formatNumber } from '../utils/format';

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export default function Dashboard() {
  const [range, setRange] = useState('30d');
  const { data, loading, error } = useApiData(() => financialsService.dashboard(range), [range]);

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle="Your business at a glance"
        actions={
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r.value ? 'bg-brand-500 text-white' : 'text-ink-soft hover:bg-paper'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-4 md:px-8 pb-8 flex flex-col gap-6">
        <ErrorBanner message={error?.message} />

        {loading && !data ? (
          <Spinner label="Crunching your numbers…" />
        ) : (
          data && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Revenue" value={formatCurrency(data.kpis.total_revenue)} icon={DollarSign} tone="brand" />
                <KpiCard label="Net Profit" value={formatCurrency(data.kpis.net_profit)} icon={TrendingUp} tone="gold" />
                <KpiCard label="Total Expenses" value={formatCurrency(data.kpis.total_expenses)} icon={Wallet} tone="ink" />
                <KpiCard label="Inventory Value" value={formatCurrency(data.kpis.inventory_value)} icon={Boxes} tone="brand" />
                <KpiCard label="Total Orders" value={formatNumber(data.kpis.total_orders)} icon={ShoppingBag} tone="ink" />
                <KpiCard label="Pending Deliveries" value={formatNumber(data.kpis.pending_deliveries)} icon={Truck} tone="gold" />
                <KpiCard
                  label="Low Stock Alerts"
                  value={formatNumber(data.kpis.low_stock_count)}
                  icon={AlertTriangle}
                  tone={data.kpis.low_stock_count > 0 ? 'rust' : 'brand'}
                />
                <KpiCard label="Gross Profit" value={formatCurrency(data.kpis.gross_profit)} icon={TrendingUp} tone="brand" />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card p-5 lg:col-span-2">
                  <h2 className="font-display font-semibold mb-1">Sales Trend</h2>
                  <p className="text-sm text-ink-soft mb-2">Revenue and profit over time</p>
                  <SalesTrendChart data={data.sales_trend} />
                </div>
                <div className="card p-5">
                  <h2 className="font-display font-semibold mb-1">Low Stock Alerts</h2>
                  <p className="text-sm text-ink-soft mb-3">Products at or below reorder level</p>
                  <LowStockList items={data.low_stock_items} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h2 className="font-display font-semibold mb-1">Top Selling Products</h2>
                  <p className="text-sm text-ink-soft mb-4">By units sold in this period</p>
                  <TopProductsList products={data.top_products} />
                </div>
                <div className="card p-5">
                  <h2 className="font-display font-semibold mb-1">Expense Breakdown</h2>
                  <p className="text-sm text-ink-soft mb-4">Where your money is going</p>
                  <ExpenseBreakdown data={data.expense_by_category} />
                </div>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

function ExpenseBreakdown({ data = {} }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (!entries.length) {
    return <p className="text-sm text-ink-faint py-8 text-center">No expenses recorded for this period.</p>;
  }

  const colors = ['#2F6F4F', '#C68A2E', '#3E5C76', '#B5482A', '#4A8B67', '#8B93A1'];

  return (
    <div className="flex flex-col gap-3">
      {entries.map(([category, amount], i) => (
        <div key={category}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="capitalize text-ink font-medium">{category}</span>
            <span className="text-ink-soft tabular-nums">{formatCurrency(amount)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-paper overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(amount / total) * 100}%`, backgroundColor: colors[i % colors.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
