/**
 * Test Made-in-China detail scraper with new Basic Info, Packaging, and Product Description extraction
 */

import { fetchProductDetail } from '../src/lib/providers/detail';

async function testExtraction() {
  console.log('Testing Made-in-China detail extraction...\n');
  
  // Test URL from user's example (stainless steel cookware)
  const url = 'https://lihaohouseware.en.made-in-china.com/product/qwSAFlgZpRcd/China-316-Stainless-Steel-Wok-Slightly-Oily-Smoke-Double-Sided-Honeycomb-Non-Stick-Frying-Cookware.html';
  
  try {
    const result = await fetchProductDetail(url);
    
    if (!result) {
      console.error('❌ Failed to fetch product details');
      return;
    }
    
    console.log('✅ Product details fetched successfully!\n');
    console.log(`Title: ${result.title}`);
    console.log(`Price: ${result.priceText || 'N/A'}`);
    console.log(`MOQ: ${result.moqText || 'N/A'}`);
    console.log(`\n=== ATTRIBUTES (${result.attributes.length}) ===`);
    
    // Group attributes by likely source
    const basicInfo: typeof result.attributes = [];
    const packaging: typeof result.attributes = [];
    const productDesc: typeof result.attributes = [];
    const other: typeof result.attributes = [];
    
    result.attributes.forEach(attr => {
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
    
    console.log(`\n=== IMAGES ===`);
    console.log(`Hero Image: ${result.heroImage || 'N/A'}`);
    console.log(`\nGallery Images: ${result.gallery.length}`);
    result.gallery.slice(0, 5).forEach((img, i) => {
      console.log(`  ${i + 1}. ${img}`);
    });
    if (result.gallery.length > 5) {
      console.log(`  ... and ${result.gallery.length - 5} more`);
    }
    
    console.log(`\n=== SUPPLIER ===`);
    console.log(`Name: ${result.supplier.name || 'N/A'}`);
    console.log(`Type: ${result.supplier.type || 'N/A'}`);
    console.log(`Location: ${result.supplier.location || 'N/A'}`);
    console.log(`Member Since: ${result.supplier.memberSince || 'N/A'}`);
    if (result.supplier.badges.length > 0) {
      console.log(`Badges: ${result.supplier.badges.join(', ')}`);
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`✓ Total attributes extracted: ${result.attributes.length}`);
    console.log(`✓ Basic Info: ${basicInfo.length}`);
    console.log(`✓ Packaging: ${packaging.length}`);
    console.log(`✓ Product Description: ${productDesc.length}`);
    console.log(`✓ Images: ${result.gallery.length}`);
    
    // Expected fields from the HTML
    const expectedFields = [
      'Model NO.',
      'Size',
      'Material',
      'Certification',
      'Handle',
      'Style',
      'Package Size',
      'Package Gross Weight',
      'Item No.',
      'Description',
      'Packing',
      'Bottom',
      'Interior',
      'Exterior',
      'Lead Time'
    ];
    
    const found = expectedFields.filter(field => 
      result.attributes.some(attr => 
        attr.label.toLowerCase().includes(field.toLowerCase()) ||
        field.toLowerCase().includes(attr.label.toLowerCase())
      )
    );
    
    console.log(`\n📊 Expected fields found: ${found.length}/${expectedFields.length}`);
    if (found.length < expectedFields.length) {
      const missing = expectedFields.filter(f => !found.some(fnd => 
        fnd.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(fnd.toLowerCase())
      ));
      console.log(`Missing: ${missing.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testExtraction();
