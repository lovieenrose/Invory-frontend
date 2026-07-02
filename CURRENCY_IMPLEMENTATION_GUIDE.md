# Global Currency Management System - Implementation Guide

## Overview

This document provides comprehensive instructions for integrating the global currency management system across the Invory application. The system supports multiple currencies with two display modes: **Display Only** and **Automatic Currency Conversion**.

## Architecture

### Database Schema
- `supported_currencies` - List of available currencies (PHP, USD, EUR, SGD, JPY, KRW)
- `system_settings` - Global app settings (base currency, display mode)
- `exchange_rates` - Historical exchange rates updated hourly
- Multi-currency columns added to all transaction tables for audit trail

### Backend Modules
- `/api/currencies` - Currency management endpoints
- `/api/settings` - System settings endpoints
- Exchange rate service - Automatic rate fetching and caching

### Frontend
- `CurrencyContext` - Global currency state management
- `CurrencyDisplay` components - Reusable currency formatting components
- `currency.js` utilities - Formatting functions
- Settings page - Admin interface for currency configuration

## Integration Steps

### 1. Database Migration

Run the migration scripts on Supabase SQL editor in this order:
```sql
-- 1. Run: supabase/currency_migration.sql
-- 2. Run: supabase/currency_policies.sql
```

This creates:
- `supported_currencies` table with 6 currencies
- `system_settings` table with defaults
- `exchange_rates` table for rate caching
- Multi-currency columns on transaction tables

### 2. Backend Integration

The backend is already configured. Routes automatically registered:
- `GET /api/currencies` - List all supported currencies
- `GET /api/currencies/:code` - Get specific currency
- `GET /api/currencies/rates/latest` - Get latest exchange rates
- `GET /settings` - Get system settings
- `PUT /settings` - Update system settings
- `GET /settings/convert` - Convert amount between currencies

Exchange rates are automatically fetched every 60 minutes from exchangerate-api.com.

### 3. Frontend Setup

#### Step 1: Wrap App with CurrencyProvider
Already done in `src/App.jsx`:
```jsx
import { CurrencyProvider } from './context/CurrencyContext';

<CurrencyProvider>
  <AppLayout>
    {/* Routes */}
  </AppLayout>
</CurrencyProvider>
```

#### Step 2: Use Currency Hook in Components

```jsx
import { useCurrency } from '../context/CurrencyContext';

export default function MyComponent() {
  const { baseCurrency, formatAmount, getCurrency } = useCurrency();
  
  return (
    <div>
      <p>Base: {baseCurrency}</p>
      <p>Formatted: {formatAmount(1000)}</p>
    </div>
  );
}
```

#### Step 3: Display Currency Values

Use the `CurrencyDisplay` component:
```jsx
import CurrencyDisplay, { CurrencyBadge, CurrencySymbol } from '../components/common/CurrencyDisplay';

// Basic usage
<CurrencyDisplay amount={1500} originalCurrency="USD" />
// Output: $1,500.00 (or converted if in different base currency)

// Just the symbol
<CurrencySymbol currencyCode="PHP" />
// Output: ₱

// Badge
<CurrencyBadge currencyCode="EUR" />
// Output: € EUR

// Show original + converted
<ConvertedAmount 
  amount={100} 
  originalCurrency="USD"
  showOriginal={true}
/>
// Output: $100.00 → ₱5,000.00
```

## Example: Adding Currency to Dashboard

### Current Dashboard (products.jsx):
```jsx
export const productService = {
  list: (params) => api.get('/products', { params }),
  // etc...
};
```

### Updated with Currency Display:
```jsx
import CurrencyDisplay from '../components/common/CurrencyDisplay';
import { useCurrency } from '../context/CurrencyContext';

export default function Dashboard() {
  const { baseCurrency, formatAmount } = useCurrency();
  const [products, setProducts] = useState([]);

  return (
    <div>
      <table>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>
                <CurrencyDisplay 
                  amount={product.cost_price}
                  originalCurrency={product.original_currency}
                />
              </td>
              <td>
                <CurrencyDisplay 
                  amount={product.selling_price}
                  originalCurrency={product.original_currency}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Example: Integrating Across Modules

### 1. Inventory Module (Products)
```jsx
// In ProductFormModal.jsx
import { useCurrency } from '../context/CurrencyContext';

export default function ProductFormModal() {
  const { baseCurrency } = useCurrency();
  
  return (
    <form>
      <label>Cost Price ({baseCurrency})</label>
      <input type="number" name="cost_price" />
      
      <label>Selling Price ({baseCurrency})</label>
      <input type="number" name="selling_price" />
    </form>
  );
}
```

### 2. Sales Module
```jsx
// In CartPanel.jsx
import CurrencyDisplay from '../components/common/CurrencyDisplay';

