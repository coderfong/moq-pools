#!/usr/bin/env node
/**
 * Scrape home categories for Alibaba and Made-in-China
 * Target: 100 listings per category
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const categories = [
  // Home Décor - Wall Art
  "Posters & Prints",
  "Canvas Frames",
  "Wall Stickers & Decals",
  "Tapestries",
  "3D Wall Panels",
  
  // Home Décor - Lighting
  "LED String Lights",
  "Night Lamps",
  "Fairy Lights",
  "Desk Lamps",
  "Neon Signs",
  
  // Home Décor - Decorative Accents
  "Vases & Pots",
  "Mini Sculptures",
  "Figurines & Ornaments",
  "Artificial Plants",
  "Table Centerpieces",
  
  // Home Décor - Aromatherapy
  "Diffusers",
  "Essential Oils",
  "Scented Candles",
  "Incense Burners",
  "Potpourri Sets",
  
  // Home Décor - Clocks
  "Wall Clocks",
  "Desk Clocks",
  "Retro Clocks",
  "Digital Displays",
  "DIY Clock Kits",
  
  // Kitchen & Dining - Cookware
  "Frying Pans",
  "Pots & Lids",
  "Steamers",
  "Non-stick Woks",
  "Grill Plates",
  
  // Kitchen & Dining - Tableware
  "Plates",
  "Bowls",
  "Cutlery Sets",
  "Chopsticks",
  "Serving Trays",
  
  // Kitchen & Dining - Drinkware
  "Glasses & Cups",
  "Tumblers & Bottles",
  "Mugs",
  "Straws & Straw Sets",
  "Drink Coasters",
  
  // Kitchen & Dining - Food Storage
  "Airtight Containers",
  "Jars & Canisters",
  "Lunch Boxes",
  "Vacuum Bags",
  "Zip Bags",
  
  // Kitchen & Dining - Kitchen Accessories
  "Aprons & Gloves",
  "Measuring Tools",
  "Spatulas & Utensils",
  "Cutting Boards",
  "Silicone Molds",
  
  // Home Organization - Closet Storage
  "Hangers",
  "Shoe Organizers",
  "Fabric Drawers",
  "Wardrobe Boxes",
  "Foldable Bins",
  
  // Home Organization - Bathroom Storage
  "Shower Racks",
  "Corner Shelves",
  "Toothbrush Holders",
  "Soap Dishes",
  "Hanging Baskets",
  
  // Home Organization - Desk Storage
  "Pen Holders",
  "Drawer Organizers",
  "Cable Boxes",
  "File Holders",
  "Book Stands",
  
  // Home Organization - Kitchen Organization
  "Spice Racks",
  "Sink Organizers",
  "Pantry Containers",
  "Dish Racks",
  "Fridge Bins",
  
  // Home Organization - Laundry
  "Laundry Bags",
  "Drying Racks",
  "Ironing Mats",
  "Storage Hampers",
  "Clothing Pegs"
];

console.log('\n🏠 Home Categories Scraping Script');
console.log('═'.repeat(70));
console.log(`Total Categories: ${categories.length}`);
console.log(`Target: 100 listings per category per platform`);
console.log(`Platforms: Alibaba.com, Made-in-China`);
console.log(`Total Target: ${categories.length * 2 * 100} listings`);
console.log('═'.repeat(70));

console.log('\n📋 To scrape these categories, use the built-in commands:');
console.log('\n1️⃣  For Made-in-China (100 per category):');
console.log('   pnpm mic:min100');

console.log('\n2️⃣  For Alibaba (100 per category):');
console.log('   pnpm alibaba:min100');

console.log('\n💡 These commands will automatically:');
console.log('   - Fetch 100+ listings for each category');
console.log('   - Save to database');
console.log('   - Download images to /public/cache/');
console.log('   - Use headless browser for proper scraping');

console.log('\n⚠️  IMPORTANT NOTES:');
console.log('   - This will take several hours to complete');
console.log('   - Made-in-China is faster (no headless browser needed)');
console.log('   - Alibaba requires Playwright/Chrome (slower but more accurate)');
console.log('   - Run them separately to avoid timeouts');

console.log('\n🚀 Ready to Start?');
console.log('═'.repeat(70));
console.log('\nRun: pnpm mic:min100      (Start with Made-in-China)');
console.log('Then: pnpm alibaba:min100 (Then do Alibaba)');
console.log('═'.repeat(70) + '\n');
