export async function fetchHtml(url: string, signal?: AbortSignal): Promise<{ status: number; html: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,*/*;q=0.9',
      'Accept-Language': 'en-US,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
    redirect: 'follow',
    cache: 'no-store',
    signal,
  });
  const html = await res.text();
  return { status: res.status, html };
}
