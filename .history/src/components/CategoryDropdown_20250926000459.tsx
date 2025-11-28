'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Monitor, Dumbbell, NotebookText, Armchair, Shield, Shirt, Home, Sparkles, Gem,
  Briefcase, Package, Puzzle, Droplet, HeartPulse, Gift, PawPrint, Factory,
  Building2, Hammer, Building, Lightbulb, Plug, Car, Cog, Wrench, Sun, Boxes,
  FlaskConical, Zap, Cpu, Truck, Leaf, Layers
} from 'lucide-react';

type Category = {
  key: string;
  label: string;
  term: string;
  featured?: string[]; // subcategories
};

const ICONS: Record<string, LucideIcon> = {
  'consumer-electronics': Monitor,
  'sports-entertainment': Dumbbell,
  'school-office': NotebookText,
  'furniture': Armchair,
  'safety-security': Shield,
  'apparel-accessories': Shirt,
  'home-garden': Home,
  'beauty': Sparkles,
  'jewelry-eyewear-watches': Gem,
  'shoes-accessories': Briefcase,
  'luggage-bags-cases': Briefcase,
  'packaging-printing': Package,
  'parents-kids-toys': Puzzle,
  'personal-home-care': Droplet,
  'health-medical': HeartPulse,
  'gifts-crafts': Gift,
  'pet-supplies': PawPrint,
  'industrial-machinery': Factory,
  'commercial-equipment': Building2,
  'construction-building-machinery': Hammer,
  'construction-real-estate': Building,
  'lights-lighting': Lightbulb,
  'home-appliances': Plug,
  'automotive-supplies': Car,
  'vehicle-parts': Cog,
  'tools-hardware': Wrench,
  'renewable-energy': Sun,
  'electrical-equipment': Plug,
  'material-handling': Boxes,
  'testing-instruments': FlaskConical,
  'power-transmission': Zap,
  'electronic-components': Cpu,
  'vehicles-transportation': Truck,
  'agriculture-food-beverage': Leaf,
  'raw-materials': Layers,
  'fabrication-services': Factory,
};

