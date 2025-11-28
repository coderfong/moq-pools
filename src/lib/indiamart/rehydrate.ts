import { fetchHtml } from '../http';
import { buildIndiaMartSearchUrl } from './url';

export const INDIA_MART_OH_NO = 'Oh no! It seems this page is not available';

export const looksDeadIndiaMartHtml = (html: string): boolean =>
  !!html && (html.includes(INDIA_MART_OH_NO) || (html.includes('class="fn22 "') && html.includes('page is not available')));

export async function ensureAliveIndiaMartUrl(href: string, q: string, opts: { timeoutMs?: number } = {}): Promise<{ url: string; dead: boolean }>{
  const { timeoutMs = 3500 } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { html } = await fetchHtml(href, ctrl.signal);
    if (looksDeadIndiaMartHtml(html)) {
      return { url: buildIndiaMartSearchUrl(q), dead: true };
    }
    return { url: href, dead: false };
  } catch {
    return { url: buildIndiaMartSearchUrl(q), dead: true };
  } finally {
    clearTimeout(t);
  }
}
