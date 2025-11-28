/**
 * Look for hidden price tier data in Made-in-China pages
 */

import * as cheerio from 'cheerio';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  return res.text();
}

const url = process.argv[2] || 'https://bosommetal.en.made-in-china.com/product/ZnRpPoNVbThW/China-Stainless-Steel-Utensils-Kitchenware-26cm-80cm-Multi-Size-Optional-Durable-Wok-Pan.html';

async function findHiddenPriceTiers() {
  console.log('Searching for hidden price tier data...\n');
  console.log(`URL: ${url}\n`);
  
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    // Check script tags for price data
    console.log('=== SCRIPT TAGS WITH PRICE DATA ===\n');
    $('script').each((i, script) => {
      const content = $(script).html() || '';
      if (/price|tier|quantity|moq/i.test(content) && !/gtag|analytics|sensor/i.test(content)) {
        console.log(`Script ${i}:`);
        // Look for JSON data
        const jsonMatch = content.match(/\{[^{}]*(?:"price"|"tier"|"quantity"|"moq")[^{}]*\}/gi);
        if (jsonMatch) {
          jsonMatch.forEach(json => {
            console.log(`  JSON: ${json.substring(0, 200)}`);
          });
        }
        
        // Look for array data
        const arrayMatch = content.match(/\[[^\[\]]*(?:price|tier|quantity|moq)[^\[\]]*\]/gi);
        if (arrayMatch) {
          arrayMatch.forEach(arr => {
            console.log(`  Array: ${arr.substring(0, 200)}`);
          });
        }
      }
    });
    
    // Check hidden input fields
    console.log('\n\n=== HIDDEN INPUT FIELDS ===\n');
    $('input[type="hidden"]').each((i, input) => {
      const name = $(input).attr('name') || $(input).attr('id') || '';
      const value = $(input).attr('value') || '';
      if (/price|tier|quantity|moq/i.test(name + value)) {
        console.log(`${name}: ${value.substring(0, 150)}`);
      }
    });
    
    // Check data attributes
    console.log('\n\n=== ELEMENTS WITH DATA ATTRIBUTES ===\n');
    $('[data-price], [data-tier], [data-quantity], [data-moq]').each((i, el) => {
      console.log(`Element ${i}:`);
      const attrs = el.attribs;
      Object.keys(attrs).forEach(key => {
        if (key.startsWith('data-')) {
          console.log(`  ${key}: ${attrs[key].substring(0, 100)}`);
        }
      });
    });
    
    // Look for table with multiple price rows
    console.log('\n\n=== LOOKING FOR PRICE TIER TABLES ===\n');
    $('.only-one-priceNum table, .price-table table, .baseInfo-price-related table').each((i, table) => {
      console.log(`\nTable ${i}:`);
      console.log('Full HTML:');
      console.log($(table).html());
      
      $(table).find('tr').each((rowIdx, tr) => {
        const cells = $(tr).find('td, th').map((_, cell) => {
          return $(cell).text().trim();
        }).get();
        console.log(`  Row ${rowIdx}: ${cells.join(' | ')}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findHiddenPriceTiers();
