import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

function absolutize(src: string) {
  if (!src) return src;
  if (src.startsWith('//')) return 'https:' + src;
  return src;
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const src = searchParams.get('src');
  if (!src) return NextResponse.json({ error: 'Missing src' }, { status: 400 });

  try {
    const res = await fetch(src, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: 'Upstream failed' }, { status: 502 });

    const html = await res.text();
    const $ = cheerio.load(html);

    // Prefer exact module first
    let $sku = $("[data-module-name='module_sku'].module_sku").first();

    // Fallbacks: sku-layout container or reconstruct from sku-list
    if ($sku.length === 0) {
      const $layout = $("[data-testid='sku-layout']").first();
      if ($layout.length) {
        $sku = $("<div data-module-name='module_sku' class='module_sku'></div>");
        $sku.append($layout.clone());
      } else {
        const $list = $("[data-testid='sku-list']").first();
        if ($list.length) {
          $sku = $(
            "<div data-module-name='module_sku' class='module_sku'>" +
              "<div class='id-px-5 logistics' data-testid='sku-layout' data-show-type='skuSummary'>" +
                "<div data-testid='sku-options' class='id-flex id-w-full id-flex-row id-justify-between id-gap-5'>" +
                  "<h3 class='id-text-lg id-font-bold'>Variations</h3>" +
                  "<a data-testid='sku-action' href='#' class='id-whitespace-nowrap id-text-base id-font-semibold id-text-primary id-underline'>Edit selections</a>" +
                "</div>" +
              "</div>" +
            "</div>"
          );
          $sku.find("[data-testid='sku-layout']").append($list.clone());
        }
      }
    }

    if ($sku.length === 0) {
      return NextResponse.json({ html: '', found: false }, { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    // Normalize protocol-less images
    $sku.find('img').each((_, el) => {
      const s = $(el).attr('src');
      if (s && s.startsWith('//')) $(el).attr('src', absolutize(s));
    });

    const fragment = $.html($sku);
    return NextResponse.json(
      { html: fragment, found: true },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (e) {
    return NextResponse.json({ error: 'Fetch error' }, { status: 500 });
  }
}
