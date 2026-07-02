import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { currencyService } from '../api/services';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [baseCurrency, setBaseCurrency] = useState('PHP');
  const [displayMode, setDisplayMode] = useState('display_only');
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load supported currencies
        const currenciesRes = await currencyService.listCurrencies();
        setCurrencies(currenciesRes.currencies || []);

        // Load system settings
        const settingsRes = await currencyService.getSystemSettings();
        setBaseCurrency(settingsRes.settings.base_currency);
        setDisplayMode(settingsRes.settings.display_mode);

        // Load latest exchange rates
        const toCurrencies = (currenciesRes.currencies || [])
          .map((c) => c.code)
          .filter((c) => c !== settingsRes.settings.base_currency)
          .join(',');

        if (toCurrencies) {
          const ratesRes = await currencyService.getLatestRates(
            settingsRes.settings.base_currency,
            toCurrencies
          );
          setExchangeRates(ratesRes.rates || {});
        }

        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load currency settings');
        console.error('Currency context error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update base currency and display mode
  const updateSettings = useCallback(async (newBaseCurrency, newDisplayMode) => {
    try {
      const res = await currencyService.updateSystemSettings({
        base_currency: newBaseCurrency,
        display_mode: newDisplayMode,
      });

      setBaseCurrency(res.settings.base_currency);
      setDisplayMode(res.settings.display_mode);

      // Reload exchange rates after currency change
      const toCurrencies = currencies
        .map((c) => c.code)
        .filter((c) => c !== res.settings.base_currency)
        .join(',');

      if (toCurrencies) {
        const ratesRes = await currencyService.getLatestRates(
          res.settings.base_currency,
          toCurrencies
        );
        setExchangeRates(ratesRes.rates || {});
      }

      return res.settings;
    } catch (err) {
      setError(err.message || 'Failed to update settings');
      throw err;
    }
  }, [currencies]);

  // Format amount with current currency
  const formatAmount = useCallback(
    (amount, currency = baseCurrency) => {
      const currencyData = currencies.find((c) => c.code === currency);
      if (!currencyData) return `${amount.toFixed(2)}`;

      const formatter = new Intl.NumberFormat(currencyData.locale, {
        style: 'currency',
        currency: currencyData.code,
        minimumFractionDigits: currencyData.decimal_places,
        maximumFractionDigits: currencyData.decimal_places,
      });

      return formatter.format(amount);
    },
    [baseCurrency, currencies]
  );

  // Convert amount to display currency
  const convertForDisplay = useCallback(
    (amount, originalCurrency) => {
      if (displayMode === 'display_only' || originalCurrency === baseCurrency) {
        return amount;
      }

      // Automatic conversion mode
      const rate = exchangeRates[baseCurrency];
      if (!rate) return amount; // Fallback if rate not available

      return amount * rate.rate;
    },
    [baseCurrency, displayMode, exchangeRates]
  );

  // Get currency data
  const getCurrency = useCallback(
    (code) => currencies.find((c) => c.code === code),
    [currencies]
  );

  const value = {
    baseCurrency,
    displayMode,
    currencies,
    exchangeRates,
    loading,
    error,
    updateSettings,
    formatAmount,
    convertForDisplay,
    getCurrency,
  };

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return ctx;
}
