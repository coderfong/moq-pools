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
