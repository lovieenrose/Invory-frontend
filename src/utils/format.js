export function formatCurrency(value, currency = 'USD') {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(num);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

export function formatDate(value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', opts).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}
