/**
 * Populate Alibaba and Made-in-China listings for Home Décor categories
 * Target: 100 listings per category per platform
 */

const categories = {
  "Home Décor": {
    "Wall Art": [
      "Posters & Prints",
      "Canvas Frames",
      "Wall Stickers & Decals",
      "Tapestries",
      "3D Wall Panels"
    ],
    "Lighting": [
      "LED String Lights",
      "Night Lamps",
      "Fairy Lights",
      "Desk Lamps",
      "Neon Signs"
    ],
    "Decorative Accents": [
      "Vases & Pots",
      "Mini Sculptures",
      "Figurines & Ornaments",
      "Artificial Plants",
      "Table Centerpieces"
    ],
    "Aromatherapy": [
      "Diffusers",
      "Essential Oils",
      "Scented Candles",
      "Incense Burners",
      "Potpourri Sets"
    ],
    "Clocks": [
      "Wall Clocks",
      "Desk Clocks",
      "Retro Clocks",
      "Digital Displays",
      "DIY Clock Kits"
    ]
  },
  "Kitchen & Dining": {
    "Cookware": [
      "Frying Pans",
      "Pots & Lids",
      "Steamers",
      "Non-stick Woks",
      "Grill Plates"
    ],
    "Tableware": [
      "Plates",
      "Bowls",
      "Cutlery Sets",
      "Chopsticks",
      "Serving Trays"
    ],
    "Drinkware": [
      "Glasses & Cups",
      "Tumblers & Bottles",
      "Mugs",
      "Straws & Straw Sets",
      "Drink Coasters"
    ],
    "Food Storage": [
      "Airtight Containers",
      "Jars & Canisters",
      "Lunch Boxes",
      "Vacuum Bags",
      "Zip Bags"
    ],
    "Kitchen Accessories": [
      "Aprons & Gloves",
      "Measuring Tools",
      "Spatulas & Utensils",
      "Cutting Boards",
      "Silicone Molds"
    ]
  },
  "Home Organization": {
    "Closet Storage": [
      "Hangers",
      "Shoe Organizers",
      "Fabric Drawers",
      "Wardrobe Boxes",
      "Foldable Bins"
    ],
    "Bathroom Storage": [
      "Shower Racks",
      "Corner Shelves",
      "Toothbrush Holders",
      "Soap Dishes",
      "Hanging Baskets"
    ],
    "Desk Storage": [
      "Pen Holders",
      "Drawer Organizers",
      "Cable Boxes",
      "File Holders",
      "Book Stands"
    ],
    "Kitchen Organization": [
      "Spice Racks",
      "Sink Organizers",
      "Pantry Containers",
      "Dish Racks",
      "Fridge Bins"
    ],
    "Laundry": [
      "Laundry Bags",
      "Drying Racks",
      "Ironing Mats",
      "Storage Hampers",
      "Clothing Pegs"
    ]
  }
};

// Flatten all categories into a list
const allCategories = [];
for (const mainCat in categories) {
  for (const subCat in categories[mainCat]) {
    for (const item of categories[mainCat][subCat]) {
      allCategories.push(item);
    }
  }
}

console.log(`\n📦 Home Categories Scraping Plan`);
console.log('═'.repeat(70));
console.log(`Total Categories: ${allCategories.length}`);
console.log(`Target per Platform: 100 listings/category`);
console.log(`Platforms: Alibaba.com, Made-in-China`);
console.log(`Total Target Listings: ${allCategories.length * 2 * 100} (${allCategories.length} × 2 platforms × 100)`);
console.log('═'.repeat(70));

console.log('\n📋 Categories to Scrape:');
console.log('─'.repeat(70));

let count = 1;
for (const mainCat in categories) {
  console.log(`\n${mainCat}:`);
  for (const subCat in categories[mainCat]) {
    console.log(`  ${subCat}:`);
    for (const item of categories[mainCat][subCat]) {
      console.log(`    ${count}. ${item}`);
      count++;
    }
  }
}

console.log('\n' + '═'.repeat(70));
console.log('\n⚠️  NEXT STEPS:');
console.log('─'.repeat(70));
console.log('1. Use the existing scraping scripts to populate these categories');
console.log('2. Run for Alibaba.com with 100 items per category');
console.log('3. Run for Made-in-China with 100 items per category');
console.log('\nSuggested commands:');
console.log('  - For Alibaba: node scripts/populate-alibaba.js');
console.log('  - For Made-in-China: node scripts/populate-madeinchina.js');
console.log('═'.repeat(70));
console.log('\n💡 Category list saved. Ready to start scraping!');

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { categories, allCategories };
}
