// Generic text filters for ingestion quality control

export type ExcludeCheck = { excluded: boolean; reason?: string };

// Default banned keywords (case-insensitive). Keep focused per request.
const DEFAULT_BANNED = [
  'custom',
  'customized',
  'customised',
  'service',
  'services',
  'consulting',
  'consultancy',
];

function buildBannedList(): RegExp[] {
  const extra = (process.env.EXCLUDE_KEYWORDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const all = Array.from(new Set<string>([...DEFAULT_BANNED, ...extra]));
  return all.map((w) => new RegExp(`(^|[^a-z])${w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(s|es)?([^a-z]|$)`, 'i'));
}

const BANNED_RX = buildBannedList();

export function isExcludedByKeywords(title?: string, description?: string): ExcludeCheck {
  const t = String(title || '').toLowerCase();
  const d = String(description || '').toLowerCase();
  for (const rx of BANNED_RX) {
    if (rx.test(t) || rx.test(d)) {
      // Extract the word if possible for reason
      const m = /[a-z]+/.exec(String(rx));
      return { excluded: true, reason: 'banned_keyword' };
    }
  }
  return { excluded: false };
}
