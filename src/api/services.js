import api from './client';

/**
 * Thin service layer: every backend endpoint gets exactly one function here.
 * Components never call `api` directly — this is the single seam to change
 * if an endpoint's shape ever changes.
 */

export const authService = {
  me: () => api.get('/auth/me'),
  register: (payload) => api.post('/auth/register', payload),
};

export const categoryService = {
  list: () => api.get('/categories'),
  create: (payload) => api.post('/categories', payload),
  update: (id, payload) => api.put(`/categories/${id}`, payload),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const supplierService = {
  list: () => api.get('/suppliers'),
  getOne: (id) => api.get(`/suppliers/${id}`),
  create: (payload) => api.post('/suppliers', payload),
  update: (id, payload) => api.put(`/suppliers/${id}`, payload),
  remove: (id) => api.delete(`/suppliers/${id}`),
};

export const productService = {
  list: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (payload) => api.post('/products', payload),
  update: (id, payload) => api.put(`/products/${id}`, payload),
  remove: (id) => api.delete(`/products/${id}`),
  adjustStock: (id, payload) => api.post(`/products/${id}/adjust-stock`, payload),
  listAdjustments: (id) => api.get(`/products/${id}/adjustments`),
};

export const incomingStockService = {
  list: (status) => api.get('/incoming-stock', { params: status ? { status } : {} }),
  getOne: (id) => api.get(`/incoming-stock/${id}`),
  create: (payload) => api.post('/incoming-stock', payload),
  update: (id, payload) => api.patch(`/incoming-stock/${id}`, payload),
  updateStatus: (id, status) => api.patch(`/incoming-stock/${id}/status`, { status }),
  receive: (id, items) => api.post(`/incoming-stock/${id}/receive`, { items }),
};

export const salesService = {
  list: (params) => api.get('/sales', { params }),
  getOne: (id) => api.get(`/sales/${id}`),
  summary: () => api.get('/sales/summary'),
  preview: (payload) => api.post('/sales/preview', payload),
  checkout: (payload) => api.post('/sales', payload),
};

export const financialsService = {
  dashboard: (range = '30d') => api.get('/financials/dashboard', { params: { range } }),
  listExpenses: () => api.get('/financials/expenses'),
  createExpense: (payload) => api.post('/financials/expenses', payload),
  updateExpense: (id, payload) => api.put(`/financials/expenses/${id}`, payload),
  removeExpense: (id) => api.delete(`/financials/expenses/${id}`),
};

export const uploadService = {
  productImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/uploads/product-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const currencyService = {
  listCurrencies: () => api.get('/currencies'),
  getCurrency: (code) => api.get(`/currencies/${code}`),
  getLatestRates: (fromCurrency, toCurrencies) =>
    api.get('/currencies/rates/latest', {
      params: { from_currency: fromCurrency, to_currencies: toCurrencies },
    }),
  getHistoricalRates: (fromCurrency, toCurrency, days) =>
    api.get('/currencies/rates/historical', {
      params: { from_currency: fromCurrency, to_currency: toCurrency, days },
    }),
  getSystemSettings: () => api.get('/settings'),
  updateSystemSettings: (payload) => api.put('/settings', payload),
  convertCurrency: (amount, fromCurrency, toCurrency) =>
    api.get('/settings/convert', {
      params: { amount, from_currency: fromCurrency, to_currency: toCurrency },
    }),
};
