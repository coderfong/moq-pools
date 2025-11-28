import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

type Attribute = {
  label: string;
  value: string;
};

async function extractMadeInChinaAttributes(url: string): Promise<Attribute[]> {
  const attrs: Attribute[] = [];
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.made-in-china.com/',
      },
      cache: 'no-store',
    });

    if (!response.ok) return attrs;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Method 1: Extract from specification tables
    $('.sr-proParameter table tr, .sr-proSpecification table tr, .detail-box table tr').each((_, row) => {
      const $row = $(row);
      const $th = $row.find('th');
      const $td = $row.find('td');
      
      if ($th.length && $td.length) {
        const label = $th.text().trim();
        const value = $td.text().trim();
        
        if (label && value && value.length < 500) { // Skip overly long values
          attrs.push({ label, value });
        }
      }
    });

    // Method 2: Extract from key-value pairs in divs
    $('.product-info dl dt, .product-info dl dd').each((idx, el) => {
      if (idx % 2 === 0) {
        const label = $(el).text().trim();
        const value = $(el).next('dd').text().trim();
        if (label && value && value.length < 500) {
          attrs.push({ label, value });
        }
      }
    });

    // Method 3: Extract from attribute lists
    $('.attr-list li, .spec-list li').each((_, li) => {
      const text = $(li).text().trim();
      const match = text.match(/^([^:：]+)[：:](.+)$/);
      if (match) {
        const [, label, value] = match;
        if (label && value && value.length < 500) {
          attrs.push({ label: label.trim(), value: value.trim() });
        }
      }
    });

  } catch (error) {
    console.error('Error extracting Made-in-China attributes:', error);
  }

  return attrs;
}

async function extractAlibabaAttributes(url: string): Promise<Attribute[]> {
  const attrs: Attribute[] = [];
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!response.ok) return attrs;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract from specification tables
    $('table.product-property-list tr, .sku-attr-list table tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');
      
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        
        if (label && value && value.length < 500) {
          attrs.push({ label, value });
        }
      }
    });

  } catch (error) {
    console.error('Error extracting Alibaba attributes:', error);
  }

  return attrs;
}

async function extractIndiaMartAttributes(url: string): Promise<Attribute[]> {
  const attrs: Attribute[] = [];
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://dir.indiamart.com/',
      },
      cache: 'no-store',
    });

    if (!response.ok) return attrs;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract from specification tables
    $('.specs table tr, .specifications table tr, .pdp-specs table tr').each((_, row) => {
      const $row = $(row);
      const $th = $row.find('th');
      const $td = $row.find('td');
      
      if ($th.length && $td.length) {
        const label = $th.text().trim();
        const value = $td.text().trim();
        
        if (label && value && value.length < 500) {
          attrs.push({ label, value });
        }
      }
    });

  } catch (error) {
    console.error('Error extracting IndiaMART attributes:', error);
  }

  return attrs;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    let attributes: Attribute[] = [];

    // Determine platform and extract accordingly
    if (url.includes('made-in-china.com')) {
      attributes = await extractMadeInChinaAttributes(url);
    } else if (url.includes('alibaba.com')) {
      attributes = await extractAlibabaAttributes(url);
    } else if (url.includes('indiamart.com')) {
      attributes = await extractIndiaMartAttributes(url);
    }

    // Filter out generic platform messages
    const skipPatterns = [
      /contact.*supplier/i,
      /every payment.*protected/i,
      /claim.*refund/i,
      /made-in-china\.com/i,
      /alibaba\.com/i,
      /indiamart\.com/i,
    ];

    const filtered = attributes.filter(attr => {
      return !skipPatterns.some(pattern => 
        pattern.test(attr.label) || pattern.test(attr.value)
      );
    });

    return NextResponse.json({ 
      attributes: filtered,
      count: filtered.length 
    }, { status: 200 });

  } catch (error) {
    console.error('Error in extract-attributes:', error);
    return NextResponse.json(
      { error: 'Internal server error', attributes: [] },
      { status: 500 }
    );
  }
}