const CATEGORIES: Category[] = [
  { key: 'consumer-electronics', label: 'Consumer Electronics', term: 'Consumer Electronics', featured: [
    'Gaming Mouse','Gaming Keyboards','Mouse','Tablet PC','Gaming Laptops','Keyboards','Laptops','Computer Accessories','Computer Parts','Keycaps','Computer Case','Keyboard And Mouse','Desktops'
  ]},
  { key: 'sports-entertainment', label: 'Sports & Entertainment', term: 'Sports & Entertainment', featured: [
    'Bicycle Accessories','Jetski','Fishing Accessories','Accessories','Bicycle','Keyboard Instrument','Piano Keyboard','Camping Gear','Scooter Accessories','Bicycle Parts','Travel Trailers','Novelties','Hunting Accessories'
  ]},
  { key: 'school-office', label: 'School & Office Supplies', term: 'School & Office Supplies', featured: [
    'Badge Holder','Highlighters','Staplers','Laminator','Art Supplies','Typewriter','Notebooks','Gouache Paint','Plotter Cutter','Hole Punches','Electronic Dictionary','Office Stationery','Cutting Plotter'
  ]},
  { key: 'furniture', label: 'Furniture', term: 'Furniture', featured: [
    'Storage Cabinet','Plastic Chair','Baby Cribs','Baby Bed','Desk','Gaming Tables','Gaming Desk','Luggage Racks','Baby Fence','Wardrobe Closet','Waiting Chairs','Furniture accessories','Wedding Table'
  ]},
  { key: 'safety-security', label: 'Safety & Security', term: 'Safety & Security', featured: [
    'Micro Camera','Army Boots','Hidden Camera','Spy Camera','Mini Cameras','Boots','Keys','Respirator','Emergency Kits','Underwater Camera','Traffic Lights','Locksmith Tools','Wireless Camera'
  ]},
  { key: 'apparel-accessories', label: 'Apparel & Accessories', term: 'Apparel & Accessories', featured: [
    'Witch Costume','Top Hat','Fishing Suit','African Clothes','Church Hats','Carnival Costume','African Clothing','Boy Swimming Trunks','Knight Costume','Dreadlocks Cap','Collar Stays','Stage Costume','Clothing Chains'
  ]},
  { key: 'home-garden', label: 'Home & Garden', term: 'Home & Garden', featured: [
    'Irrigation Sprinkler','Dry herb vaporizers','Wedding Backdrop','Living Room Decoration','Christmas Gifts','Home Decor','Christmas decorations','Batter Dispenser','Opener Keychain','Fruit Tray','Glass Holder','Serviettes','Herb Vaporizer'
  ]},
  { key: 'beauty', label: 'Beauty', term: 'Beauty', featured: [
    'Cryolipolysis Slimming Machine','Eye Cream','Face Cream','Manicure Tables','Nail Supplies','Skin Care Products','Cosmetic','Rotary Machine','Cleaning Gel','Tanning Machine','Tattoo Guns','Tanning Bed','Nail Equipments'
  ]},
  { key: 'jewelry-eyewear-watches', label: 'Jewelry, Eyewear & Watches', term: 'Jewelry Eyewear Watches', featured: [
    'Moonstone','Hair Sticks','Fashion accessories','Fine Jewelry Earrings','Fine Jewelry Necklaces','Contact Lenses','Jewelry','Pocket Watch Chains','Tie Pin','Forehead Jewelry','Hematite Beads','Spacer Beads','Medical Glasses'
  ]},
  { key: 'shoes-accessories', label: 'Shoes & Accessories', term: 'Shoes & Accessories', featured: [
    'Cowboy Boots','Ankle Boots','Flat Shoes','Women Boots','Sandals','Men shoes','Women shoes','Fur Shoe','Leather Sandals','Leather Boots','Hunting Boots','Shoe Accessories','Winter Boots'
  ]},
  { key: 'luggage-bags-cases', label: 'Luggage, Bags & Cases', term: 'Luggage Bags Cases', featured: [
    "Men's Backpacks","Tactical Backpacks","Men's Handbags","Women's Backpacks",'Shoulder Bag','Backpack','Bag','Hydration Backpack','Basketball Bag','Sports Backpack','Hiking Backpack','Trolley Bag','Crossbody Bag'
  ]},
  { key: 'packaging-printing', label: 'Packaging & Printing', term: 'Packaging & Printing', featured: [
    'Food Bag','Pill Box','Wine Bottle','Pepper Spray','Wedding Favors','Plastic Bottles','Coffee Cup','Propane Tank','Beer Kegs','Card Box','Wedding Bag','Growth Hormone','Plastic Tray'
  ]},
  { key: 'parents-kids-toys', label: 'Parents, Kids & Toys', term: 'Parents Kids Toys', featured: [
    'Candy Toys','Boys clothing','Organizers','Party Decoration','Swimming Pool','Baby Strollers','Toys','Diy Toys','Water Toys','Light-up Toys','Infant Car Seats','Plush Backpacks','Airgun'
  ]},
  { key: 'personal-home-care', label: 'Personal Care & Home Care', term: 'Personal Care Home Care', featured: [
    'Bleach','Glass Cleaners','Liquid Soap','Hair Extension Tools','Scissors','Washing Powder','Detergent','Barber Vest','Massage Cream','Disinfectant','Kitchen Cleaner','Hand Wash','Toilet Cleaners'
  ]},
  { key: 'health-medical', label: 'Health & Medical', term: 'Health & Medical', featured: [
    'Continuous Glucose Monitor','Ginseng','Stretcher','Oxygen Concentrator','Electric Wheelchair','Wheelchair','Collagen','Nebulizer Mask','Nursing Chair','Sterilizer Box','Patient Lift','Cpap Machine','Insulin Pen'
  ]},
  { key: 'gifts-crafts', label: 'Gifts & Crafts', term: 'Gifts & Crafts', featured: [
    'Leather Keychain','Promotional Business Gifts','Wedding Souvenirs','Natural stone','Wedding Invitation','Gift Sets','Keychain','Wood Key Chains','Citrine','Crystal Keychain','Window Stickers','Bamboo Fan','Enamel'
  ]},
  { key: 'pet-supplies', label: 'Pet Supplies', term: 'Pet Supplies', featured: [
    'Parrot Cage','Dog Crate','Hamster Cage','Cat Toy','Bird Cage','Aquariums','Pet Accessories','Poop Bag Dispenser','Dog Toilet','Aquarium Plants','Dog Snacks','Dog Backpack','Stain Removers'
  ]},
  { key: 'industrial-machinery', label: 'Industrial Machinery', term: 'Industrial Machinery', featured: [
    'Sorting Machine','Wet Grinder','Spindle Motor','Shafts','Peeling Machine','Balers','Table','Pneumatic Connector','Bho Extractor','Honey Centrifuge','Linear Robots','Honey Filter','Gear Cutting Machines'
  ]},
  { key: 'commercial-equipment', label: 'Commercial Equipment & Machinery', term: 'Commercial Equipment Machinery', featured: [
    'Buffet Table','Christmas Inflatable','Kitchen Machines','Bakery Equipment','Cutting Machine','Freezers','Water Filter','Printing Materials','Promotion Tables','Security Robots','Headphone Stand','Cooking Machine','Cream Machine'
  ]},
  { key: 'construction-building-machinery', label: 'Construction & Building Machinery', term: 'Construction Building Machinery', featured: [
    'Power Plant','Pavers','Mining Machinery','Crusher','Construction Machine','Crane','Concrete Pumps','Drill Head','Rippers','Stone Cutter','Forming Machine','Hydraulic Crane','Steam Turbine'
  ]},
  { key: 'construction-real-estate', label: 'Construction & Real Estate', term: 'Construction & Real Estate', featured: [
    'Tombstones','Veneers','Liquid Soap Dispensers','Exterior Doors','Toilet Accessories','Fireplaces','Doors','Garden Faucet','Robe Hooks','Filling Valves','Grating','Automatic Sliding Door','Gravel'
  ]},
  { key: 'lights-lighting', label: 'Lights & Lighting', term: 'Lights & Lighting', featured: [
    'Garden Lights','Outdoor Lighting','Led Lamp','Ceiling Lights','Lamp','Light','Led Light','Motif Lights','Lamp LED','Halloween lights','Smart Outdoor Lights','Garage Light','Working Light'
  ]},
  { key: 'home-appliances', label: 'Home Appliances', term: 'Home Appliances', featured: [
    'Industrial Fans','Gas Heaters','Water Cooler','Clothes Dryers','Car Refrigerators','Water Purifier','Kitchen Appliances','Refrigerator Motor','Vacuum Cleaner Motor','Electric Knives','Coffee Kettle','Washing Machine Motor','Toaster Ovens'
  ]},
  { key: 'automotive-supplies', label: 'Automotive Supplies & Tools', term: 'Automotive Supplies Tools', featured: [
    'Interior Accessories','Car Interior Accessories','Car Alarms','Wax','Car Vacuum Cleaner','Cloth','Car Stickers','Exhaust Valve','Ramps','Tire Repair Tools','Car Decal','Emergency Tools','Car Organizers'
  ]},
  { key: 'vehicle-parts', label: 'Vehicle Parts & Accessories', term: 'Vehicle Parts & Accessories', featured: [
    // subcategories could be expanded later
  ]},
  { key: 'tools-hardware', label: 'Tools & Hardware', term: 'Tools & Hardware', featured: []},
  { key: 'renewable-energy', label: 'Renewable Energy', term: 'Renewable Energy', featured: []},
  { key: 'electrical-equipment', label: 'Electrical Equipment & Supplies', term: 'Electrical Equipment Supplies', featured: [
    'Cable Connector','Fuse Box','Limit Switches','Battery Terminal','Power Strips','Electrical Equipment','Connectors','Power Converter','Power Factor Controllers','Wire Clip','Electrical instruments','Patch Panel','Flow Switches'
  ]},
  { key: 'material-handling', label: 'Material Handling', term: 'Material Handling', featured: [
    'Trolley Cart','Pallet Truck','Winches','Conveyor Belt','Roller','Shelves','Forklifts','Anchor Winch','Forklift Parts','Casters','Forklift Truck','Manipulator','Lifter'
  ]},
  { key: 'testing-instruments', label: 'Testing Instrument & Equipment', term: 'Testing Instrument Equipment', featured: [
    'Gas Regulator','Infrared Camera','Lab Equipment','Weighing Scales','Oscilloscopes','Digital Scale','Thermal Camera','Ph Test Strips','Measuring instruments','Dissolved Oxygen Meter','Gnss Receiver','Oxygen Regulator','Body Composition Analyzer'
  ]},
  { key: 'power-transmission', label: 'Power Transmission', term: 'Power Transmission', featured: [
    'Fan Motor','Hydraulic Motors','Linear Actuator','Gearboxes','Hydraulic Cylinders','Bearing','Motor','Conveyor Chain','Sprockets','Bushing','Bushings','Joint','Vibration Motors'
  ]},
  { key: 'electronic-components', label: 'Electronic Components', term: 'Electronic Components', featured: [
    'Touch Screen','Motion Sensor','Sensor','Power Supplies','LEDs','Keypad','Switches','Solenoids','Buzzer','Rectifiers','Encoders','Transistors','Antenna'
  ]},
  { key: 'vehicles-transportation', label: 'Vehicles & Transportation', term: 'Vehicles & Transportation', featured: [
    'Gas Scooters','UTVs','Golf Carts','Dirt Bike','ATVs','Electric Motorcycles','Motorcycle','Cruiser Motorcycles','Dump Trailer','Hybrid Car','Sportbikes','Electric ATVs','Pit Bike'
  ]},
  { key: 'agriculture-food-beverage', label: 'Agriculture, Food & Beverage', term: 'Agriculture Food Beverage', featured: [
    'Brandy','Fresh fruit','Mayonnaise','Fish Pond','Bread','Ice Cream','Pizza','Quinoa','Vinegar','Hams','Boer Goats','Mooncakes','Rum'
  ]},
  { key: 'raw-materials', label: 'Raw Materials', term: 'Raw Materials', featured: [
    'Sodium Hydroxide','Tweed Fabric','Herbicides','Zinc','Fabric','PET','PC','Polyurethane Rubber','Transmission Oils','Silk Yarn','Calcium Nitrate','Fungicides','Potassium Nitrate'
  ]},
  { key: 'fabrication-services', label: 'Fabrication Services', term: 'Fabrication Services', featured: [
    'Concrete Blocks Molds','Casting Services','Sheet Metal Fabrication','Machining Services','Plastic Mold','Moulds','Concrete Molds','Steel Products','Metal Products','Injection Mould','Plastic Model','Press Mold','Forging Services'
  ]},
  // Service removed per request
];

