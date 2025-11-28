import type { LucideIcon } from 'lucide-react';
import {
  Monitor, Dumbbell, NotebookText, Armchair, Shield, Shirt, Home, Sparkles, Gem,
  Briefcase, Package, Puzzle, Droplet, HeartPulse, Gift, PawPrint, Factory,
  Building2, Hammer, Building, Lightbulb, Plug, Car, Cog, Wrench, Sun, Boxes,
  FlaskConical, Zap, Cpu, Truck, Leaf, Layers
} from 'lucide-react';

export type Category = {
  key: string;
  label: string;      // full label for menus
  shortLabel: string; // compact label for marquee chips
  term: string;       // canonical/base search term
  featured?: string[]; // curated featured sub-queries
  aliases?: string[];  // alternative root queries
  tags?: string[];     // semantic grouping tags (filtering, weighting)
  weight?: number;     // relative weight for rotation (defaults to 1)
  ingest?: {           // optional ingestion policies
    maxFeaturedPerCycle?: number; // limit number of featured terms per rotation cycle
    priority?: number;            // higher priority surfaces earlier
  };
};

export const ICONS: Record<string, LucideIcon> = {
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
  // Added extended IndiaMART-focused category groups
  'building-materials-equipment': Hammer,
  'pharma-drugs': HeartPulse,
  'hospital-medical-equipment': HeartPulse,
  'industrial-plants-machinery': Factory,
  'packaging-material-machines': Package,
  'chemicals-dyes': FlaskConical,
  'transportation-logistics': Truck,
};

