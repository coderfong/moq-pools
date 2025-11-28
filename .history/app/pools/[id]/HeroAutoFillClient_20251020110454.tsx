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

            // Create UI elements
            const wrap = document.createElement('section');
            wrap.className = 'max-w-3xl';
            wrap.innerHTML = `
              <div class="mt-3 flex items-center gap-3">
                <label for="qty" class="text-sm font-semibold">Qty</label>
                <input id="qty" type="number" value="${Math.max(1, parsed[0].min)}" min="1" step="1"
                       class="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black focus:ring-4 focus:ring-black/10" />
              </div>
              <div class="mt-3">
                <div id="progressbar" class="relative h-3 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100" role="progressbar" aria-valuemin="0" aria-valuemax="${MAX}" aria-valuenow="0" aria-label="Order quantity toward best price tier">
                  <div class="pointer-events-none absolute inset-y-0 left-0 w-[10%] bg-black/5"></div>
                  <div id="fill" class="absolute inset-y-0 left-0 w-0 bg-black transition-[width] duration-200 ease-out"></div>
                </div>
                <div class="mt-1 flex justify-between text-[12px] text-gray-500">
                  ${[...thresholds, MAX].map(v => `<span>${v}</span>`).join('')}
                </div>
              </div>
            `;

            progressHost.innerHTML = '';
            progressHost.appendChild(wrap);

            const qty = wrap.querySelector('#qty') as HTMLInputElement;
            const bar = wrap.querySelector('#progressbar') as HTMLElement;
            const fill = wrap.querySelector('#fill') as HTMLElement;
            const legend = wrap.querySelector('.legend') as HTMLElement;

            // Add ticks
            // Add ticks inside bar
            const addTick = (xPct: number) => {
              const tick = document.createElement('span');
              tick.setAttribute('aria-hidden', 'true');
              tick.className = 'absolute top-1/2 h-3 w-px -translate-y-1/2 bg-gray-400';
              tick.style.left = `${xPct}%`;
              bar.appendChild(tick);

            // Compute percent for a quantity
            const pctFor = (q: number) => Math.min(100, (q / MAX) * 100);

            // Ticks at each threshold and final max
            thresholds.forEach((t) => addTick(pctFor(t), String(t)));
            addTick(100, String(MAX));

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

            const update = () => {
              const q = Math.max(1, parseInt(qty.value || '1', 10));
              const pct = pctFor(q);
              fill.style.width = pct + '%';
              bar.setAttribute('aria-valuenow', String(Math.min(q, MAX)));
              highlightTier(q);
            };

            qty.addEventListener('input', update);
            update();
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
  }, []);
  return null;
}
