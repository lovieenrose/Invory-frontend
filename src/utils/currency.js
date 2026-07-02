/**
 * Currency Formatting Utilities
 * Provides consistent currency formatting across the application
 */

/**
 * Format amount with currency symbol and locale
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - ISO currency code (e.g., 'PHP', 'USD')
 * @param {object} currencyData - Currency configuration from supported_currencies table
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currencyCode = 'PHP', currencyData = null) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }

  // Default currency data if not provided
  const defaults = {
    PHP: { symbol: '₱', locale: 'fil-PH', decimal_places: 2 },
    USD: { symbol: '$', locale: 'en-US', decimal_places: 2 },
    EUR: { symbol: '€', locale: 'de-DE', decimal_places: 2 },
    SGD: { symbol: 'S$', locale: 'en-SG', decimal_places: 2 },
    JPY: { symbol: '¥', locale: 'ja-JP', decimal_places: 0 },
    KRW: { symbol: '₩', locale: 'ko-KR', decimal_places: 0 },
  };

  const config = currencyData || defaults[currencyCode] || defaults.USD;

  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: config.decimal_places,
      maximumFractionDigits: config.decimal_places,
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback if locale not supported
    console.warn(`Failed to format ${currencyCode} with locale ${config.locale}:`, error);
    return `${config.symbol}${amount.toFixed(config.decimal_places)}`;
  }
}

/**
 * Format number with thousands separator and decimal places
 * @param {number} amount - The amount to format
 * @param {number} decimalPlaces - Number of decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(amount, decimalPlaces = 2) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}

/**
 * Get currency symbol
 * @param {string} currencyCode - ISO currency code
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currencyCode) {
  const symbols = {
    PHP: '₱',
    USD: '$',
    EUR: '€',
    SGD: 'S$',
    JPY: '¥',
    KRW: '₩',
  };
  return symbols[currencyCode] || currencyCode;
}

/**
 * Parse formatted currency string back to number
 * @param {string} formatted - Formatted currency string
 * @returns {number} Parsed amount
 */
export function parseCurrency(formatted) {
  if (!formatted || typeof formatted !== 'string') {
    return 0;
  }

  // Remove currency symbols and non-numeric characters (except . and -)
  const cleaned = formatted.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format large numbers with abbreviations (e.g., 1.2M, 45K)
 * @param {number} amount - The amount to format
 * @param {number} decimalPlaces - Number of decimal places
 * @returns {string} Abbreviated number
 */
export function formatLargeNumber(amount, decimalPlaces = 1) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0';
  }

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 1_000_000) {
    return sign + (absAmount / 1_000_000).toFixed(decimalPlaces) + 'M';
  }
  if (absAmount >= 1_000) {
    return sign + (absAmount / 1_000).toFixed(decimalPlaces) + 'K';
  }
  return sign + amount.toFixed(2);
}

/**
 * Format currency for display with optional conversion
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - ISO currency code
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export function formatCurrencyCompact(amount, currencyCode = 'PHP', options = {}) {
  const { abbreviate = false, currencyData = null } = options;

  if (abbreviate && Math.abs(amount) >= 1_000) {
    const symbol = currencyData?.symbol || getCurrencySymbol(currencyCode);
    const abbreviated = formatLargeNumber(amount, 1);
    return `${symbol}${abbreviated}`;
  }

  return formatCurrency(amount, currencyCode, currencyData);
}

/**
 * Get locale date formatter for currency locale
 * @param {string} locale - Locale string (e.g., 'en-US')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {object} Date formatter
 */
export function getDateFormatter(locale = 'en-US', options = {}) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Build a currency table row formatter
 * @param {array} currencies - Supported currencies array
 * @returns {function} Formatter function
 */
export function createCurrencyTableFormatter(currencies) {
  return (amount, currencyCode) => {
    const currency = currencies.find((c) => c.code === currencyCode);
    return formatCurrency(amount, currencyCode, currency);
  };
}

export default {
  formatCurrency,
  formatNumber,
  getCurrencySymbol,
  parseCurrency,
  formatLargeNumber,
  formatCurrencyCompact,
  getDateFormatter,
  createCurrencyTableFormatter,
};