export const CATEGORIES: Category[] = [
  { key: 'consumer-electronics', label: 'Consumer Electronics', shortLabel: 'Electronics', term: 'Consumer Electronics',
    tags: ['electronics','computers','gadgets'], weight: 1.2,
    aliases: ['computer accessories','gaming peripherals','laptop accessories'],
    ingest: { maxFeaturedPerCycle: 6, priority: 8 }, featured: [
    'Gaming Mouse','Gaming Keyboards','Mouse','Tablet PC','Gaming Laptops','Keyboards','Laptops','Computer Accessories','Computer Parts','Keycaps','Computer Case','Keyboard And Mouse','Desktops'
  ]},
  { key: 'sports-entertainment', label: 'Sports & Entertainment', shortLabel: 'Sports', term: 'Sports & Entertainment', featured: [
    'Bicycle Accessories','Jetski','Fishing Accessories','Accessories','Bicycle','Keyboard Instrument','Piano Keyboard','Camping Gear','Scooter Accessories','Bicycle Parts','Travel Trailers','Novelties','Hunting Accessories'
  ]},
  { key: 'school-office', label: 'School & Office Supplies', shortLabel: 'Office & School', term: 'School & Office Supplies', featured: [
    'Badge Holder','Highlighters','Staplers','Laminator','Art Supplies','Typewriter','Notebooks','Gouache Paint','Plotter Cutter','Hole Punches','Electronic Dictionary','Office Stationery','Cutting Plotter'
  ]},
  { key: 'furniture', label: 'Furniture', shortLabel: 'Furniture', term: 'Furniture', featured: [
    'Storage Cabinet','Plastic Chair','Baby Cribs','Baby Bed','Desk','Gaming Tables','Gaming Desk','Luggage Racks','Baby Fence','Wardrobe Closet','Waiting Chairs','Furniture accessories','Wedding Table'
  ]},
  { key: 'safety-security', label: 'Safety & Security', shortLabel: 'Security', term: 'Safety & Security', featured: [
    'Micro Camera','Army Boots','Hidden Camera','Spy Camera','Mini Cameras','Boots','Keys','Respirator','Emergency Kits','Underwater Camera','Traffic Lights','Locksmith Tools','Wireless Camera'
  ]},
  { key: 'apparel-accessories', label: 'Apparel & Accessories', shortLabel: 'Apparel', term: 'Apparel & Accessories', featured: [
    'Witch Costume','Top Hat','Fishing Suit','African Clothes','Church Hats','Carnival Costume','African Clothing','Boy Swimming Trunks','Knight Costume','Dreadlocks Cap','Collar Stays','Stage Costume','Clothing Chains'
  ]},
  { key: 'home-garden', label: 'Home & Garden', shortLabel: 'Home & Garden', term: 'Home & Garden', featured: [
    'Irrigation Sprinkler','Dry herb vaporizers','Wedding Backdrop','Living Room Decoration','Christmas Gifts','Home Decor','Christmas decorations','Batter Dispenser','Opener Keychain','Fruit Tray','Glass Holder','Serviettes','Herb Vaporizer'
  ]},
  { key: 'beauty', label: 'Beauty', shortLabel: 'Beauty', term: 'Beauty', featured: [
    'Cryolipolysis Slimming Machine','Eye Cream','Face Cream','Manicure Tables','Nail Supplies','Skin Care Products','Cosmetic','Rotary Machine','Cleaning Gel','Tanning Machine','Tattoo Guns','Tanning Bed','Nail Equipments'
  ]},
  { key: 'jewelry-eyewear-watches', label: 'Jewelry, Eyewear & Watches', shortLabel: 'Jewelry & Watches', term: 'Jewelry Eyewear Watches', featured: [
    'Moonstone','Hair Sticks','Fashion accessories','Fine Jewelry Earrings','Fine Jewelry Necklaces','Contact Lenses','Jewelry','Pocket Watch Chains','Tie Pin','Forehead Jewelry','Hematite Beads','Spacer Beads','Medical Glasses'
  ]},
  { key: 'shoes-accessories', label: 'Shoes & Accessories', shortLabel: 'Shoes', term: 'Shoes & Accessories', featured: [
    'Cowboy Boots','Ankle Boots','Flat Shoes','Women Boots','Sandals','Men shoes','Women shoes','Fur Shoe','Leather Sandals','Leather Boots','Hunting Boots','Shoe Accessories','Winter Boots'
  ]},
  { key: 'luggage-bags-cases', label: 'Luggage, Bags & Cases', shortLabel: 'Bags & Cases', term: 'Luggage Bags Cases', featured: [
    "Men's Backpacks","Tactical Backpacks","Men's Handbags","Women's Backpacks",'Shoulder Bag','Backpack','Bag','Hydration Backpack','Basketball Bag','Sports Backpack','Hiking Backpack','Trolley Bag','Crossbody Bag'
  ]},
  { key: 'packaging-printing', label: 'Packaging & Printing', shortLabel: 'Packaging', term: 'Packaging & Printing', featured: [
    'Food Bag','Pill Box','Wine Bottle','Pepper Spray','Wedding Favors','Plastic Bottles','Coffee Cup','Propane Tank','Beer Kegs','Card Box','Wedding Bag','Growth Hormone','Plastic Tray'
  ]},
  { key: 'parents-kids-toys', label: 'Parents, Kids & Toys', shortLabel: 'Kids & Toys', term: 'Parents Kids Toys', featured: [
    'Candy Toys','Boys clothing','Organizers','Party Decoration','Swimming Pool','Baby Strollers','Toys','Diy Toys','Water Toys','Light-up Toys','Infant Car Seats','Plush Backpacks','Airgun'
  ]},
  { key: 'personal-home-care', label: 'Personal Care & Home Care', shortLabel: 'Personal & Home Care', term: 'Personal Care Home Care', featured: [
    'Bleach','Glass Cleaners','Liquid Soap','Hair Extension Tools','Scissors','Washing Powder','Detergent','Barber Vest','Massage Cream','Disinfectant','Kitchen Cleaner','Hand Wash','Toilet Cleaners'
  ]},
  { key: 'health-medical', label: 'Health & Medical', shortLabel: 'Health & Medical', term: 'Health & Medical', featured: [
    'Continuous Glucose Monitor','Ginseng','Stretcher','Oxygen Concentrator','Electric Wheelchair','Wheelchair','Collagen','Nebulizer Mask','Nursing Chair','Sterilizer Box','Patient Lift','Cpap Machine','Insulin Pen'
  ]},
  { key: 'gifts-crafts', label: 'Gifts & Crafts', shortLabel: 'Gifts & Crafts', term: 'Gifts & Crafts', featured: [
    'Leather Keychain','Promotional Business Gifts','Wedding Souvenirs','Natural stone','Wedding Invitation','Gift Sets','Keychain','Wood Key Chains','Citrine','Crystal Keychain','Window Stickers','Bamboo Fan','Enamel'
  ]},
  { key: 'pet-supplies', label: 'Pet Supplies', shortLabel: 'Pet Supplies', term: 'Pet Supplies', featured: [
    'Parrot Cage','Dog Crate','Hamster Cage','Cat Toy','Bird Cage','Aquariums','Pet Accessories','Poop Bag Dispenser','Dog Toilet','Aquarium Plants','Dog Snacks','Dog Backpack','Stain Removers'
  ]},
  { key: 'industrial-machinery', label: 'Industrial Machinery', shortLabel: 'Industrial', term: 'Industrial Machinery',
    tags: ['industrial','machinery','equipment'], weight: 1.3, aliases: ['factory machines','industrial equipment'], ingest: { maxFeaturedPerCycle: 7, priority: 9 }, featured: [
    'Sorting Machine','Wet Grinder','Spindle Motor','Shafts','Peeling Machine','Balers','Table','Pneumatic Connector','Bho Extractor','Honey Centrifuge','Linear Robots','Honey Filter','Gear Cutting Machines'
  ]},
  { key: 'commercial-equipment', label: 'Commercial Equipment & Machinery', shortLabel: 'Commercial Equip', term: 'Commercial Equipment Machinery', featured: [
    'Buffet Table','Christmas Inflatable','Kitchen Machines','Bakery Equipment','Cutting Machine','Freezers','Water Filter','Printing Materials','Promotion Tables','Security Robots','Headphone Stand','Cooking Machine','Cream Machine'
  ]},
  { key: 'construction-building-machinery', label: 'Construction & Building Machinery', shortLabel: 'Construction Mach.', term: 'Construction Building Machinery', featured: [
    'Power Plant','Pavers','Mining Machinery','Crusher','Construction Machine','Crane','Concrete Pumps','Drill Head','Rippers','Stone Cutter','Forming Machine','Hydraulic Crane','Steam Turbine'
  ]},
  { key: 'construction-real-estate', label: 'Construction & Real Estate', shortLabel: 'Real Estate', term: 'Construction & Real Estate', featured: [
    'Tombstones','Veneers','Liquid Soap Dispensers','Exterior Doors','Toilet Accessories','Fireplaces','Doors','Garden Faucet','Robe Hooks','Filling Valves','Grating','Automatic Sliding Door','Gravel'
  ]},
  { key: 'lights-lighting', label: 'Lights & Lighting', shortLabel: 'Lighting', term: 'Lights & Lighting', featured: [
    'Garden Lights','Outdoor Lighting','Led Lamp','Ceiling Lights','Lamp','Light','Led Light','Motif Lights','Lamp LED','Halloween lights','Smart Outdoor Lights','Garage Light','Working Light'
  ]},
  { key: 'home-appliances', label: 'Home Appliances', shortLabel: 'Home Appliances', term: 'Home Appliances', featured: [
    'Industrial Fans','Gas Heaters','Water Cooler','Clothes Dryers','Car Refrigerators','Water Purifier','Kitchen Appliances','Refrigerator Motor','Vacuum Cleaner Motor','Electric Knives','Coffee Kettle','Washing Machine Motor','Toaster Ovens'
  ]},
  { key: 'automotive-supplies', label: 'Automotive Supplies & Tools', shortLabel: 'Automotive Supplies', term: 'Automotive Supplies Tools', featured: [
    'Interior Accessories','Car Interior Accessories','Car Alarms','Wax','Car Vacuum Cleaner','Cloth','Car Stickers','Exhaust Valve','Ramps','Tire Repair Tools','Car Decal','Emergency Tools','Car Organizers'
  ]},
  { key: 'vehicle-parts', label: 'Vehicle Parts & Accessories', shortLabel: 'Auto Parts', term: 'Vehicle Parts & Accessories', featured: []},
  { key: 'tools-hardware', label: 'Tools & Hardware', shortLabel: 'Tools & Hardware', term: 'Tools & Hardware', featured: []},
  { key: 'renewable-energy', label: 'Renewable Energy', shortLabel: 'Renewable Energy', term: 'Renewable Energy', featured: []},
  { key: 'electrical-equipment', label: 'Electrical Equipment & Supplies', shortLabel: 'Electrical', term: 'Electrical Equipment Supplies', featured: [
    'Cable Connector','Fuse Box','Limit Switches','Battery Terminal','Power Strips','Electrical Equipment','Connectors','Power Converter','Power Factor Controllers','Wire Clip','Electrical instruments','Patch Panel','Flow Switches'
  ]},
  { key: 'material-handling', label: 'Material Handling', shortLabel: 'Material Handling', term: 'Material Handling', featured: [
    'Trolley Cart','Pallet Truck','Winches','Conveyor Belt','Roller','Shelves','Forklifts','Anchor Winch','Forklift Parts','Casters','Forklift Truck','Manipulator','Lifter'
  ]},
  { key: 'testing-instruments', label: 'Testing Instrument & Equipment', shortLabel: 'Testing Instruments', term: 'Testing Instrument Equipment', featured: [
    'Gas Regulator','Infrared Camera','Lab Equipment','Weighing Scales','Oscilloscopes','Digital Scale','Thermal Camera','Ph Test Strips','Measuring instruments','Dissolved Oxygen Meter','Gnss Receiver','Oxygen Regulator','Body Composition Analyzer'
  ]},
  { key: 'power-transmission', label: 'Power Transmission', shortLabel: 'Power Transmission', term: 'Power Transmission', featured: [
    'Fan Motor','Hydraulic Motors','Linear Actuator','Gearboxes','Hydraulic Cylinders','Bearing','Motor','Conveyor Chain','Sprockets','Bushing','Bushings','Joint','Vibration Motors'
  ]},
  { key: 'electronic-components', label: 'Electronic Components', shortLabel: 'Components', term: 'Electronic Components', featured: [
    'Touch Screen','Motion Sensor','Sensor','Power Supplies','LEDs','Keypad','Switches','Solenoids','Buzzer','Rectifiers','Encoders','Transistors','Antenna'
  ]},
  { key: 'vehicles-transportation', label: 'Vehicles & Transportation', shortLabel: 'Transportation', term: 'Vehicles & Transportation', featured: [
    'Gas Scooters','UTVs','Golf Carts','Dirt Bike','ATVs','Electric Motorcycles','Motorcycle','Cruiser Motorcycles','Dump Trailer','Hybrid Car','Sportbikes','Electric ATVs','Pit Bike'
  ]},
  { key: 'agriculture-food-beverage', label: 'Agriculture, Food & Beverage', shortLabel: 'Agri & Food', term: 'Agriculture Food Beverage', featured: [
    'Brandy','Fresh fruit','Mayonnaise','Fish Pond','Bread','Ice Cream','Pizza','Quinoa','Vinegar','Hams','Boer Goats','Mooncakes','Rum'
  ]},
  { key: 'raw-materials', label: 'Raw Materials', shortLabel: 'Raw Materials', term: 'Raw Materials', featured: [
    'Sodium Hydroxide','Tweed Fabric','Herbicides','Zinc','Fabric','PET','PC','Polyurethane Rubber','Transmission Oils','Silk Yarn','Calcium Nitrate','Fungicides','Potassium Nitrate'
  ]},
  { key: 'fabrication-services', label: 'Fabrication Services', shortLabel: 'Fabrication', term: 'Fabrication Services', featured: [
    'Concrete Blocks Molds','Casting Services','Sheet Metal Fabrication','Machining Services','Plastic Mold','Moulds','Concrete Molds','Steel Products','Metal Products','Injection Mould','Plastic Model','Press Mold','Forging Services'
  ]},
  // === Added extended category groups (sourced from IndiaMART hierarchy sample) ===
  { key: 'building-materials-equipment', label: 'Building Materials & Equipment', shortLabel: 'Building Mater.', term: 'Building Construction Material Equipment',
    tags: ['construction','building','materials','equipment'], weight: 1.4, aliases: ['construction materials','building equipment','construction machines'], ingest: { maxFeaturedPerCycle: 8, priority: 10 }, featured: [
    'Prefabricated Houses','Scaffolding Planks','Construction Machines','Crushing Plants','Brick Making Machines','Fly Ash Brick Making Machine','Cement Brick Making Machine','Passenger Lifts','Residential Elevator','TMT Steel Bars','Shuttering Plywood','Excavator','Emulsion Paints','PVC Pipes'
  ]},
  { key: 'pharma-drugs', label: 'Pharma Drugs & Supplements', shortLabel: 'Pharma', term: 'Pharmaceutical Drug',
    tags: ['pharma','health','supplements'], weight: 1.5, aliases: ['pharmaceutical tablets','nutraceutical supplements','antibiotic medicine'], ingest: { maxFeaturedPerCycle: 6, priority: 10 }, featured: [
    'Antibiotic Tablets','Antifungal Injection','Vitamin Tablets','Dietary Supplements','Mineral Supplement','Weight Loss Supplement','Weight Gain Nutrition','Immune Booster','Pre workout Supplements','Antiparasitic Drug','Anticoagulant Drugs','Nutraceuticals','Ayurvedic PCD'
  ]},
  { key: 'hospital-medical-equipment', label: 'Hospital & Medical Equipment', shortLabel: 'Hospital Equip', term: 'Medical Equipment',
    tags: ['medical','devices','hospital'], weight: 1.6, aliases: ['medical devices','ICU equipment','diagnostic instruments'], ingest: { maxFeaturedPerCycle: 7, priority: 10 }, featured: [
    'Medical Ventilators','Oxygen Cylinder','Rapid Test Kit','Biochemistry Analyzer','Patient Monitoring Systems','Blood Pressure Machine','Infrared Thermometers','X Ray Machine','ECG Machine','Stethoscope','Suction Machine','Dental Treatment Services','Ultrasound Machines'
  ]},
  { key: 'industrial-plants-machinery', label: 'Industrial Plants & Machinery', shortLabel: 'Plants & Mach.', term: 'Industrial Plants Machinery',
    tags: ['industrial','plants','machinery'], weight: 1.3, aliases: ['processing plants','industrial processing machinery'], ingest: { maxFeaturedPerCycle: 6, priority: 9 }, featured: [
    'Agarbatti Making Machines','Oil Extraction Machine','Food Processing Machine','Rice Mill Machinery','Spice Processing Machines','Non Woven Bag Making Machine','Pani Puri Making Machine','Bakery Machinery','Lathe Machine','CNC Machines','Air Compressors','Water Treatment Plants','Reverse Osmosis Plants'
  ]},
  { key: 'packaging-material-machines', label: 'Packaging Material & Machines', shortLabel: 'Packaging Ext', term: 'Packaging Material Machines',
    tags: ['packaging','machines','materials'], weight: 1.2, aliases: ['packaging machinery','pouch packing machines'], ingest: { maxFeaturedPerCycle: 7, priority: 8 }, featured: [
    'Corrugated Box','PET Bottles','Bottle Caps','Plastic Pouches','Stand Up Pouch','Fruit Juice Packaging Machine','Shrink Packaging Machines','Vacuum Packaging Machines','Spices Packing Machines','Snack Packing Machine','Form Fill Seal Machines','Blister Packaging Machines','Zipper Pouches'
  ]},
  { key: 'chemicals-dyes', label: 'Chemicals, Dyes & Solvents', shortLabel: 'Chemicals', term: 'Chemicals Dyes Solvents',
    tags: ['chemicals','dyes','solvents'], weight: 1.1, aliases: ['industrial chemicals','laboratory chemicals','reactive dyes'], ingest: { maxFeaturedPerCycle: 6, priority: 7 }, featured: [
    'Isopropyl Alcohol','Ethyl Alcohol','Glycerine','Silver Nitrate','Reactive Dyes','Acid Dyes','Direct Dyes','PVC Resin','Casting Resin','Micronutrient Fertilizers','Waterproofing Chemicals','Water Treatment Chemicals','Adhesive Chemical'
  ]},
  { key: 'transportation-logistics', label: 'Transportation & Logistics', shortLabel: 'Logistics', term: 'Transportation Logistics Services',
    tags: ['logistics','transport','supply chain'], weight: 1.0, aliases: ['cargo services','freight logistics','third party logistics'], ingest: { maxFeaturedPerCycle: 5, priority: 6 }, featured: [
    'Air Cargo Service','Sea Cargo Service','Road Transportation Services','Goods Transport Services','Cold Chain Logistics','Third Party Logistics','Container Truck Service','Packers Movers','Household Relocation Service','Warehouse Racks','Tipper Truck Rental Services','Contract Logistics Service','Loading Unloading Services'
  ]},
];
