import React, { useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { Spinner, ErrorBanner, EmptyState, Badge } from '../components/common/Primitives';
import PurchaseOrderFormModal from '../components/incoming/PurchaseOrderFormModal';
import ReceiveOrderModal from '../components/incoming/ReceiveOrderModal';
import { useApiData } from '../hooks/useApiData';
import { incomingStockService, supplierService, productService } from '../api/services';
import { formatCurrency, formatDate } from '../utils/format';

const STATUS_TONE = { pending: 'warning', in_transit: 'warning', received: 'success', cancelled: 'danger' };

export default function IncomingStock() {
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: suppliers } = useApiData(() => supplierService.list(), []);
  const { data: products } = useApiData(() => productService.list({ pageSize: 200 }), []);
  const { data: orders, loading, error, reload } = useApiData(() => incomingStockService.list(statusFilter || undefined), [statusFilter]);

  const handleOpenOrder = async (order) => {
    const res = await incomingStockService.getOne(order.id);
    setSelectedOrder(res.data);
  };

  const refreshSelectedOrder = async () => {
    if (!selectedOrder?.id) return;
    const res = await incomingStockService.getOne(selectedOrder.id);
    setSelectedOrder(res.data);
  };

  const closeSelectedOrder = () => setSelectedOrder(null);

  return (
    <div>
      <Topbar
        title="Incoming Stock"
        subtitle="Track purchase orders and receive deliveries into inventory"
        actions={
          <button className="btn-primary" onClick={() => setFormOpen(true)}>
            <Plus size={16} /> New Purchase Order
          </button>
        }
      />

      <div className="px-4 md:px-8 pb-8 flex flex-col gap-4">
        <ErrorBanner message={error?.message} />

        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
          {[
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'in_transit', label: 'In Transit' },
            { value: 'received', label: 'Received' },
            { value: 'cancelled', label: 'Cancelled' },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === s.value ? 'bg-brand-500 text-white' : 'text-ink-soft hover:bg-paper'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="card overflow-x-auto">
          {loading ? (
            <Spinner />
          ) : !orders?.length ? (
            <EmptyState
              icon={Truck}
              title="No purchase orders yet"
              description="Create a purchase order to start tracking incoming deliveries."
              action={<button className="btn-primary" onClick={() => setFormOpen(true)}><Plus size={16} /> New Purchase Order</button>}
            />
          ) : (
            <table className="table-shell min-w-[700px]">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Expected Date</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-paper/50" onClick={() => handleOpenOrder(o)}>
                    <td className="font-medium text-ink">{o.supplier?.name}</td>
                    <td className="text-ink-soft">{o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}</td>
                    <td className="text-ink-soft">{formatDate(o.expected_date)}</td>
                    <td className="tabular-nums font-medium">{formatCurrency(o.total_cost)}</td>
                    <td><Badge tone={STATUS_TONE[o.status]}>{o.status.replace('_', ' ')}</Badge></td>
                    <td className="text-right text-brand-600 text-sm font-medium">View →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <PurchaseOrderFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} suppliers={suppliers} products={products} />
      <ReceiveOrderModal
        open={!!selectedOrder}
        onClose={closeSelectedOrder}
        order={selectedOrder}
        onReceived={() => {
          reload();
          closeSelectedOrder();
        }}
        onUpdated={refreshSelectedOrder}
      />
    </div>
  );
}
