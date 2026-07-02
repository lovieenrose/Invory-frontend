import React, { useState } from 'react';
import Topbar from '../components/layout/Topbar';
import { Spinner, ErrorBanner } from '../components/common/Primitives';
import ProductPicker from '../components/sales/ProductPicker';
import CartPanel from '../components/sales/CartPanel';
import SalesHistoryTable from '../components/sales/SalesHistoryTable';
import { useApiData } from '../hooks/useApiData';
import { productService, salesService } from '../api/services';

export default function Sales() {
  const [tab, setTab] = useState('pos');
  const [cart, setCart] = useState([]);

  const { data: products, reload: reloadProducts } = useApiData(() => productService.list({ pageSize: 200 }), []);
  const {
    data: orders,
    loading: ordersLoading,
    error: ordersError,
    reload: reloadOrders,
  } = useApiData(() => salesService.list({ pageSize: 50 }), [tab]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock_quantity) return prev;
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          costPrice: Number(product.cost_price),
          unitPrice: Number(product.selling_price),
          stock: product.stock_quantity,
          qty: 1,
        },
      ];
    });
  };

  const updateQty = (id, qty) => setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  const updatePrice = (id, unitPrice) => setCart((prev) => prev.map((i) => (i.id === id ? { ...i, unitPrice } : i)));
  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const handleCheckoutSuccess = () => {
    setCart([]);
    reloadProducts();
    reloadOrders();
  };

  return (
    <div>
      <Topbar
        title="Sales / POS"
        subtitle="Check out orders and review your sales history"
        actions={
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            {[
              { value: 'pos', label: 'New Sale' },
              { value: 'history', label: 'History' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  tab === t.value ? 'bg-brand-500 text-white' : 'text-ink-soft hover:bg-paper'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-4 md:px-8 pb-8">
        {tab === 'pos' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ProductPicker products={products} onSelect={addToCart} />
            </div>
            <div>
              <CartPanel
                cart={cart}
                onUpdateQty={updateQty}
                onUpdatePrice={updatePrice}
                onRemove={removeItem}
                onCheckoutSuccess={handleCheckoutSuccess}
              />
            </div>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <ErrorBanner message={ordersError?.message} />
            {ordersLoading ? <Spinner /> : <SalesHistoryTable orders={orders} loading={ordersLoading} />}
          </div>
        )}
      </div>
    </div>
  );
}
