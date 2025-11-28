#!/usr/bin/env node
/**
 * Fix Made-in-China listings that are missing images
 * Re-scrapes detail pages to extract images from sr-proMainInfo-slide-pageUl
 */

import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

function normalize(url) {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('//')) u = 'https:' + u;
  else if (u.startsWith('/')) u = 'https://www.made-in-china.com' + u;
  return u;
}

function looksLikeVideo(url) {
  const lower = url.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('video');
}

async function extractImagesFromHTML(html) {
  const $ = cheerio.load(html);
  const imgs = [];
  const valid = [];
  const entries = [];

  // Extract from sr-proMainInfo-slide-pageUl (the main product gallery)
  const galleryLis = $('ul.sr-proMainInfo-slide-pageUl li.J-pic-dot, div.sr-proMainInfo-slide-pageMain li.J-pic-dot');
  
  console.log(`  Found ${galleryLis.length} gallery items`);
  
  if (galleryLis.length) {
    galleryLis.each((_, li) => {
      const liEl = $(li);
      const imgEl = liEl.find('img').first();
      
      // Try multiple attributes in order of preference
      const src = (
        imgEl.attr('data-original') || 
        imgEl.attr('data-src') || 
        imgEl.attr('src') || 
        ''
      ).trim();
      
      const hasVideoOverlay = !!liEl.find('a.img-video, .img-video, .J-dot-play, i.icon-play').length;
      
      if (src) {
        const abs = normalize(src);
        const isVid = looksLikeVideo(abs) || hasVideoOverlay;
        
        console.log(`    Image ${entries.length + 1}: ${abs.substring(0, 80)}... ${isVid ? '[VIDEO]' : '[IMAGE]'}`);
        
        imgs.push(abs);
        entries.push({ url: abs, video: isVid });
        if (!isVid) valid.push(abs);
      }
    });
  }

  // Fallback: try broader selectors
  if (!imgs.length) {
    console.log('  No gallery items, trying fallback selectors...');
    $('.sr-proMainInfo-slide-pageInside img, .J-proSlide-content img, .sr-proMainInfo-slide img').each((_, el) => {
      const src = ($(el).attr('data-original') || $(el).attr('data-src') || $(el).attr('src') || '').trim();
      if (src) {
        const abs = normalize(src);
        imgs.push(abs);
        if (!looksLikeVideo(abs)) valid.push(abs);
        console.log(`    Fallback image: ${abs.substring(0, 80)}...`);
      }
    });
  }

  // Prefer second non-video image (first is often video thumbnail)
  let pick = '';
  if (entries.length > 1) {
    const e = entries[1];
    if (e && !e.video) pick = e.url;
  }
  
  // If index 1 is missing or video, find next non-video
  if (!pick && entries.length) {
    for (let i = 1; i < entries.length; i++) {
      const e = entries[i];
      if (e && !e.video) {
        pick = e.url;
        break;
      }
    }
  }
  
  // Last resort: use first valid image
  if (!pick && valid.length) pick = valid[0];
  if (!pick && imgs.length) pick = imgs[0];

  console.log(`  Selected primary image: ${pick ? pick.substring(0, 80) + '...' : 'NONE'}`);
  console.log(`  Total images: ${imgs.length}, Valid (non-video): ${valid.length}`);

  return {
    primaryImage: pick,
    allImages: imgs,
    validImages: valid
  };
}

async function scrapeDetailPage(url) {
  console.log(`\n🌐 Fetching: ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!res.ok) {
      console.error(`  ❌ HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    return await extractImagesFromHTML(html);
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Finding Made-in-China listings with missing or invalid images...\n');

  // Find listings with no images or invalid image data
  const listings = await prisma.savedListing.findMany({
    where: {
      sourcePlatform: 'MADE_IN_CHINA',
      OR: [
        { imagesJson: null },
        { imagesJson: '' },
        { imagesJson: '[]' },
        { imagesJson: 'null' },
        { imagesJson: { contains: '"ERROR' } }
      ]
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      imagesJson: true
    }
  });

  console.log(`📦 Found ${listings.length} listings with missing images\n`);

  if (listings.length === 0) {
    console.log('✅ All Made-in-China listings have images!');
    await prisma.$disconnect();
    return;
  }

  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\n[${ i + 1}/${listings.length}] ${listing.title?.substring(0, 60) || 'Untitled'}...`);
    console.log(`Current images: ${listing.imagesJson || 'NONE'}`);

    if (!listing.sourceUrl) {
      console.log('  ⚠️  No source URL, skipping');
      failed++;
      continue;
    }

    // Add delay to be respectful
    if (i > 0) {
      console.log('  ⏳ Waiting 2s...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const result = await scrapeDetailPage(listing.sourceUrl);

    if (!result || !result.primaryImage) {
      console.log('  ❌ Could not extract images');
      failed++;
      continue;
    }

    // Update database
    try {
      await prisma.savedListing.update({
        where: { id: listing.id },
        data: {
          imagesJson: JSON.stringify(result.allImages),
          // Also update the main image field if it exists
          ...(result.primaryImage && { imageUrl: result.primaryImage })
        }
      });

      console.log(`  ✅ Updated with ${result.allImages.length} images`);
      fixed++;
    } catch (error) {
      console.error(`  ❌ Database update failed: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Total listings: ${listings.length}`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success rate: ${((fixed / listings.length) * 100).toFixed(1)}%`);

  await prisma.$disconnect();
}

main().catch(console.error);
