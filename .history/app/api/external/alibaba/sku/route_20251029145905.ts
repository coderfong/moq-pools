import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { cacheExternalImage, cacheColorSwatchImage } from '@/lib/imageCache';

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

  // Prefer exact module first (use a broad Cheerio type to allow constructing fragments)
  let $sku: cheerio.Cheerio<any> = $("[data-module-name='module_sku'].module_sku").first() as any;

    // Fallbacks: sku-layout container or reconstruct from sku-list
    if ($sku.length === 0) {
      const $layout = $("[data-testid='sku-layout']").first();
      if ($layout.length) {
  $sku = $("<div data-module-name='module_sku' class='module_sku'></div>") as any;
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
          ) as any;
          $sku.find("[data-testid='sku-layout']").append($list.clone());
        }
      }
    }

    // Script-based fallback: derive variations from embedded JSON when markup isn't present
    if ($sku.length === 0) {
      const variants: Array<{ label: string; img: string }> = [];
      const pushVar = (label?: string, url?: string) => {
        const lbl = String(label || '').trim();
        let src = String(url || '').trim();
        if (!src) return;
        if (src.startsWith('//')) src = 'https:' + src;
        if (!/(alicdn|alibaba|aliimg|gw\.alicdn)/i.test(src)) return;
        variants.push({ label: lbl || 'Variant', img: src });
      };
      $('script').each((_, el) => {
        const txt = ($(el).contents().text() || '').slice(0, 800000);
        if (!/sku|image/i.test(txt)) return;
        // Try to pair name and image keys within a small window
        const reA = /"(?:name|propertyValueName)"\s*:\s*"([^"]{1,120})"[\s\S]{0,240}?"(?:imageUrl|image|imgUrl|imagePath)"\s*:\s*"([^"]{6,600})"/g;
        let m: RegExpExecArray | null;
        while ((m = reA.exec(txt))) pushVar(m[1], m[2]);
        const reB = /"(?:imageUrl|image|imgUrl|imagePath)"\s*:\s*"([^"]{6,600})"[\s\S]{0,240}?"(?:name|propertyValueName)"\s*:\s*"([^"]{1,120})"/g;
        while ((m = reB.exec(txt))) pushVar(m[2], m[1]);
      });
      // Dedupe by image URL
      if (variants.length) {
        const seen = new Set<string>();
        const uniq = variants.filter(v => { if (seen.has(v.img)) return false; seen.add(v.img); return true; });
        if (uniq.length) {
          const $wrap = $(
            "<div data-module-name='module_sku' class='module_sku'>" +
              "<div class='id-px-5 logistics' data-testid='sku-layout' data-show-type='skuSummary'>" +
                "<div data-testid='sku-options' class='id-flex id-w-full id-flex-row id-justify-between id-gap-5'>" +
                  "<h3 class='id-text-lg id-font-bold'>Variations</h3>" +
                  "<a data-testid='sku-action' href='#' class='id-whitespace-nowrap id-text-base id-font-semibold id-text-primary id-underline'>Edit selections</a>" +
                "</div>" +
                "<div data-testid='sku-info' data-show-type='skuSummary'>" +
                  "<div data-testid='sku-list' class='id-flex id-flex-row id-flex-wrap id-py-1 id-gap-3 id-overflow-hidden'></div>" +
                "</div>" +
              "</div>" +
            "</div>"
          ) as any;
          const $listOut = $wrap.find("[data-testid='sku-list']").first();
          uniq.forEach(v => {
            const $item = $(
              "<div data-testid='sku-list-item' class='id-flex id-flex-row id-flex-wrap id-py-1 id-gap-3 id-overflow-hidden'>" +
                "<div class='id-relative id-inline-block id-rounded id-aspect-square id-size-[55px]' data-testid='non-last-sku-item'>" +
                  "<div class='double-bordered-box enabled selected id-h-full id-w-full' data-testid='double-bordered-box' style='background-color: transparent;'>" +
                    "<div class='inner-border'></div>" +
                    `<img src='${v.img}' alt='${cheerio.load('')(v.label).text()}' loading='lazy' class='id-aspect-square id-rounded-lg id-object-contain'>` +
                  "</div>" +
                "</div>" +
              "</div>"
            ) as any;
            $listOut.append($item);
          });
          $sku = $wrap;
        }
      }
    }

    if ($sku.length === 0) {
      return NextResponse.json({ html: '', found: false }, { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    // Normalize protocol-less images and attempt to cache to /cache before returning
    const imgEls = $sku.find("[data-testid='sku-list'] [data-testid='sku-list-item'] img, [data-testid='double-bordered-box'] img").toArray();
    // First absolutize everything
    imgEls.forEach((el) => {
      const s = $(el).attr('src');
      if (s && s.startsWith('//')) $(el).attr('src', absolutize(s));
    });
    // Then cache in parallel (best-effort)
    try {
      await Promise.all(
        imgEls.map(async (el) => {
          const s = $(el).attr('src') || '';
          if (!s) return;
          try {
            const { localPath } = await cacheExternalImage(s);
            if (localPath) $(el).attr('src', localPath);
          } catch {
            // leave original src on failure
          }
        })
      );
    } catch {
      // ignore
    }

    // Generate swatch thumbnails for color-only boxes (no <img>)
    try {
      const boxes = $sku.find("[data-testid='sku-list'] [data-testid='sku-list-item'] [data-testid='double-bordered-box']").toArray();
      await Promise.all(boxes.map(async (el) => {
        const $box = $(el);
        if ($box.find('img').length > 0) return; // already has an image
        const style = String($box.attr('style') || '');
        const m = style.match(/background-color\s*:\s*([^;]+);?/i);
        const color = (m ? m[1].trim() : '').toLowerCase();
        if (!color || color === 'transparent') return;
        try {
          const { localPath } = await cacheColorSwatchImage(color, 88);
          // Insert an <img> inside the box to standardize rendering downstream
          const $img = $(`<img src='${localPath}' alt='Variant' loading='lazy' class='id-aspect-square id-rounded-lg id-object-contain'>`) as any;
          $box.append($img);
        } catch {
          // best effort
        }
      }));
    } catch {}

    const fragment = $.html($sku);
    return NextResponse.json(
      { html: fragment, found: true },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (e) {
    return NextResponse.json({ error: 'Fetch error' }, { status: 500 });
  }
}
