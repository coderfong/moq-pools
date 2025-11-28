// Stable formatting helpers to avoid SSR/CSR hydration mismatches.
// Dates: use en-US locale and UTC timezone; Numbers: en-US.

export function formatDateUTC(input: Date | string | number, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: '2-digit', ...opts }).format(d);
  } catch {
    return String(d);
  }
}

export function formatTimeUTC(input: Date | string | number, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', ...opts }).format(d);
  } catch {
    return String(d);
  }
}

export function formatDateTimeUTC(input: Date | string | number, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', ...opts }).format(d);
  } catch {
    return String(d);
  }
}

export function formatNumberEN(n: number, opts?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat('en-US', opts).format(n);
  } catch {
    return String(n);
  }
}

export function formatCurrencyStable(n?: number | null, currency: string = 'USD'): string {
  if (!Number.isFinite(Number(n))) return '—';
  const amount = Number(n);
  try {
    // Force en-US to keep SSR/CSR consistent and avoid US$ vs $ mismatch
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = (() => {
      const c = (currency || '').toUpperCase();
      if (c === 'USD' || c === '$') return '$';
      if (c === 'EUR' || c === '€') return '€';
      if (c === 'GBP' || c === '£') return '£';
      if (c === 'CNY' || c === 'RMB' || c === '¥' || c === '￥') return '¥';
      if (c === 'INR' || c === '₹' || c === 'RS' || c === 'RS.') return '₹';
      return c ? `${c} ` : '';
    })();
    return `${sym}${amount.toFixed(2)}`;
  }
}
