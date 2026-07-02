import React, { useState } from 'react';
import { Settings as SettingsIcon, AlertCircle, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';

export default function Settings() {
  const { baseCurrency, displayMode, currencies, loading, updateSettings } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState(baseCurrency);
  const [selectedMode, setSelectedMode] = useState(displayMode);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (selectedCurrency === baseCurrency && selectedMode === displayMode) {
      toast.success('No changes to save');
      return;
    }

    setSaving(true);
    try {
      await updateSettings(selectedCurrency, selectedMode);
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update settings');
      // Revert on error
      setSelectedCurrency(baseCurrency);
      setSelectedMode(displayMode);
    } finally {
      setSaving(false);
    }
  };

  const selectedCurrencyData = currencies.find((c) => c.code === selectedCurrency);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-3 text-brand-500" />
          <p className="text-ink-soft">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center">
            <SettingsIcon size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-ink-soft">Manage your system preferences</p>
          </div>
        </div>

        {/* System Preferences Card */}
        <div className="card p-6 mb-6">
          <h2 className="font-display text-xl font-semibold mb-6">System Preferences</h2>

          {/* Base Currency Section */}
          <div className="mb-8 pb-8 border-b border-ink-border">
            <div className="mb-4">
              <label className="text-sm font-medium text-ink block mb-2">Base Currency</label>
              <p className="text-xs text-ink-soft mb-4">
                This is the primary currency for all financial calculations and reports
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currencies.map((currency) => (
                <div
                  key={currency.code}
                  onClick={() => setSelectedCurrency(currency.code)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCurrency === currency.code
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-ink-border bg-white hover:border-ink-soft'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-ink">{currency.code}</p>
                      <p className="text-sm text-ink-soft">{currency.name}</p>
                      <p className="text-xs text-ink-soft mt-1">{currency.symbol}</p>
                    </div>
                    {selectedCurrency === currency.code && (
                      <Check size={20} className="text-brand-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Display Mode Section */}
          <div className="mb-8 pb-8 border-b border-ink-border">
            <div className="mb-4">
              <label className="text-sm font-medium text-ink block mb-2">Display Mode</label>
              <p className="text-xs text-ink-soft mb-4">
                Choose how monetary values are displayed across the system
              </p>
            </div>

            <div className="space-y-3">
              {/* Display Only */}
              <div
                onClick={() => setSelectedMode('display_only')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMode === 'display_only'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-border bg-white hover:border-ink-soft'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-ink">Display Only</p>
                    <p className="text-sm text-ink-soft mt-1">
                      Changes only the currency symbol and formatting. All stored values remain
                      unchanged in their original currency.
                    </p>
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-ink-soft">
                      💡 Best for: Multi-currency businesses that want to display in different
                      formats
                    </div>
                  </div>
                  {selectedMode === 'display_only' && (
                    <Check size={20} className="text-brand-500 ml-4 flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>

              {/* Automatic Conversion */}
              <div
                onClick={() => setSelectedMode('automatic_conversion')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMode === 'automatic_conversion'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-border bg-white hover:border-ink-soft'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-ink">Automatic Currency Conversion</p>
                    <p className="text-sm text-ink-soft mt-1">
                      Converts all monetary values using the latest exchange rates. Original
                      values are preserved in the database for accounting accuracy.
                    </p>
                    <div className="mt-3 p-2 bg-amber-50 rounded text-xs text-ink-soft">
                      ⚠️ Exchange rates are updated hourly. Conversions may vary slightly.
                    </div>
                  </div>
                  {selectedMode === 'automatic_conversion' && (
                    <Check size={20} className="text-brand-500 ml-4 flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Current Currency Info */}
          {selectedCurrencyData && (
            <div className="bg-ink-soft bg-opacity-5 rounded-lg p-4">
              <p className="text-xs font-medium text-ink-soft mb-2">CURRENT SELECTION</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedCurrencyData.symbol}</span>
                <div>
                  <p className="font-medium text-ink">{selectedCurrencyData.code}</p>
                  <p className="text-sm text-ink-soft">{selectedCurrencyData.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card p-4 bg-blue-50 border-l-4 border-blue-500">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Display Only Mode</p>
                <p className="text-xs text-blue-800 mt-1">
                  Faster performance, no exchange rate dependency
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-green-50 border-l-4 border-green-500">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Conversion Mode</p>
                <p className="text-xs text-green-800 mt-1">
                  Unified financial reporting across currencies
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || (selectedCurrency === baseCurrency && selectedMode === displayMode)}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                Save Changes
              </>
            )}
          </button>

          {(selectedCurrency !== baseCurrency || selectedMode !== displayMode) && (
            <button
              onClick={() => {
                setSelectedCurrency(baseCurrency);
                setSelectedMode(displayMode);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
