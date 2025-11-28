/**
 * Test Made-in-China detail scraper with a specific URL
 */

import { fetchProductDetail } from '../src/lib/providers/detail';

const url = process.argv[2] || 'https://designsdelivery.en.made-in-china.com/product/iGqpgaUTOMcC/China-Honeycomb-Cast-Iron-Milk-Pot-Non-Stick-Die-Casting-Frying-Pans-with-Beech-Handle-Lightweight-Cast-Iron-Wok.html';

async function testExtraction() {
  console.log('Testing Made-in-China detail extraction...\n');
  console.log(`URL: ${url}\n`);
  
  try {
    const result = await fetchProductDetail(url);
    
    if (!result) {
      console.error('❌ Failed to fetch product details');
      return;
    }
    
    console.log('✅ Product details fetched successfully!\n');
    console.log(`Title: ${result.title || 'N/A'}`);
    console.log(`Price: ${result.priceText || 'N/A'}`);
    console.log(`MOQ: ${result.moqText || 'N/A'}`);
    
    const attrs = result.attributes || [];
    console.log(`\n=== ATTRIBUTES (${attrs.length}) ===`);
    
    if (attrs.length > 0) {
      // Group attributes by likely source
      const basicInfo: Array<{label:string; value:string}> = [];
      const packaging: Array<{label:string; value:string}> = [];
      const productDesc: Array<{label:string; value:string}> = [];
      const other: Array<{label:string; value:string}> = [];
      
      attrs.forEach(attr => {
        const label = attr.label.toLowerCase();
        if (/model|size|material|certification|handle|style|cover|packing|logo|quality|sample|transport|specification|trademark|origin|hs code|production capacity/i.test(label)) {
          basicInfo.push(attr);
        } else if (/package size|package.*weight|gross weight/i.test(label)) {
          packaging.push(attr);
        } else if (/item no|description|season|bottom|interior|exterior|lead time|commercial buyer/i.test(label)) {
          productDesc.push(attr);
        } else {
          other.push(attr);
        }
      });
      
      if (basicInfo.length > 0) {
        console.log('\n📋 Basic Info Section:');
        basicInfo.forEach((attr, i) => {
          console.log(`  ${i + 1}. ${attr.label}: ${attr.value}`);
        });
      }
      
      if (packaging.length > 0) {
        console.log('\n📦 Packaging & Delivery Section:');
        packaging.forEach((attr, i) => {
          console.log(`  ${i + 1}. ${attr.label}: ${attr.value}`);
        });
      }
      
      if (productDesc.length > 0) {
        console.log('\n📝 Product Description Section:');
        productDesc.forEach((attr, i) => {
          console.log(`  ${i + 1}. ${attr.label}: ${attr.value}`);
        });
      }
      
      if (other.length > 0) {
        console.log('\n🔧 Other Attributes:');
        other.forEach((attr, i) => {
          console.log(`  ${i + 1}. ${attr.label}: ${attr.value}`);
        });
      }
      
      console.log('\n=== SUMMARY ===');
      console.log(`✓ Total attributes: ${attrs.length}`);
      console.log(`  - Basic Info: ${basicInfo.length}`);
      console.log(`  - Packaging: ${packaging.length}`);
      console.log(`  - Product Description: ${productDesc.length}`);
      console.log(`  - Other: ${other.length}`);
    } else {
      console.log('  (No attributes extracted)');
    }
    
    console.log(`\n=== IMAGES ===`);
    console.log(`Hero Image: ${result.heroImage || 'N/A'}`);
    const gallery = result.gallery || [];
    console.log(`Gallery Images: ${gallery.length}`);
    gallery.slice(0, 5).forEach((img, i) => {
      console.log(`  ${i + 1}. ${img}`);
    });
    if (gallery.length > 5) {
      console.log(`  ... and ${gallery.length - 5} more`);
    }
    
    console.log(`\n=== SUPPLIER ===`);
    console.log(`Name: ${result.supplier?.name || 'N/A'}`);
    console.log(`Type: ${result.supplier?.type || 'N/A'}`);
    console.log(`Location: ${result.supplier?.location || 'N/A'}`);
    console.log(`Member Since: ${result.supplier?.memberSince || 'N/A'}`);
    if ((result.supplier?.badges?.length || 0) > 0) {
      console.log(`Badges: ${result.supplier?.badges?.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testExtraction();
