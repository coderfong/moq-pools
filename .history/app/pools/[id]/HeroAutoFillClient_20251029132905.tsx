'use client';

import { useEffect } from 'react';

/**
 * Runs on the client to populate .pool-hero-right by scraping available DOM
 * and injecting normalized sections. Adapted from user's drop-in script with
 * safe fallbacks and guards to avoid wiping SSR content when no data found.
 */
export default function HeroAutoFillClient() {
  useEffect(() => {
    try {
      // ---------- Helpers ----------
      const $ = (sel: string, root: Document | Element = document) => root.querySelector<HTMLElement>(sel);
      const $$ = (sel: string, root: Document | Element = document) => Array.from(root.querySelectorAll<HTMLElement>(sel));
      const txt = (el?: Element | null) => (el ? (el.textContent || '').trim() : '');
      const money = (s: string) => s.replace(/\s+/g, '').match(/\$?[\d.,]+/g)?.[0] || '';

      // ---------- SOURCE ROOTS ----------
      // Prefer a known container in our SSR; fall back to document
      const srcRoot: Document | Element = (document.querySelector('.sr-layout-detail') as Element) || document;
      const pool = document.querySelector('.pool-hero-right') as Element | null;
      if (!srcRoot || !pool) return; // Nothing to do

      // ---------- TIMER: Countdown next to title ----------
      try {
        const timer = $('#pool-timer', document);
        if (timer) {
          const deadlineAttr = timer.getAttribute('data-deadline') || '';
          const deadline = deadlineAttr ? new Date(deadlineAttr).getTime() : NaN;
          const dd = timer.querySelector('[data-timer-dd]') as HTMLElement | null;
          const hh = timer.querySelector('[data-timer-hh]') as HTMLElement | null;
          const mm = timer.querySelector('[data-timer-mm]') as HTMLElement | null;
          const fmt = (n: number) => String(Math.max(0, n)).padStart(2, '0');
          const updateTimer = () => {
            if (!isFinite(deadline)) {
              if (dd) dd.textContent = '00';
              if (hh) hh.textContent = '00';
              if (mm) mm.textContent = '00';
              return false;
            }
            const now = Date.now();
            let diff = Math.max(0, deadline - now);
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            diff -= days * 24 * 60 * 60 * 1000;
            const hours = Math.floor(diff / (60 * 60 * 1000));
            diff -= hours * 60 * 60 * 1000;
            const mins = Math.floor(diff / (60 * 1000));
            if (dd) dd.textContent = fmt(days);
            if (hh) hh.textContent = fmt(hours);
            if (mm) mm.textContent = fmt(mins);
            return deadline - now > 0;
          };
          // Initial paint
          const hasTime = updateTimer();
          // Ticking each minute is sufficient; tick sooner initially to avoid minute boundary lag
          let t1: number | undefined;
          let t2: number | undefined;
          if (hasTime) {
            t1 = window.setInterval(updateTimer, 60 * 1000);
            t2 = window.setTimeout(updateTimer, 5 * 1000);
          }
          // Cleanup on unmount
          const cleanup = () => {
            if (typeof t1 === 'number') window.clearInterval(t1);
            if (typeof t2 === 'number') window.clearTimeout(t2);
          };
          // Attach to timer element so outer cleanup can find it
          (timer as any).__cleanupTimer = cleanup;
        }
      } catch {}

      // ---------- EXTRACT: Title ----------
      const title =
        txt($('.module_sku_summary_tabs h1', srcRoot)) ||
        txt($('.sr-proMainInfo-baseInfoH1 h1', srcRoot)) ||
        txt($('.sr-proMainInfo-baseInfoH1', srcRoot)) ||
        txt($('.J-baseInfo-name h1', document)) ||
        txt($('.J-baseInfo-name', document)) ||
        'Product';

      // ---------- EXTRACT: Price tiers ----------
      // Try upstream structure first
      const ladderItems = $$('.module_price [data-testid="ladder-price"] .price-item', srcRoot);
      let priceTiers = ladderItems.map((it) => {
        const range = txt(($$('.id-text-sm', it)[0] as Element) || $('.id-text-sm', it));
        const price = txt($('.id-font-bold span', it));
        return { range, price };
      }).filter((t) => t.range || t.price);

      // Fallback: parse our SSR table format
      if (!priceTiers.length) {
        const rows = $$('.sr-proMainInfo-baseInfo-propertyPrice .only-one-priceNum-tr td', srcRoot);
        const pairs: { range: string; price: string }[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const left = row.querySelector('.only-one-priceNum-td-left');
          const right = row.querySelector('.only-one-priceNum-price');
          const price = txt(left);
          const range = txt(right);
          if (price && range) pairs.push({ range, price });
        }
        priceTiers = pairs;
      }

      // ---------- EXTRACT: Sample price ----------
      const sampleWrap = $('.module_price [data-testid="fortifiedSample"]', srcRoot);
      let samplePrice = sampleWrap ? money(txt(sampleWrap)) : '';
      if (!samplePrice) {
        // Look for a SSR "Sample:" row
        const sampleTd = Array.from($$('.sr-proMainInfo-baseInfo-propertyPrice .only-one-priceNum-tr td', srcRoot)).find((td) => /sample:/i.test((td.textContent || '').toLowerCase()));
        if (sampleTd) {
          const span = sampleTd.querySelector('.only-one-priceNum-price');
          samplePrice = txt(span) || txt(sampleTd).replace(/sample:\s*/i, '');
        }
      }

      // ---------- EXTRACT: Variations (Color) ----------
      const variationImgs = $$('[data-testid="sku-list"] [data-testid="sku-list-item"] img', srcRoot);
      let variations = variationImgs.map((img) => ({
        label: img.getAttribute('alt') || 'Variant',
        img: (img.getAttribute('src') || '').replace(/^\/\//, 'https://'),
      })).filter((v) => v.label || v.img);
      // Fallback: SSR block, if images are present under #autofill-details-block
      if (!variations.length) {
        const figs = $$('#autofill-details-block figure', srcRoot);
        variations = figs
          .map((fig) => {
            const img = fig.querySelector('img');
            const cap = fig.querySelector('figcaption');
            return {
              label: txt(cap),
              img: (img?.getAttribute('src') || '').replace(/^\/\//, 'https://'),
            };
          })
          .filter((v) => v.label || v.img);
      }

      // ---------- EXTRACT: Customization options ----------
      const custRows = $$('.module_sku_summary_other_customization .id-flex.id-items-center', srcRoot);
      let customizationOptions = custRows.map((row) => {
        const line = txt(row);
        const name = line.split('+')[0]?.trim() || line;
        const priceMatch = line.match(/\+\$?\s*[\d.,]+(?:\/\w+)?/i)?.[0]?.replace(/^\+/, '') || '';
        const moqMatch = line.match(/\(.*?(?:Min\.?\s*order|MOQ).*?\)/i)?.[0]?.replace(/[()]/g, '') || '';
        return { name, addOn: priceMatch, moq: moqMatch };
      });
      if (!customizationOptions.length) {
        // Parse SSR list if present
        const lis = $$('#autofill-details-block .product-details-title + ul li', srcRoot);
        customizationOptions = lis.map((li) => {
          const strong = li.querySelector('strong');
          const text = txt(li);
          const name = txt(strong) || text.split('—')[0]?.trim() || text;
          const addOn = text.match(/\$[\d.,]+(?:\/\w+)?/i)?.[0] || '';
          const moq = text.match(/\(.*?(?:Min\.?\s*order|MOQ).*?\)/i)?.[0]?.replace(/[()]/g, '') || '';
          return { name, addOn, moq };
        });
      }

      // ---------- EXTRACT: Supplier customization ability ----------
      let supplierAbilities = $$(
        '.module_supplier_customization .id-flex.id-items-center.id-mb-2, .module_supplier_customization .id-flex.id-items-center:not(.id-mb-2)',
        srcRoot,
      )
        .map((el) => txt(el))
        .filter(Boolean);
      if (!supplierAbilities.length) {
        supplierAbilities = $$('#autofill-details-block ul li', srcRoot)
          .map((li) => txt(li))
          .filter(Boolean);
      }

      // ---------- EXTRACT: Shipping note ----------
      let shippingNote = txt($('[data-testid="logistics-no-result-text"]', srcRoot));
      if (!shippingNote) {
        const shipTitle = Array.from($$('#autofill-details-block .product-details-title', srcRoot)).find((el) => /shipping/i.test(txt(el)));
        if (shipTitle) {
          const p = shipTitle.parentElement?.querySelector('p');
          shippingNote = txt(p);
        }
      }

      // ---------- EXTRACT: Actions ----------
      const actions = {
        inquiryLabel: txt($('[data-testid="customizationSkuSummary-INQUIRY"]', srcRoot)),
        chatLabel: txt($('[data-testid="customizationSkuSummary-CHAT"]', srcRoot)),
      };

      // ---------- EXTRACT: Protections ----------
      const protectionsRoot = $('.module_ta_plus', srcRoot);
      const protections: { header: string; body: string }[] = [];
      if (protectionsRoot) {
        const blocks = $$('.id-flex.id-flex-col.id-gap-2', protectionsRoot);
        blocks.forEach((b) => {
          const header = txt($('h4', b));
          const body = txt($('p', b));
          if (header || body) protections.push({ header, body });
        });
      } else {
        // SSR fallback: look under our injected block for titles and list items
        const protTitle = Array.from($$('#autofill-details-block .product-details-title', srcRoot)).find((el) => /protection/i.test(txt(el)) || /protections/i.test(txt(el)));
        if (protTitle) {
          const lis = protTitle.parentElement?.querySelectorAll('li') || [];
          lis.forEach((li) => {
            const text = txt(li);
            const m = text.match(/^([^:]+):\s*(.*)$/);
            protections.push({ header: m?.[1] || '', body: m?.[2] || text });
          });
        }
      }

      // ---------- EXTRACT: Company / contact ----------
      const companyName = txt($('.sr-comInfo-title .title-txt a span', document));
      const companyLink = ($('.sr-comInfo-title .title-txt a', document) as HTMLAnchorElement | null)?.href || '';
      const companyLogo = ($('.sr-com-logo img', document) as HTMLImageElement | null)?.getAttribute('src')?.replace(/^\/\//, 'https://') || '';
      const contactLink = ($('.button-link-contact', document) as HTMLAnchorElement | null)?.href || '';
      const chatEnabled = !!$('.tm-status-on', document);

      // ---------- Normalize ----------
      const productData = {
        title,
        priceTiers,
        samplePrice: samplePrice || null,
        variations,
        customizationOptions,
        supplierAbilities,
        shippingNote,
        actions,
        protections,
        company: { name: companyName, link: companyLink, logo: companyLogo, contactLink, chatEnabled },
      };

      // Check if we actually have any meaningful data before mutating DOM
      const hasAny = Boolean(
        (productData.priceTiers && productData.priceTiers.length) ||
          productData.samplePrice ||
          (productData.variations && productData.variations.length) ||
          (productData.customizationOptions && productData.customizationOptions.length) ||
          (productData.supplierAbilities && productData.supplierAbilities.length) ||
          productData.shippingNote ||
          (productData.protections && productData.protections.length) ||
          productData.company?.name ||
          productData.company?.logo ||
          productData.actions?.inquiryLabel ||
          productData.actions?.chatLabel,
      );

      if (!hasAny) return; // Avoid wiping SSR if nothing meaningful was found

      // ---------- RENDER into .pool-hero-right ----------
      // Title
      const titleEl = $('.sr-proMainInfo-baseInfoH1.J-baseInfo-name h1', pool) || $('.sr-proMainInfo-baseInfoH1.J-baseInfo-name', pool);
      if (titleEl && productData.title) titleEl.textContent = productData.title;

      // Price/MOQ area: replace the existing table with tiers + sample (only when we found tiers/sample)
      if ((productData.priceTiers && productData.priceTiers.length) || productData.samplePrice) {
        const priceHost = $('.sr-proMainInfo-baseInfo-propertyPrice', pool);
        if (priceHost) {
          priceHost.innerHTML = `
            <div class="only-one-priceNum">
              <table><tbody>
                <tr class="only-one-priceNum-tr" style="display:flex;flex-direction:column;align-items:flex-start;gap:.25rem;padding:0;">
                  ${productData.priceTiers
                    .map(
                      (t) => `
                    <td style="padding:0 !important;">
                      <span class="only-one-priceNum-td-left" style="font-weight:700;">${t.price}</span>
                      <span class="sa-only-property-price only-one-priceNum-price" style="margin-left:.5rem;color:#222">${t.range}</span>
                    </td>`,
                    )
                    .join('')}
                  ${productData.samplePrice
                    ? `
                    <td style="padding:0 !important;margin-top:.25rem;">
                      <span class="only-one-priceNum-td-left" style="font-weight:700;">Sample:</span>
                      <span class="sa-only-property-price only-one-priceNum-price" style="margin-left:.5rem;color:#222">${productData.samplePrice}</span>
                    </td>`
                    : ``}
                </tr>
              </tbody></table>
            </div>
          `;
        }
      }

      // ---------- FALLBACK: Inject Variations into right-hand grid if SSR didn't include it ----------
      try {
        const rightCol = pool.querySelector('.space-y-8.h-full') as HTMLElement | null;
        const hasVariationsSSR = !!(rightCol && Array.from(rightCol.querySelectorAll('h2')).some(h => /variations/i.test((h.textContent || '').trim())));
        if (rightCol && !hasVariationsSSR && productData.variations && productData.variations.length) {
          const sec = document.createElement('section');
          sec.className = 'mt-8';
          const items = productData.variations.map((v) => {
            const img = (v.img || '').replace(/^\/\//, 'https://');
            const label = v.label || '';
            return `
              <figure class="flex flex-col items-center text-center">
                ${img ? `<img src="${img}" alt="${label}" class="w-20 h-20 object-contain rounded-lg border border-gray-200" referrerpolicy="no-referrer" />` : ''}
                <figcaption class="mt-1 text-xs text-gray-700 line-clamp-2">${label}</figcaption>
              </figure>
            `;
          }).join('');
          sec.innerHTML = `
            <h2 class="text-lg font-semibold text-gray-900">Variations</h2>
            <div class="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div class="p-3 grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-3">
                ${items}
              </div>
            </div>
          `;
          // Prepend so Variations shows above Packaging/Protections like SSR structure
          rightCol.insertBefore(sec, rightCol.firstChild);
        }
      } catch {}

      // ---------- SECONDARY FALLBACK: Fetch sanitized detail HTML and parse Variations ----------
      try {
        const rightCol = pool.querySelector('.space-y-8.h-full') as HTMLElement | null;
        const hasVariationsSSR = !!(rightCol && Array.from(rightCol.querySelectorAll('h2')).some(h => /variations/i.test((h.textContent || '').trim())));
        const hasInjected = !!(rightCol && rightCol.querySelector('section:has(> h2:contains("Variations"))'));
        if (rightCol && !hasVariationsSSR && !hasInjected) {
          // Try to locate the original listing URL from the header action
          const linkEl = Array.from(document.querySelectorAll('a')).find(a => /Open Original/i.test((a.textContent || '').trim())) as HTMLAnchorElement | undefined;
          const srcUrl = linkEl?.href || '';
          if (srcUrl) {
            const base = (process.env.NEXT_PUBLIC_BASE_URL || '').trim();
            const api = `${base}/api/external/detail-html?src=${encodeURIComponent(srcUrl)}`;
            const resp = await fetch(api, { cache: 'no-store' }).catch(() => null);
            const data = await resp?.json().catch(() => null) as any;
            const html = (data && typeof data.html === 'string') ? data.html : '';
            if (html) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              const imgs = Array.from(doc.querySelectorAll('[data-testid="sku-list"] [data-testid="sku-list-item"] img')) as HTMLImageElement[];
              const vars = imgs.map((img, i) => {
                const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
                const alt = img.getAttribute('alt') || `Variant ${i+1}`;
                return { src, alt };
              }).filter(v => v.src);
              if (vars.length) {
                const sec = document.createElement('section');
                sec.className = 'mt-8';
                const items = vars.map(v => `
                  <figure class="flex flex-col items-center text-center">
                    <img src="${v.src}" alt="${v.alt}" class="w-20 h-20 object-contain rounded-lg border border-gray-200" referrerpolicy="no-referrer" />
                    <figcaption class="mt-1 text-xs text-gray-700 line-clamp-2">${v.alt}</figcaption>
                  </figure>
                `).join('');
                sec.innerHTML = `
                  <h2 class="text-lg font-semibold text-gray-900">Variations</h2>
                  <div class="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div class="p-3 grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-3">
                      ${items}
                    </div>
                  </div>
                `;
                rightCol.insertBefore(sec, rightCol.firstChild);
              }
            }
          }
        }
      } catch {}

      // Build progress UI from SSR tiers when present
      try {
    const tiersHost = $('#tiers', pool);
    const progressHost = $('#pricing-progress', pool);
    if (tiersHost && progressHost) {
          // Parse tiers from SSR if not already parsed
          const parsed: { min: number; max: number; price: string; label: string }[] = [];
          const tierEls = $$('#tiers .tier', pool);
          tierEls.forEach((el) => {
            const strong = el.querySelector('strong.font-semibold');
            const rangeEl = el.querySelector('i');
            const price = (strong?.textContent || '').trim();
            const label = (rangeEl?.textContent || '').trim();
            // Extract numeric bounds: supports "24-239 pcs", "240–2399 pcs", "≥ 2400 pcs"
            const clean = label.replace(/pcs|pieces|piece|pc/gi, '').trim();
            let min = 1, max = Infinity;
            const ge = clean.match(/[≥>=]+\s*(\d+)/);
            const range = clean.match(/(\d+)\s*[–-]\s*(\d+)/);
            const single = clean.match(/\b(\d+)\b/);
            if (ge) {
              min = parseInt(ge[1], 10);
              max = Infinity;
            } else if (range) {
              min = parseInt(range[1], 10);
              max = parseInt(range[2], 10);
            } else if (single) {
              min = parseInt(single[1], 10);
              max = min;
            }
            parsed.push({ min, max, price, label });
          });

          if (parsed.length) {
            // Determine baseline MAX as the highest finite boundary or a sensible cap
            const finiteMaxes = parsed.map(p => p.max).filter((v) => isFinite(v)) as number[];
            const MAX = finiteMaxes.length ? Math.max(...finiteMaxes) : 2400;
            const thresholds = parsed.map(p => p.min).filter((v) => v > 1).sort((a,b)=>a-b);
            // Extend visual range so the last tier min (e.g., 2400) is not the end of the bar
            const lastMin = parsed[parsed.length - 1]?.min || MAX;
            const SLACK_PCT = 10; // reserve 10% past the last threshold to the end
            const MAX_EXT = Math.max(MAX, Math.ceil(lastMin / ((100 - SLACK_PCT) / 100)));

            const bar = progressHost as HTMLElement;
            const fill = document.getElementById('pricing-progress-fill') as HTMLElement | null;
            if (!fill) return;
            // Reflect extended max in ARIA for better semantics
            bar.setAttribute('aria-valuemax', String(MAX_EXT));
            // no legend container; we show numeric ticks below the bar

            // Compute percent for a quantity
            const pctFor = (q: number) => Math.min(100, (q / MAX_EXT) * 100);

            // Add shaded segments aligned with separators and ticks inside bar
            const addSegment = (leftPct: number, widthPct: number, intensity = 0.05) => {
              const seg = document.createElement('div');
              seg.className = 'pointer-events-none absolute inset-y-0';
              seg.style.left = `${leftPct}%`;
              seg.style.width = `${widthPct}%`;
              seg.style.background = `rgba(0,0,0,${intensity})`;
              bar.appendChild(seg);
            };
          
            // Build segments from thresholds: [0, t1, t2, ..., 100]
            const points = [0, ...thresholds.map(pctFor), 100];
            for (let i = 0; i < points.length - 1; i++) {
              const left = points[i];
              const right = points[i + 1];
              const width = Math.max(0, right - left);
              if (width > 0) addSegment(left, width, i === 0 ? 0.05 : 0.03);
            }

            // Add ticks inside bar
            const addTick = (xPct: number) => {
              const tick = document.createElement('span');
              tick.setAttribute('aria-hidden', 'true');
              tick.className = 'absolute top-1/2 h-2 w-px -translate-y-1/2 bg-gray-400';
              tick.style.left = `${xPct}%`;
              bar.appendChild(tick);
            };

            

            // Ticks at each threshold and final max
            thresholds.forEach((t) => addTick(pctFor(t)));
            addTick(100); // end of bar

            // Alternative tick alignment: position ticks under the visual separators (•)
            const alignTicksToSeparators = () => {
              // Remove old ticks we injected here (but keep segment background)
              Array.from(bar.querySelectorAll('span.tick-sep')).forEach((n) => n.remove());
              const barRect = bar.getBoundingClientRect();
              const seps = Array.from(document.querySelectorAll('#tiers .tier-sep')) as HTMLElement[];
              seps.forEach((sep) => {
                const r = sep.getBoundingClientRect();
                const centerX = r.left + r.width / 2;
                const pct = ((centerX - barRect.left) / barRect.width) * 100;
                const tick = document.createElement('span');
                tick.className = 'tick-sep absolute top-1/2 h-2 w-px -translate-y-1/2 bg-gray-400';
                tick.style.left = `${pct}%`;
                bar.appendChild(tick);
              });
            };
            // Align header so first tier starts above first threshold (e.g., 24)
            const alignHeaderToFirstThreshold = () => {
              const header = tiersHost as HTMLElement;
              const firstTier = (tierEls[0] as HTMLElement | undefined) || null;
              if (!header || !firstTier || !parsed.length) return;
              const firstMin = parsed[0].min || 0;
              const barRect = bar.getBoundingClientRect();
              const firstRect = firstTier.getBoundingClientRect();
              const targetLeft = barRect.left + (pctFor(firstMin) / 100) * barRect.width;
              const delta = Math.round(targetLeft - firstRect.left);
              header.style.transform = `translateX(${delta}px)`;
            };

            const realignAll = () => {
              alignHeaderToFirstThreshold();
              alignTicksToSeparators();
            };

            // Initial alignment and on resize
            realignAll();
            window.addEventListener('resize', realignAll);

            // Legend labels based on segments count (up to 3)
            // No legend grid here to keep markup light; we show numeric ticks below the bar

            // Active tier highlight in the tiers row
            const highlightTier = (q: number) => {
              tierEls.forEach((el, idx) => {
                const p = parsed[idx];
                const hit = q >= p.min && q <= (isFinite(p.max) ? p.max : Infinity);
                el.classList.toggle('bg-black', !!hit);
                el.classList.toggle('text-white', !!hit);
              });
            };

            const update = (q: number) => {
              const qty = Math.max(0, q || 0);
              const pct = pctFor(qty);
              fill.style.width = pct + '%';
              bar.setAttribute('aria-valuenow', String(Math.min(qty, MAX_EXT)));
              highlightTier(qty);
            };

            // Initialize at 0 and expose API for optional external quantity control
            update(0);
            (window as any).setPricingProgress = (q: number) => {
              update(q);
              // Re-align in case header/ticks need to match current layout
              realignAll();
            };
          }
        }
      } catch {}

      // Inject details block (only when we have details)
      const shouldInjectDetails = Boolean(
        (productData.variations && productData.variations.length) ||
          (productData.customizationOptions && productData.customizationOptions.length) ||
          (productData.supplierAbilities && productData.supplierAbilities.length) ||
          productData.shippingNote ||
          (productData.protections && productData.protections.length) ||
          productData.company?.name ||
          productData.company?.logo ||
          productData.company?.contactLink ||
          productData.actions?.inquiryLabel ||
          productData.actions?.chatLabel,
      );

      if (shouldInjectDetails) {
        const attrAnchor = $('.sr-proMainInfo-baseInfo-propertyAttr', pool);
        if (attrAnchor) {
          const old = $('#autofill-details-block', attrAnchor);
          if (old) old.remove();
          const section = document.createElement('div');
          section.id = 'autofill-details-block';
          section.innerHTML = `
            <div class="attr-line"></div>
            <div style="display:grid;gap:16px">
              ${productData.variations?.length
                ? `
              <div>
                <div class="product-details-title"><span>Variations</span></div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                  ${productData.variations
                    .map(
                      (v) => `
                    <figure style="width:88px;margin:0">
                      ${v.img ? `<img src="${v.img}" alt="${v.label}" style="width:88px;height:88px;object-fit:contain;border:1px solid #eee;border-radius:8px;">` : ''}
                      <figcaption style="font-size:12px;margin-top:4px;">${v.label}</figcaption>
                    </figure>`,
                    )
                    .join('')}
                </div>
              </div>`
                : ``}

              ${productData.customizationOptions?.length
                ? `
              <div>
                <div class="product-details-title"><span>Customization options</span></div>
                <ul style="margin:8px 0 0 16px;">
                  ${productData.customizationOptions
                    .map(
                      (c) => `
                    <li style="margin:4px 0;">
                      <strong>${c.name}</strong>
                      ${c.addOn ? ` — <span>${c.addOn}</span>` : ``}
                      ${c.moq ? ` <span style="color:#666">(${c.moq})</span>` : ``}
                    </li>`,
                    )
                    .join('')}
                </ul>
              </div>`
                : ``}

              ${productData.supplierAbilities?.length
                ? `
              <div>
                <div class="product-details-title"><span>Supplier’s customization ability</span></div>
                <ul style="margin:8px 0 0 16px;">
                  ${productData.supplierAbilities.map((a) => `<li style="margin:4px 0;">${a}</li>`).join('')}
                </ul>
              </div>`
                : ``}

              ${productData.shippingNote
                ? `
              <div>
                <div class="product-details-title"><span>Shipping</span></div>
                <p style="margin-top:8px;">${productData.shippingNote}</p>
              </div>`
                : ``}

              ${productData.protections?.length
                ? `
              <div>
                <div class="product-details-title"><span>Protections</span></div>
                <ul style="margin:8px 0 0 16px;">
                  ${productData.protections
                    .map(
                      (p) => `
                    <li style="margin:6px 0;">
                      ${p.header ? `<strong>${p.header}:</strong> ` : ``}
                      ${p.body || ''}
                    </li>`,
                    )
                    .join('')}
                </ul>
              </div>`
                : ``}

              ${(productData.company?.name || productData.company?.logo)
                ? `
              <div>
                <div class="product-details-title"><span>Supplier</span></div>
                <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
                  ${productData.company.logo ? `<img src="${productData.company.logo}" alt="Company logo" style="width:44px;height:44px;border-radius:6px;object-fit:cover;border:1px solid #eee;">` : ``}
                  <div>
                    ${productData.company.name ? `<div style="font-weight:600;">${productData.company.name}</div>` : ``}
                    ${productData.company.link ? `<a href="${productData.company.link}" target="_blank" rel="nofollow">View profile</a>` : ``}
                  </div>
                </div>
              </div>`
                : ``}

              ${(productData.company?.contactLink || productData.actions?.inquiryLabel || productData.actions?.chatLabel)
                ? `
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                ${productData.company.contactLink ? `<a href="${productData.company.contactLink}" target="_blank" rel="nofollow" class="btn btn-primary" style="padding:10px 14px;border:1px solid #222;border-radius:999px;text-decoration:none;">Contact Supplier</a>` : ``}
                ${productData.actions?.inquiryLabel ? `<button type="button" style="padding:10px 14px;border:1px solid #222;border-radius:999px;background:#d64000;color:#fff;">${productData.actions.inquiryLabel || 'Send inquiry'}</button>` : ``}
                ${productData.actions?.chatLabel ? `<button type="button" style="padding:10px 14px;border:1px solid #222;border-radius:999px;background:#fff;">${productData.actions.chatLabel || 'Chat now'}</button>` : ``}
              </div>`
                : ``}
            </div>
          `;
          attrAnchor.appendChild(section);
        }
      }

      // ---------- Also sync hidden priceProp (if present) ----------
      const pricePropInput = $('#priceProp', pool) as HTMLInputElement | null;
      if (pricePropInput && pricePropInput.value) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const meta = JSON.parse(pricePropInput.value.replace(/'/g, '"')) as Record<string, string>;
          // leave as-is; or update if you scrape payment terms/port elsewhere
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      // Swallow errors to avoid breaking page
      console.warn('HeroAutoFillClient error:', err);
    }
    // cleanup function: clear any pending timer intervals
    return () => {
      try {
        const timer = document.getElementById('pool-timer') as any;
        if (timer && typeof timer.__cleanupTimer === 'function') timer.__cleanupTimer();
      } catch {}
    };
  }, []);
  return null;
}