export default function CartPanel({ items }) {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  
  return (
    <div>
      <h3>Cart Total</h3>
      <p className="text-2xl font-bold">
        <CurrencyDisplay amount={total} />
      </p>
    </div>
  );
}
```

### 3. Financial Module
```jsx
// In ExpenseFormModal.jsx
import { useCurrency } from '../context/CurrencyContext';

export default function ExpenseFormModal() {
  const { baseCurrency, formatAmount } = useCurrency();
  
  return (
    <form>
      <label>Amount ({baseCurrency})</label>
      <input type="number" name="amount" />
      
      <p>Formatted: {formatAmount(formData.amount)}</p>
    </form>
  );
}
```

## Utility Functions Reference

### formatCurrency(amount, currencyCode, currencyData)
Formats amount with proper currency symbol and locale.
```jsx
import { formatCurrency } from '../utils/currency';

formatCurrency(1500, 'PHP'); // ₱1,500.00
formatCurrency(1500, 'USD'); // $1,500.00
```

### formatNumber(amount, decimalPlaces)
Format without currency symbol.
```jsx
import { formatNumber } from '../utils/currency';

formatNumber(1500.5, 2); // 1,500.50
```

### formatCurrencyCompact(amount, currencyCode, options)
Abbreviate large numbers.
```jsx
import { formatCurrencyCompact } from '../utils/currency';

formatCurrencyCompact(1500000, 'USD', { abbreviate: true }); // $1.5M
```

### parseCurrency(formatted)
Parse formatted string back to number.
```jsx
import { parseCurrency } from '../utils/currency';

parseCurrency('$1,500.00'); // 1500
```

## Display Modes Explained

### Display Only Mode (Default)
- Only changes the currency symbol and formatting
- All stored values remain in their original currency
- Fastest performance, no API calls needed
- Best for: Multi-currency businesses viewing in different formats

**Example**: Product cost stored as $100 (USD) displays as ₱5,000 formatted in Philippine Peso symbol, but actual stored value remains USD 100.

### Automatic Currency Conversion Mode
- Converts monetary values using latest exchange rates
- Original values preserved in database for accounting
- Exchange rates updated hourly automatically
- Best for: International reporting, unified financial statements

**Example**: Product cost stored as $100 (USD) automatically converts and displays as ₱5,000 (PHP) based on current exchange rate.

## Testing the System

### 1. Test Currency Selection
1. Navigate to Settings page (`/settings`)
2. Select different currencies
3. Verify the UI updates properly
4. Select Display Only mode
5. Select Automatic Conversion mode
6. Save changes

### 2. Test Currency Display
1. Create a product with cost/selling prices
2. Go to Inventory
3. Verify prices display in correct currency format
4. Change currency in Settings
5. Verify display updates accordingly

### 3. Test Exchange Rates
1. Check browser console for exchange rate fetch logs
2. Verify rates are cached in database
3. Monitor `/api/exchange-rates` endpoint
4. Confirm rates update every 60 minutes

## Database Backup Considerations

When changing base currency or display mode:
1. Original transaction values are preserved in `*_original` columns
2. Audit trail is maintained for compliance
3. No data loss occurs
4. Historical conversion rates are available for reconciliation

## Performance Optimization

### Caching Strategy
- Exchange rates cached in database
- Updated every 60 minutes from API
- Fallback to last known rate if API unavailable
- No real-time API calls during conversions

### Lazy Loading
- CurrencyProvider loads data on first render
- Exchange rates fetched asynchronously
- Components render while data loads
- Error states handled gracefully

## Future Enhancements

1. **Multi-Currency Transactions**
   - Accept payments in multiple currencies
   - Store each transaction in original currency + base currency

2. **Custom Exchange Rates**
   - Admin override for manual rates
   - Apply custom rates for specific date ranges

3. **Currency Conversion History**
   - Track rate changes over time
   - Generate conversion reports

4. **Per-Business Base Currency**
   - Each business profile has own base currency
   - Support for true multi-tenant scenarios

5. **Real-time Rate Updates**
   - WebSocket for live rate changes
   - Notification when rates change significantly

## Troubleshooting

### Rates not updating
1. Check exchange rate service logs in backend console
2. Verify exchangerate-api.com is accessible
3. Check system_settings.rates_last_updated timestamp
4. Manually trigger: `POST /api/settings/exchange-rates`

### Currency not displaying
1. Verify currencies are loaded in CurrencyContext
2. Check if getCurrency() returns valid currency data
3. Inspect CurrencyDisplay component props
4. Check browser console for errors

### Conversion showing incorrect values
1. Verify exchange rates in database are current
2. Check display_mode setting in system_settings
3. Confirm exchangeRates are loaded in context
4. Test with formatCurrency utility directly

## Support

For issues or questions about the currency system:
1. Check implementation guide above
2. Review example components in this document
3. Inspect CurrencyContext and utilities
4. Check backend API logs for errors
