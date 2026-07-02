import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Topbar from '../components/layout/Topbar';
import KpiCard from '../components/dashboard/KpiCard';
import { Spinner, ErrorBanner, EmptyState, Badge } from '../components/common/Primitives';
import ExpenseFormModal from '../components/financials/ExpenseFormModal';
import { useApiData } from '../hooks/useApiData';
import { financialsService } from '../api/services';
import { formatCurrency, formatDate } from '../utils/format';
import { DollarSign, TrendingUp, Wallet, Boxes } from 'lucide-react';

export default function Financials() {
  const [range, setRange] = useState('30d');
  const [formOpen, setFormOpen] = useState(false);

  const { data: dashboard, loading, error, reload: reloadDashboard } = useApiData(() => financialsService.dashboard(range), [range]);
  const { data: expenses, loading: expensesLoading, reload: reloadExpenses } = useApiData(() => financialsService.listExpenses(), []);

  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await financialsService.removeExpense(id);
      toast.success('Expense deleted');
      reloadExpenses();
      reloadDashboard();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExpenseSaved = () => {
    reloadExpenses();
    reloadDashboard();
  };

  return (
    <div>
      <Topbar
        title="Financial Dashboard"
        subtitle="Revenue, expenses, and profitability at a glance"
        actions={
          <>
            <div className="hidden sm:flex gap-1 bg-surface border border-border rounded-lg p-1">
              {['7d', '30d', '90d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    range === r ? 'bg-brand-500 text-white' : 'text-ink-soft hover:bg-paper'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setFormOpen(true)}>
              <Plus size={16} /> Record Expense
            </button>
          </>
        }
      />

      <div className="px-4 md:px-8 pb-8 flex flex-col gap-6">
        <ErrorBanner message={error?.message} />

        {loading && !dashboard ? (
          <Spinner label="Building your financial report…" />
        ) : (
          dashboard && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Revenue" value={formatCurrency(dashboard.kpis.total_revenue)} icon={DollarSign} tone="brand" />
                <KpiCard label="COGS" value={formatCurrency(dashboard.kpis.total_cogs)} icon={Boxes} tone="ink" />
                <KpiCard label="Expenses" value={formatCurrency(dashboard.kpis.total_expenses)} icon={Wallet} tone="rust" />
                <KpiCard label="Net Profit" value={formatCurrency(dashboard.kpis.net_profit)} icon={TrendingUp} tone="gold" />
              </div>

              <div className="card p-5">
                <h2 className="font-display font-semibold mb-1">Revenue vs. Profit</h2>
                <p className="text-sm text-ink-soft mb-2">Daily breakdown for the selected period</p>
                {dashboard.sales_trend.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboard.sales_trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EB" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { month: 'short', day: 'numeric' })} tick={{ fontSize: 12, fill: '#8B93A1' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} tick={{ fontSize: 12, fill: '#8B93A1' }} axisLine={false} tickLine={false} width={48} />
                      <Tooltip formatter={(v, n) => [formatCurrency(v), n === 'revenue' ? 'Revenue' : 'Profit']} labelFormatter={(d) => formatDate(d)} contentStyle={{ borderRadius: 10, border: '1px solid #E4E7EB', fontSize: 13 }} />
                      <Bar dataKey="revenue" fill="#2F6F4F" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="#C68A2E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-ink-faint py-12 text-center">No sales data for this period yet.</p>
                )}
              </div>
            </>
          )
        )}

        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="font-display font-semibold">Expenses</h2>
          </div>
          {expensesLoading ? (
            <Spinner />
          ) : !expenses?.length ? (
            <EmptyState icon={Receipt} title="No expenses recorded" description="Track rent, shipping, marketing, and other costs to see accurate net profit." />
          ) : (
            <table className="table-shell min-w-[600px]">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="font-medium text-ink">{e.description}</td>
                    <td><Badge>{e.category}</Badge></td>
                    <td className="text-ink-soft">{formatDate(e.expense_date)}</td>
                    <td className="tabular-nums font-medium">{formatCurrency(e.amount)}</td>
                    <td className="text-right">
                      <button onClick={() => handleDeleteExpense(e.id)} className="p-1.5 rounded-md text-ink-faint hover:text-rust-500 hover:bg-rust-50">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ExpenseFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleExpenseSaved} />
    </div>
  );
}
