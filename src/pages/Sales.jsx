import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Topbar from '../components/layout/Topbar';
import { Spinner, ErrorBanner } from '../components/common/Primitives';
import ProductPicker from '../components/sales/ProductPicker';
import CartPanel from '../components/sales/CartPanel';
import ProductSetQuickAccess from '../components/sales/ProductSetQuickAccess';
import ProductSetManagerModal from '../components/sales/ProductSetManagerModal';
import SalesHistoryTable from '../components/sales/SalesHistoryTable';
import { useApiData } from '../hooks/useApiData';
import { categoryService, productService, productSetsService, salesService } from '../api/services';

export default function Sales() {
  const [tab, setTab] = useState('pos');
  const [cart, setCart] = useState([]);
  const [setsOpen, setSetsOpen] = useState(false);

  const { data: products, reload: reloadProducts } = useApiData(() => productService.list({ pageSize: 200 }), []);
  const { data: categories } = useApiData(() => categoryService.list(), []);
  const { data: productSets, reload: reloadProductSets, loading: setsLoading } = useApiData(
    () => productSetsService.list(),
    [],
  );
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

  const addProductSet = (set) => {
    const currentQty = cart.reduce((acc, item) => {
      acc[item.id] = (acc[item.id] || 0) + item.qty;
      return acc;
    }, {});

    const missingItems = [];
    const outOfStock = [];

    const productLookup = (products || []).reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    const toAdd = (set.items || []).map((item) => {
      const product = productLookup[item.product_id];
      if (!product) missingItems.push(item.product_id);
      else if ((currentQty[item.product_id] || 0) + item.quantity > product.stock_quantity) {
        outOfStock.push({
          name: product.name,
          requested: (currentQty[item.product_id] || 0) + item.quantity,
          available: product.stock_quantity,
        });
      }
      return { product, quantity: item.quantity };
    });

    if (missingItems.length) {
      toast.error('This set includes products that are no longer available.');
      return;
    }
    if (outOfStock.length) {
      toast.error(
        `Not enough stock for: ${outOfStock.map((item) => `${item.name} (available ${item.available})`).join(', ')}`,
      );
      return;
    }

    setCart((prev) => {
      const merged = [...prev];
      toAdd.forEach(({ product, quantity }) => {
        const existing = merged.find((item) => item.id === product.id);
        if (existing) {
          existing.qty += quantity;
        } else {
          merged.push({
            id: product.id,
            name: product.name,
            costPrice: Number(product.cost_price),
            unitPrice: Number(product.selling_price),
            stock: product.stock_quantity,
            qty: quantity,
          });
        }
      });
      return merged;
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

  const handleReverseSale = async (order) => {
    const reason = window.prompt(
      `Reverse sale ${order.order_number}? Stock will be returned and this sale will be marked reversed.\n\nReason (optional):`,
      'Entry error',
    );
    if (reason === null) return;

    try {
      await salesService.reverse(order.id, { reason });
      toast.success('Sale reversed and stock restored');
      reloadOrders();
      reloadProducts();
    } catch (err) {
      toast.error(err.message);
    }
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
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <ProductSetQuickAccess
                  sets={productSets || []}
                  products={products || []}
                  loading={setsLoading}
                  onSelect={addProductSet}
                  onManage={() => setSetsOpen(true)}
                />
                <ProductPicker products={products} categories={categories || []} onSelect={addToCart} />
              </div>
              <div>
                <CartPanel
                  cart={cart}
                  products={products || []}
                  onUpdateQty={updateQty}
                  onUpdatePrice={updatePrice}
                  onRemove={removeItem}
                  onClear={() => setCart([])}
                  onCheckoutSuccess={handleCheckoutSuccess}
                />
              </div>
            </div>
            <ProductSetManagerModal
              open={setsOpen}
              onClose={() => setSetsOpen(false)}
              onSaved={() => {
                setSetsOpen(false);
                reloadProductSets();
              }}
              products={products || []}
              sets={productSets || []}
            />
          </>
        ) : (
          <div className="card overflow-x-auto">
            <ErrorBanner message={ordersError?.message} />
            {ordersLoading ? (
              <Spinner />
            ) : (
              <SalesHistoryTable orders={orders} loading={ordersLoading} onReverse={handleReverseSale} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
