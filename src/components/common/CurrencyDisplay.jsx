import React from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/currency';

/**
 * CurrencyDisplay - Formats and displays an amount in the current base currency
 * @param {number} amount - The amount to display
 * @param {string} originalCurrency - The original currency of the amount (for conversion)
 * @param {object} options - Display options
 */
export default function CurrencyDisplay({
  amount,
  originalCurrency = null,
  className = '',
  compact = false,
  showSymbolOnly = false,
  ...props
}) {
  const { baseCurrency, convertForDisplay, getCurrency, currencies } = useCurrency();

  if (typeof amount !== 'number' || isNaN(amount)) {
    return <span className={className}>-</span>;
  }

  // Convert amount if it's in a different currency
  const displayAmount = originalCurrency && originalCurrency !== baseCurrency
    ? convertForDisplay(amount, originalCurrency)
    : amount;

  // Get currency data for formatting
  const currency = getCurrency(baseCurrency);
  if (!currency) {
    return <span className={className}>{displayAmount.toFixed(2)}</span>;
  }

  // Just show symbol
  if (showSymbolOnly) {
    return <span className={className}>{currency.symbol}</span>;
  }

  // Format the display amount
  const formatted = formatCurrency(displayAmount, baseCurrency, currency);

  return (
    <span className={className} {...props}>
      {formatted}
    </span>
  );
}

/**
 * CurrencyBadge - Shows currency code in a badge
 */
export function CurrencyBadge({ currencyCode, className = '' }) {
  const { getCurrency } = useCurrency();
  const currency = getCurrency(currencyCode);

  if (!currency) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-ink-soft bg-opacity-10 text-xs font-medium text-ink ${className}`}>
      <span>{currency.symbol}</span>
      <span>{currency.code}</span>
    </span>
  );
}

/**
 * CurrencySymbol - Just displays the currency symbol
 */
export function CurrencySymbol({ currencyCode = null, className = '' }) {
  const { baseCurrency, getCurrency } = useCurrency();
  const currency = getCurrency(currencyCode || baseCurrency);

  if (!currency) return null;

  return <span className={className}>{currency.symbol}</span>;
}

/**
 * ConvertedAmount - Shows an amount with conversion indicator
 */
export function ConvertedAmount({
  amount,
  originalCurrency,
  className = '',
  showOriginal = false,
}) {
  const { baseCurrency, convertForDisplay, getCurrency } = useCurrency();

  if (typeof amount !== 'number' || isNaN(amount)) {
    return <span className={className}>-</span>;
  }

  if (originalCurrency === baseCurrency) {
    const currency = getCurrency(baseCurrency);
    return (
      <span className={className}>
        {formatCurrency(amount, baseCurrency, currency)}
      </span>
    );
  }

  const convertedAmount = convertForDisplay(amount, originalCurrency);
  const originCurrency = getCurrency(originalCurrency);
  const baseCurrencyData = getCurrency(baseCurrency);

  if (!originCurrency || !baseCurrencyData) return null;

  return (
    <span className={className}>
      {showOriginal && (
        <>
          <span className="opacity-60">
            {formatCurrency(amount, originalCurrency, originCurrency)}
          </span>
          {' → '}
        </>
      )}
      <span className="font-medium">
        {formatCurrency(convertedAmount, baseCurrency, baseCurrencyData)}
      </span>
    </span>
  );
}