export default function CategoryDropdown({ platform, currentQuery }: { platform: string; currentQuery?: string }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const pathname = usePathname();
  const params = useSearchParams();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const active = CATEGORIES[activeIdx] ?? CATEGORIES[0];
  const baseHref = (term: string) => `/products?platform=${platform}&q=${encodeURIComponent(term)}&per=50&page=1`;

  const filteredFeatured = useMemo(() => active?.featured || [], [active]);

  // Close dropdown when route or query changes (browsing results)
  useEffect(() => { setOpen(false); }, [pathname, params.toString()]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-gray-200 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white shadow-sm"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
        <span className="font-medium">Categories</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Desktop mega menu */}
      {open && (
        <div className="hidden md:block absolute z-20 mt-2 w-[min(90vw,960px)] max-h-[70vh] overflow-auto rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl p-3">
          <div className="flex gap-3">
            {/* Left: category list */}
            <div className="w-64 shrink-0 border-r pr-2">
              <div className="text-xs text-gray-500 mb-2">Categories for you</div>
              <ul className="space-y-1">
                {CATEGORIES.map((c, idx) => {
                  const isActive = idx === activeIdx;
                  const Icon = ICONS[c.key] ?? Package;
                  return (
                    <li key={c.key}>
                      <button
                        type="button"
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
                        onClick={() => setActiveIdx(idx)}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        {c.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            {/* Right: featured selections */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Browse featured selections</div>
                <Link href={baseHref(active.term)} className="text-xs text-blue-600 underline">View all</Link>
              </div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredFeatured.length === 0 ? (
                  <div className="text-xs text-gray-500 col-span-full">No featured selections.</div>
                ) : (
                  filteredFeatured.map((f) => (
                    <Link key={f} href={baseHref(f)} className="border rounded-xl px-3 py-2 text-sm hover:bg-gray-50 shadow-sm">
                      {f}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sheet */}
      <div className={`md:hidden fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <div className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 transition-transform duration-200 ${open ? 'translate-y-0' : 'translate-y-full'}`} role="dialog" aria-modal="true">
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-200 mb-3" />
          <div className="text-sm font-medium mb-3">Categories</div>
          <ul className="max-h-[60vh] overflow-auto divide-y">
            {CATEGORIES.map((c, idx) => {
              const Icon = ICONS[c.key] ?? Package;
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 py-3"
                    onClick={() => { setActiveIdx(idx); }}
                  >
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left">{c.label}</span>
                    <Link href={baseHref(c.term)} className="text-xs text-blue-600 underline" onClick={() => setOpen(false)}>View</Link>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
