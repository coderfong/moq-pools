// Shared hierarchical taxonomy for category dropdown across Alibaba, IndiaMART, and Made-in-China.
// Derived from user-supplied finalized list (2025-10-13).

export interface SharedLeaf {
  key: string;   // kebab-case unique key
  label: string; // display label
  terms?: string[]; // optional explicit search terms (defaults to [label])
}

export interface SharedCategoryNode {
  key: string;                // kebab-case unique key for node
  label: string;              // display label
  children?: SharedCategoryNode[]; // nested sub-groups
  leaves?: SharedLeaf[];           // leaf search entries
}

// Helper to make a slug key
export function toKey(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

export function getSharedSearchTerms(key: string, nodes: SharedCategoryNode[] = SHARED_CATEGORIES): string[] {
  // Walk the tree to find a leaf or node key and return terms
  const stack: SharedCategoryNode[] = [...nodes];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.key === key) return [n.label];
    if (n.leaves) {
      for (const l of n.leaves) if (l.key === key) return l.terms && l.terms.length ? l.terms : [l.label];
    }
    if (n.children) stack.push(...n.children);
  }
  return [];
}

// IMPORTANT: Keep structure shallow (Top -> Subgroup -> Leaves) where possible for UX.
export const SHARED_CATEGORIES: SharedCategoryNode[] = [
  {
    key: toKey('Consumer Electronics'),
    label: 'Consumer Electronics',
    children: [
      { key: toKey('Computers & Tablets'), label: 'Computers & Tablets', leaves: [
        { key: toKey('Laptops'), label: 'Laptops' },
        { key: toKey('Gaming Laptops'), label: 'Gaming Laptops' },
        { key: toKey('Desktops'), label: 'Desktops' },
        { key: toKey('Mini PCs'), label: 'Mini PCs' },
        { key: toKey('All-in-Ones'), label: 'All-in-Ones' },
        { key: toKey('Tablet PCs'), label: 'Tablet PCs' },
        { key: toKey('2-in-1s'), label: '2-in-1s' },
        { key: toKey('e-Readers'), label: 'e-Readers' },
        { key: toKey('Portable Workstations'), label: 'Portable Workstations' },
      ]},
      { key: toKey('PC Peripherals'), label: 'PC Peripherals', leaves: [
        { key: toKey('Keyboards (mechanical/membrane)'), label: 'Keyboards (mechanical/membrane)', terms: ['Mechanical Keyboard','Membrane Keyboard','Keyboards'] },
        { key: toKey('Gaming Keyboards'), label: 'Gaming Keyboards' },
        { key: toKey('Mice'), label: 'Mice' },
        { key: toKey('Gaming Mice'), label: 'Gaming Mice' },
        { key: toKey('Mousepads'), label: 'Mousepads' },
        { key: toKey('Wrist Rests'), label: 'Wrist Rests' },
        { key: toKey('Keycaps'), label: 'Keycaps' },
        { key: toKey('Keyboard & Mouse Combos'), label: 'Keyboard & Mouse Combos' },
        { key: toKey('Webcams (1080p/4K)'), label: 'Webcams (1080p/4K)', terms: ['1080p Webcam','4K Webcam','Webcam'] },
        { key: toKey('USB Microphones'), label: 'USB Microphones' },
        { key: toKey('Headsets (wired/wireless)'), label: 'Headsets (wired/wireless)', terms: ['Wired Headset','Wireless Headset','Headset'] },
        { key: toKey('Desktop Speakers'), label: 'Desktop Speakers' },
      ]},
      { key: toKey('PC Parts (small/parcelable)'), label: 'PC Parts (small/parcelable)', leaves: [
        { key: toKey('SSD/HDD'), label: 'SSD/HDD', terms: ['SSD','HDD'] },
        { key: toKey('RAM'), label: 'RAM' },
        { key: toKey('NVMe Enclosures'), label: 'NVMe Enclosures' },
        { key: toKey('Capture Cards'), label: 'Capture Cards' },
        { key: toKey('Case Fans'), label: 'Case Fans' },
        { key: toKey('Thermal Paste'), label: 'Thermal Paste' },
        { key: toKey('SATA/PSU Cables'), label: 'SATA/PSU Cables', terms: ['SATA Cables','PSU Cables'] },
        { key: toKey('Dust Filters'), label: 'Dust Filters' },
      ]},
      { key: toKey('Accessories & Cables'), label: 'Accessories & Cables', leaves: [
        { key: toKey('USB-C/USB-A Cables'), label: 'USB-C/USB-A Cables', terms: ['USB-C Cable','USB-A Cable'] },
        { key: toKey('HDMI/DP Cables'), label: 'HDMI/DP Cables', terms: ['HDMI Cable','DisplayPort Cable'] },
        { key: toKey('Hubs & Docks'), label: 'Hubs & Docks' },
        { key: toKey('Thunderbolt Docks'), label: 'Thunderbolt Docks' },
        { key: toKey('Chargers & GaN Bricks'), label: 'Chargers & GaN Bricks', terms: ['USB Charger','GaN Charger'] },
        { key: toKey('Power Banks'), label: 'Power Banks' },
        { key: toKey('Laptop Stands'), label: 'Laptop Stands' },
        { key: toKey('Screen Protectors'), label: 'Screen Protectors' },
        { key: toKey('Cleaning Kits'), label: 'Cleaning Kits' },
        { key: toKey('Cable Management'), label: 'Cable Management' },
      ]},
      { key: toKey('Monitors & Displays'), label: 'Monitors & Displays', leaves: [
        { key: toKey('Gaming Monitors (144/240Hz)'), label: 'Gaming Monitors (144/240Hz)', terms: ['144Hz Monitor','240Hz Monitor','Gaming Monitor'] },
        { key: toKey('4K Monitors'), label: '4K Monitors' },
        { key: toKey('Portable Monitors'), label: 'Portable Monitors' },
        { key: toKey('Color-accurate Monitors'), label: 'Color-accurate Monitors', terms: ['Color Accurate Monitor','Professional Monitor'] },
      ]},
      { key: toKey('Networking'), label: 'Networking', leaves: [
        { key: toKey('Routers'), label: 'Routers' },
        { key: toKey('Mesh Wi-Fi'), label: 'Mesh Wi-Fi' },
        { key: toKey('Range Extenders'), label: 'Range Extenders' },
        { key: toKey('Switches (unmanaged/PoE)'), label: 'Switches (unmanaged/PoE)', terms: ['Unmanaged Switch','PoE Switch','Network Switch'] },
        { key: toKey('NAS Enclosures'), label: 'NAS Enclosures' },
        { key: toKey('Ethernet Cables'), label: 'Ethernet Cables' },
        { key: toKey('SFP Modules'), label: 'SFP Modules' },
      ]},
      { key: toKey('Smart Home'), label: 'Smart Home', leaves: [
        { key: toKey('Smart Plugs'), label: 'Smart Plugs' },
        { key: toKey('Smart Bulbs'), label: 'Smart Bulbs' },
        { key: toKey('Smart Switches'), label: 'Smart Switches' },
        { key: toKey('Hubs'), label: 'Hubs' },
        { key: toKey('Sensors (motion/contact/temp)'), label: 'Sensors (motion/contact/temp)', terms: ['Motion Sensor','Contact Sensor','Temperature Sensor'] },
        { key: toKey('Video Doorbells'), label: 'Video Doorbells' },
        { key: toKey('Smart Thermostats'), label: 'Smart Thermostats' },
      ]},
      { key: toKey('Audio & Video'), label: 'Audio & Video', leaves: [
        { key: toKey('True Wireless Earbuds'), label: 'True Wireless Earbuds' },
        { key: toKey('Over-Ear Headphones'), label: 'Over-Ear Headphones' },
        { key: toKey('DAC/Amps'), label: 'DAC/Amps', terms: ['DAC','Headphone Amp'] },
        { key: toKey('Soundbars'), label: 'Soundbars' },
        { key: toKey('Portable Speakers'), label: 'Portable Speakers' },
        { key: toKey('Media Streamers'), label: 'Media Streamers' },
        { key: toKey('Bluetooth Transmitters'), label: 'Bluetooth Transmitters' },
      ]},
      { key: toKey('Wearables & XR'), label: 'Wearables & XR', leaves: [
        { key: toKey('Smartwatches'), label: 'Smartwatches' },
        { key: toKey('Fitness Bands'), label: 'Fitness Bands' },
        { key: toKey('VR/AR Headsets'), label: 'VR/AR Headsets' },
        { key: toKey('Replacement Straps & Bands'), label: 'Replacement Straps & Bands' },
      ]},
      { key: toKey('Gaming Consoles & Accessories'), label: 'Gaming Consoles & Accessories', leaves: [
        { key: toKey('Controllers'), label: 'Controllers' },
        { key: toKey('Charging Docks'), label: 'Charging Docks' },
        { key: toKey('Headsets'), label: 'Headsets' },
        { key: toKey('Racing Wheels'), label: 'Racing Wheels' },
        { key: toKey('Flight Sticks'), label: 'Flight Sticks' },
        { key: toKey('Console Storage'), label: 'Console Storage' },
        { key: toKey('Skins'), label: 'Skins' },
      ]},
    ]
  },
  {
    key: toKey('Sports & Outdoors'),
    label: 'Sports & Outdoors',
    children: [
      { key: toKey('Cycling'), label: 'Cycling', leaves: [
        { key: toKey('Bicycles'), label: 'Bicycles' },
        { key: toKey('Helmets'), label: 'Helmets' },
        { key: toKey('Lights & Reflectors'), label: 'Lights & Reflectors' },
        { key: toKey('Pumps'), label: 'Pumps' },
        { key: toKey('Tools & Repair Kits'), label: 'Tools & Repair Kits' },
        { key: toKey('Locks'), label: 'Locks' },
        { key: toKey('Bells'), label: 'Bells' },
        { key: toKey('Bottle Cages'), label: 'Bottle Cages' },
        { key: toKey('Bike Bags'), label: 'Bike Bags' },
        { key: toKey('Bicycle Parts (saddles/pedals/chains/brakes)'), label: 'Bicycle Parts (saddles/pedals/chains/brakes)', terms: ['Bicycle Saddle','Bicycle Pedals','Bicycle Chain','Bicycle Brakes'] },
      ]},
      { key: toKey('Water Sports (non-motorized)'), label: 'Water Sports (non-motorized)', leaves: [
        { key: toKey('Kayaks'), label: 'Kayaks' },
        { key: toKey('SUPs'), label: 'SUPs', terms: ['Stand Up Paddle Board','SUP'] },
        { key: toKey('Snorkel Sets'), label: 'Snorkel Sets' },
        { key: toKey('Fins'), label: 'Fins' },
        { key: toKey('Masks'), label: 'Masks' },
        { key: toKey('Life Jackets'), label: 'Life Jackets' },
        { key: toKey('Dry Bags'), label: 'Dry Bags' },
      ]},
      { key: toKey('Fishing'), label: 'Fishing', leaves: [
        { key: toKey('Rods'), label: 'Rods' },
        { key: toKey('Reels'), label: 'Reels' },
        { key: toKey('Lines'), label: 'Lines' },
        { key: toKey('Tackle Boxes'), label: 'Tackle Boxes' },
        { key: toKey('Lures'), label: 'Lures' },
        { key: toKey('Pliers'), label: 'Pliers' },
        { key: toKey('Accessories'), label: 'Accessories' },
      ]},
      { key: toKey('Camping & Hiking'), label: 'Camping & Hiking', leaves: [
        { key: toKey('Tents'), label: 'Tents' },
        { key: toKey('Sleeping Bags'), label: 'Sleeping Bags' },
        { key: toKey('Pads'), label: 'Pads' },
        { key: toKey('Camping Furniture'), label: 'Camping Furniture' },
        { key: toKey('Stoves & Cookware'), label: 'Stoves & Cookware' },
        { key: toKey('Lanterns'), label: 'Lanterns' },
        { key: toKey('Hydration Packs'), label: 'Hydration Packs' },
      ]},
      { key: toKey('Scooters & Mobility (non-motorized)'), label: 'Scooters & Mobility (non-motorized)', leaves: [
        { key: toKey('Scooters'), label: 'Scooters' },
        { key: toKey('Wheels'), label: 'Wheels' },
        { key: toKey('Deck Tape'), label: 'Deck Tape' },
        { key: toKey('Accessories'), label: 'Accessories' },
      ]},
      { key: toKey('Team Sports & Fitness'), label: 'Team Sports & Fitness', leaves: [
        { key: toKey('Balls'), label: 'Balls' },
        { key: toKey('Nets'), label: 'Nets' },
        { key: toKey('Cones'), label: 'Cones' },
        { key: toKey('Resistance Bands'), label: 'Resistance Bands' },
        { key: toKey('Yoga Mats & Blocks'), label: 'Yoga Mats & Blocks' },
      ]},
      { key: toKey('Outdoor Games & Novelties'), label: 'Outdoor Games & Novelties', leaves: [
        { key: toKey('Cornhole'), label: 'Cornhole' },
        { key: toKey('Bocce'), label: 'Bocce' },
        { key: toKey('Frisbees'), label: 'Frisbees' },
        { key: toKey('Novelty Games'), label: 'Novelty Games' },
      ]},
    ]
  },
  {
    key: toKey('School & Office'),
    label: 'School & Office',
    children: [
      { key: toKey('Writing & Desk'), label: 'Writing & Desk', leaves: [
        { key: toKey('Notebooks'), label: 'Notebooks' },
        { key: toKey('Planners'), label: 'Planners' },
        { key: toKey('Highlighters'), label: 'Highlighters' },
        { key: toKey('Pens'), label: 'Pens' },
        { key: toKey('Pencils'), label: 'Pencils' },
        { key: toKey('Staplers'), label: 'Staplers' },
        { key: toKey('Hole Punches'), label: 'Hole Punches' },
        { key: toKey('Glue & Tape'), label: 'Glue & Tape' },
      ]},
      { key: toKey('Art & Craft'), label: 'Art & Craft', leaves: [
        { key: toKey('Gouache & Acrylic'), label: 'Gouache & Acrylic' },
        { key: toKey('Brushes'), label: 'Brushes' },
        { key: toKey('Sketchbooks'), label: 'Sketchbooks' },
        { key: toKey('Cutting/Plotter Machines'), label: 'Cutting/Plotter Machines' },
        { key: toKey('Vinyl Sheets'), label: 'Vinyl Sheets' },
        { key: toKey('Transfer Tape'), label: 'Transfer Tape' },
      ]},
      { key: toKey('Filing & Organization'), label: 'Filing & Organization', leaves: [
        { key: toKey('Folders'), label: 'Folders' },
        { key: toKey('Binders'), label: 'Binders' },
        { key: toKey('Badge Holders'), label: 'Badge Holders' },
        { key: toKey('Desk Organizers'), label: 'Desk Organizers' },
        { key: toKey('Laminators'), label: 'Laminators' },
        { key: toKey('Label Holders'), label: 'Label Holders' },
      ]},
      { key: toKey('Office Electronics'), label: 'Office Electronics', leaves: [
        { key: toKey('Printers'), label: 'Printers' },
        { key: toKey('Scanners'), label: 'Scanners' },
        { key: toKey('Label Makers'), label: 'Label Makers' },
        { key: toKey('Calculators'), label: 'Calculators' },
        { key: toKey('Electronic Dictionaries'), label: 'Electronic Dictionaries' },
        { key: toKey('(Retro) Typewriters'), label: '(Retro) Typewriters', terms: ['Typewriter'] },
      ]},
    ]
  },
  {
    key: toKey('Furniture'),
    label: 'Furniture',
    children: [
      { key: toKey('Home Office'), label: 'Home Office', leaves: [
        { key: toKey('Desks'), label: 'Desks' },
        { key: toKey('Gaming Desks'), label: 'Gaming Desks' },
        { key: toKey('Office Chairs'), label: 'Office Chairs' },
        { key: toKey('Waiting Chairs'), label: 'Waiting Chairs' },
        { key: toKey('Storage Cabinets'), label: 'Storage Cabinets' },
        { key: toKey('Laptop Carts'), label: 'Laptop Carts' },
      ]},
      { key: toKey('Bedroom & Nursery'), label: 'Bedroom & Nursery', leaves: [
        { key: toKey('Wardrobes/Closets'), label: 'Wardrobes/Closets' },
        { key: toKey('Baby Cribs & Beds'), label: 'Baby Cribs & Beds' },
        { key: toKey('Baby Fences'), label: 'Baby Fences' },
        { key: toKey('Nightstands'), label: 'Nightstands' },
      ]},
      { key: toKey('Living & Dining'), label: 'Living & Dining', leaves: [
        { key: toKey('Sofas'), label: 'Sofas' },
        { key: toKey('Coffee Tables'), label: 'Coffee Tables' },
        { key: toKey('Dining Tables & Chairs'), label: 'Dining Tables & Chairs' },
        { key: toKey('Luggage Racks'), label: 'Luggage Racks' },
        { key: toKey('Shelving'), label: 'Shelving' },
      ]},
      { key: toKey('Event & Hospitality'), label: 'Event & Hospitality', leaves: [
        { key: toKey('Wedding Tables'), label: 'Wedding Tables' },
        { key: toKey('Folding Tables/Chairs'), label: 'Folding Tables/Chairs' },
        { key: toKey('Furniture Accessories (casters/feet)'), label: 'Furniture Accessories (casters/feet)', terms: ['Furniture Casters','Furniture Feet'] },
      ]},
    ]
  },
  {
    key: toKey('Safety, Security & Surveillance'),
    label: 'Safety, Security & Surveillance',
    children: [
      { key: toKey('Home Safety'), label: 'Home Safety', leaves: [
        { key: toKey('Smoke/CO Detectors'), label: 'Smoke/CO Detectors', terms: ['Smoke Detector','CO Detector'] },
        { key: toKey('Door/Window Sensors'), label: 'Door/Window Sensors', terms: ['Door Sensor','Window Sensor'] },
        { key: toKey('Smart Locks'), label: 'Smart Locks' },
        { key: toKey('First Aid & Emergency Kits'), label: 'First Aid & Emergency Kits', terms: ['First Aid Kit','Emergency Kit'] },
      ]},
      { key: toKey('Surveillance Cameras'), label: 'Surveillance Cameras', children: [
        { key: toKey('Standard'), label: 'Standard', leaves: [
          { key: toKey('Indoor Wi-Fi Cams'), label: 'Indoor Wi-Fi Cams', terms: ['Indoor Wi-Fi Camera'] },
          { key: toKey('Outdoor Bullet/Dome Cams'), label: 'Outdoor Bullet/Dome Cams', terms: ['Outdoor Bullet Camera','Outdoor Dome Camera'] },
          { key: toKey('Action Cams'), label: 'Action Cams', terms: ['Action Camera'] },
        ]},
        { key: toKey('Hidden/Spy'), label: 'Hidden/Spy', leaves: [
          { key: toKey('Clock Cams'), label: 'Clock Cams', terms: ['Clock Camera'] },
          { key: toKey('USB-Charger Cams'), label: 'USB-Charger Cams', terms: ['USB Charger Camera'] },
          { key: toKey('Smoke-Detector-Style Cams'), label: 'Smoke-Detector-Style Cams', terms: ['Smoke Detector Camera'] },
          { key: toKey('Pen/Button Cams'), label: 'Pen/Button Cams', terms: ['Pen Camera','Button Camera'] },
        ]},
        { key: toKey('Micro/Underwater'), label: 'Micro/Underwater', leaves: [
          { key: toKey('Micro Cameras'), label: 'Micro Cameras' },
          { key: toKey('Endoscope Cams'), label: 'Endoscope Cams', terms: ['Endoscope Camera'] },
          { key: toKey('Underwater/Action Housings'), label: 'Underwater/Action Housings' },
          { key: toKey('Dive Lights'), label: 'Dive Lights' },
        ]},
      ]},
      { key: toKey('Recording & Storage'), label: 'Recording & Storage', leaves: [
        { key: toKey('NVR/DVR (compact)'), label: 'NVR/DVR (compact)', terms: ['NVR','DVR'] },
        { key: toKey('MicroSD Cards'), label: 'MicroSD Cards' },
        { key: toKey('POE Injectors'), label: 'POE Injectors' },
        { key: toKey('Cloud Vouchers'), label: 'Cloud Vouchers' },
      ]},
      { key: toKey('Mounts & Power'), label: 'Mounts & Power', leaves: [
        { key: toKey('Wall/Ceiling Mounts'), label: 'Wall/Ceiling Mounts' },
        { key: toKey('Battery Packs'), label: 'Battery Packs' },
        { key: toKey('Solar Panels'), label: 'Solar Panels' },
      ]},
    ]
  },
  {
    key: toKey('Apparel & Accessories'),
    label: 'Apparel & Accessories',
    children: [
      { key: toKey('Costumes & Stage'), label: 'Costumes & Stage', leaves: [
        { key: toKey('Witch'), label: 'Witch' },
        { key: toKey('Carnival'), label: 'Carnival' },
        { key: toKey('Knight'), label: 'Knight' },
        { key: toKey('Stage Costumes'), label: 'Stage Costumes' },
        { key: toKey('Wigs'), label: 'Wigs' },
        { key: toKey('Props (foam)'), label: 'Props (foam)' },
      ]},
      { key: toKey('Hats & Headwear'), label: 'Hats & Headwear', leaves: [
        { key: toKey('Top Hats'), label: 'Top Hats' },
        { key: toKey('Church Hats'), label: 'Church Hats' },
        { key: toKey('Caps & Beanies'), label: 'Caps & Beanies' },
        { key: toKey('Headbands'), label: 'Headbands' },
      ]},
      { key: toKey('Men’s & Women’s Apparel'), label: 'Men’s & Women’s Apparel', leaves: [
        { key: toKey('Tops'), label: 'Tops' },
        { key: toKey('Bottoms'), label: 'Bottoms' },
        { key: toKey('Dresses'), label: 'Dresses' },
        { key: toKey('Outerwear'), label: 'Outerwear' },
        { key: toKey('Swimwear (incl. Boys’ Trunks)'), label: 'Swimwear (incl. Boys’ Trunks)' },
        { key: toKey('Activewear'), label: 'Activewear' },
      ]},
      { key: toKey('Accessories'), label: 'Accessories', leaves: [
        { key: toKey('Belts'), label: 'Belts' },
        { key: toKey('Ties'), label: 'Ties' },
        { key: toKey('Collar Stays'), label: 'Collar Stays' },
        { key: toKey('Fashion Chains'), label: 'Fashion Chains' },
        { key: toKey('Gloves'), label: 'Gloves' },
        { key: toKey('Scarves'), label: 'Scarves' },
        { key: toKey('Sunglasses (non-Rx)'), label: 'Sunglasses (non-Rx)' },
      ]},
    ]
  },
  {
    key: toKey('Home & Garden'),
    label: 'Home & Garden',
    children: [
      { key: toKey('Home Décor'), label: 'Home Décor', leaves: [
        { key: toKey('Wall Art'), label: 'Wall Art' },
        { key: toKey('Vases'), label: 'Vases' },
        { key: toKey('Planters'), label: 'Planters' },
        { key: toKey('Glass Holders'), label: 'Glass Holders' },
        { key: toKey('Cushions'), label: 'Cushions' },
        { key: toKey('Curtains & Blinds'), label: 'Curtains & Blinds' },
      ]},
      { key: toKey('Seasonal & Party'), label: 'Seasonal & Party', leaves: [
        { key: toKey('Christmas Decorations & Gifts'), label: 'Christmas Decorations & Gifts' },
        { key: toKey('Wedding Backdrops'), label: 'Wedding Backdrops' },
        { key: toKey('Banners'), label: 'Banners' },
        { key: toKey('Balloons'), label: 'Balloons' },
        { key: toKey('String Lights'), label: 'String Lights' },
      ]},
      { key: toKey('Kitchen & Dining'), label: 'Kitchen & Dining', leaves: [
        { key: toKey('Fruit Trays'), label: 'Fruit Trays' },
        { key: toKey('Batter Dispensers'), label: 'Batter Dispensers' },
        { key: toKey('Openers'), label: 'Openers' },
        { key: toKey('Keychains'), label: 'Keychains' },
        { key: toKey('Napkins/Serviettes'), label: 'Napkins/Serviettes' },
        { key: toKey('Cutting Boards'), label: 'Cutting Boards' },
        { key: toKey('Utensils'), label: 'Utensils' },
      ]},
      { key: toKey('Garden & Irrigation'), label: 'Garden & Irrigation', leaves: [
        { key: toKey('Irrigation Sprinklers'), label: 'Irrigation Sprinklers' },
        { key: toKey('Hoses & Reels'), label: 'Hoses & Reels' },
        { key: toKey('Nozzles'), label: 'Nozzles' },
        { key: toKey('Garden Tools'), label: 'Garden Tools' },
        { key: toKey('Pots'), label: 'Pots' },
      ]},
    ]
  },
  {
    key: toKey('Beauty, Personal Care & Tattoo'),
    label: 'Beauty, Personal Care & Tattoo',
    children: [
      { key: toKey('Skincare'), label: 'Skincare', leaves: [
        { key: toKey('Cleansers'), label: 'Cleansers' },
        { key: toKey('Toners'), label: 'Toners' },
        { key: toKey('Serums'), label: 'Serums' },
        { key: toKey('Eye Cream'), label: 'Eye Cream' },
        { key: toKey('Face Cream'), label: 'Face Cream' },
        { key: toKey('Moisturizers'), label: 'Moisturizers' },
        { key: toKey('Sunscreen'), label: 'Sunscreen' },
      ]},
      { key: toKey('Nails'), label: 'Nails', leaves: [
        { key: toKey('Nail Supplies'), label: 'Nail Supplies' },
        { key: toKey('UV/LED Lamps'), label: 'UV/LED Lamps' },
        { key: toKey('Manicure Tables (home/light duty)'), label: 'Manicure Tables (home/light duty)', terms: ['Manicure Table'] },
        { key: toKey('Nail Drills'), label: 'Nail Drills' },
        { key: toKey('Tips & Forms'), label: 'Tips & Forms' },
      ]},
      { key: toKey('Cosmetics & Tools'), label: 'Cosmetics & Tools', leaves: [
        { key: toKey('Makeup'), label: 'Makeup' },
        { key: toKey('Brushes & Sponges'), label: 'Brushes & Sponges' },
        { key: toKey('Organizers'), label: 'Organizers' },
        { key: toKey('Brush Cleaning Gel'), label: 'Brush Cleaning Gel' },
      ]},
      { key: toKey('Tattoo & PMU (Professional Use)'), label: 'Tattoo & PMU (Professional Use)', children: [
        { key: toKey('Machines'), label: 'Machines', leaves: [
          { key: toKey('Rotary Tattoo Machines'), label: 'Rotary Tattoo Machines' },
          { key: toKey('Coil Machines'), label: 'Coil Machines' },
          { key: toKey('PMU Pens'), label: 'PMU Pens' },
        ]},
        { key: toKey('Power & Controls'), label: 'Power & Controls', leaves: [
          { key: toKey('Power Supplies'), label: 'Power Supplies' },
          { key: toKey('Foot Pedals'), label: 'Foot Pedals' },
          { key: toKey('Clip Cords'), label: 'Clip Cords' },
          { key: toKey('RCA Cables'), label: 'RCA Cables' },
        ]},
        { key: toKey('Needles & Cartridges'), label: 'Needles & Cartridges', leaves: [
          { key: toKey('Liner/Shader Cartridges'), label: 'Liner/Shader Cartridges' },
          { key: toKey('PMU Needles (various gauges)'), label: 'PMU Needles (various gauges)', terms: ['PMU Needles'] },
        ]},
        { key: toKey('Inks & Prep'), label: 'Inks & Prep', leaves: [
          { key: toKey('Tattoo Inks*'), label: 'Tattoo Inks*', terms: ['Tattoo Inks'] },
          { key: toKey('Stencil Paper'), label: 'Stencil Paper' },
          { key: toKey('Transfer Gel'), label: 'Transfer Gel' },
          { key: toKey('Green Soap'), label: 'Green Soap' },
          { key: toKey('Aftercare Ointments'), label: 'Aftercare Ointments' },
        ]},
        { key: toKey('Grips & Accessories'), label: 'Grips & Accessories', leaves: [
          { key: toKey('Grips'), label: 'Grips' },
          { key: toKey('Tips'), label: 'Tips' },
          { key: toKey('Covers'), label: 'Covers' },
          { key: toKey('Machine Bags'), label: 'Machine Bags' },
          { key: toKey('Practice Skins'), label: 'Practice Skins' },
          { key: toKey('Arm Rests'), label: 'Arm Rests' },
        ]},
      ]},
    ]
  },
  {
    key: toKey('Jewelry, Eyewear & Contact Lenses'),
    label: 'Jewelry, Eyewear & Contact Lenses',
    children: [
      { key: toKey('Jewelry'), label: 'Jewelry', leaves: [
        { key: toKey('Earrings'), label: 'Earrings' },
        { key: toKey('Necklaces'), label: 'Necklaces' },
        { key: toKey('Bracelets'), label: 'Bracelets' },
        { key: toKey('Rings'), label: 'Rings' },
        { key: toKey('Anklets'), label: 'Anklets' },
        { key: toKey('Sets'), label: 'Sets' },
      ]},
      { key: toKey('Beads & Findings'), label: 'Beads & Findings', leaves: [
        { key: toKey('Hematite Beads'), label: 'Hematite Beads' },
        { key: toKey('Spacer Beads'), label: 'Spacer Beads' },
        { key: toKey('Clasps'), label: 'Clasps' },
        { key: toKey('Crimps'), label: 'Crimps' },
        { key: toKey('Wires'), label: 'Wires' },
        { key: toKey('Jump Rings'), label: 'Jump Rings' },
      ]},
      { key: toKey('Watches & Accessories'), label: 'Watches & Accessories', leaves: [
        { key: toKey('Watches'), label: 'Watches' },
        { key: toKey('Straps'), label: 'Straps' },
        { key: toKey('Spring Bar Tools'), label: 'Spring Bar Tools' },
        { key: toKey('Cases'), label: 'Cases' },
      ]},
      { key: toKey('Hair & Body Jewelry'), label: 'Hair & Body Jewelry', leaves: [
        { key: toKey('Hair Sticks'), label: 'Hair Sticks' },
        { key: toKey('Tie Pins'), label: 'Tie Pins' },
        { key: toKey('Forehead Jewelry'), label: 'Forehead Jewelry' },
        { key: toKey('Nose/Ear/Body Jewelry (non-piercing & piercing jewelry)'), label: 'Nose/Ear/Body Jewelry (non-piercing & piercing jewelry)', terms: ['Nose Jewelry','Ear Jewelry','Body Jewelry'] },
      ]},
      { key: toKey('Contact Lenses & Care'), label: 'Contact Lenses & Care', children: [
        { key: toKey('Cosmetic'), label: 'Cosmetic', leaves: [
          { key: toKey('Color Contacts'), label: 'Color Contacts' },
          { key: toKey('Circle Lenses'), label: 'Circle Lenses' },
          { key: toKey('Theatrical/FX*'), label: 'Theatrical/FX*', terms: ['Theatrical Contact Lenses','FX Contact Lenses'] },
        ]},
        { key: toKey('Care & Accessories'), label: 'Care & Accessories', leaves: [
          { key: toKey('Lens Cases'), label: 'Lens Cases' },
          { key: toKey('Solution'), label: 'Solution' },
          { key: toKey('Saline'), label: 'Saline' },
          { key: toKey('Tweezers'), label: 'Tweezers' },
          { key: toKey('Applicators'), label: 'Applicators' },
          { key: toKey('Eye Drops'), label: 'Eye Drops' },
        ]},
      ]},
    ]
  },
  {
    key: toKey('Shoes'),
    label: 'Shoes',
    children: [
      { key: toKey('Men’s'), label: 'Men’s', leaves: [
        { key: toKey('Sneakers'), label: 'Sneakers' },
        { key: toKey('Leather Boots'), label: 'Leather Boots' },
        { key: toKey('Sandals'), label: 'Sandals' },
        { key: toKey('Loafers'), label: 'Loafers' },
      ]},
      { key: toKey('Women’s'), label: 'Women’s', leaves: [
        { key: toKey('Sneakers'), label: 'Sneakers' },
        { key: toKey('Boots'), label: 'Boots' },
        { key: toKey('Heels'), label: 'Heels' },
        { key: toKey('Flats'), label: 'Flats' },
        { key: toKey('Sandals'), label: 'Sandals' },
      ]},
      { key: toKey('Specialty'), label: 'Specialty', leaves: [
        { key: toKey('Ankle Boots'), label: 'Ankle Boots' },
        { key: toKey('Cowboy Boots'), label: 'Cowboy Boots' },
        { key: toKey('Winter Boots'), label: 'Winter Boots' },
        { key: toKey('Insoles'), label: 'Insoles' },
        { key: toKey('Laces'), label: 'Laces' },
        { key: toKey('Shoe Care'), label: 'Shoe Care' },
      ]},
    ]
  },
  {
    key: toKey('Bags & Travel'),
    label: 'Bags & Travel',
    children: [
      { key: toKey('Backpacks'), label: 'Backpacks', leaves: [
        { key: toKey('Men’s'), label: 'Men’s' },
        { key: toKey('Women’s'), label: 'Women’s' },
        { key: toKey('Tactical'), label: 'Tactical' },
        { key: toKey('Sports'), label: 'Sports' },
        { key: toKey('Hiking'), label: 'Hiking' },
        { key: toKey('Hydration'), label: 'Hydration' },
      ]},
      { key: toKey('Handbags & Totes'), label: 'Handbags & Totes', leaves: [
        { key: toKey('Shoulder Bags'), label: 'Shoulder Bags' },
        { key: toKey('Crossbody'), label: 'Crossbody' },
        { key: toKey('Satchels'), label: 'Satchels' },
        { key: toKey('Tote Bags'), label: 'Tote Bags' },
      ]},
      { key: toKey('Travel'), label: 'Travel', leaves: [
        { key: toKey('Trolley/Luggage Sets'), label: 'Trolley/Luggage Sets' },
        { key: toKey('Duffels'), label: 'Duffels' },
        { key: toKey('Packing Cubes'), label: 'Packing Cubes' },
        { key: toKey('Luggage Scales & Tags'), label: 'Luggage Scales & Tags' },
      ]},
      { key: toKey('Sports & Specialty'), label: 'Sports & Specialty', leaves: [
        { key: toKey('Basketball Bags'), label: 'Basketball Bags' },
        { key: toKey('Camera Bags'), label: 'Camera Bags' },
        { key: toKey('Laptop Sleeves'), label: 'Laptop Sleeves' },
      ]},
    ]
  },
  {
    key: toKey('Packaging & Printing'),
    label: 'Packaging & Printing',
    children: [
      { key: toKey('Retail Packaging'), label: 'Retail Packaging', leaves: [
        { key: toKey('Plastic/PET Bottles'), label: 'Plastic/PET Bottles' },
        { key: toKey('Plastic Trays'), label: 'Plastic Trays' },
        { key: toKey('Food Bags'), label: 'Food Bags' },
        { key: toKey('Stand-Up Pouches'), label: 'Stand-Up Pouches' },
        { key: toKey('Zipper Pouches'), label: 'Zipper Pouches' },
        { key: toKey('Bottle Caps'), label: 'Bottle Caps' },
        { key: toKey('Card Boxes'), label: 'Card Boxes' },
      ]},
      { key: toKey('Drinkware & Containers'), label: 'Drinkware & Containers', leaves: [
        { key: toKey('Reusable Cups'), label: 'Reusable Cups' },
        { key: toKey('Paper Coffee Cups with Lids'), label: 'Paper Coffee Cups with Lids' },
      ]},
      { key: toKey('Event & Gifting'), label: 'Event & Gifting', leaves: [
        { key: toKey('Wedding Favors'), label: 'Wedding Favors' },
        { key: toKey('Gift Bags'), label: 'Gift Bags' },
        { key: toKey('Tissue & Ribbons'), label: 'Tissue & Ribbons' },
      ]},
      { key: toKey('DIY Printing'), label: 'DIY Printing', leaves: [
        { key: toKey('Heat-Transfer Vinyl'), label: 'Heat-Transfer Vinyl' },
        { key: toKey('Sublimation Blanks (mugs, tumblers, keychains)'), label: 'Sublimation Blanks (mugs, tumblers, keychains)' },
      ]},
    ]
  },
  {
    key: toKey('Parents, Kids & Toys'),
    label: 'Parents, Kids & Toys',
    children: [
      { key: toKey('Baby & Nursery'), label: 'Baby & Nursery', leaves: [
        { key: toKey('Strollers'), label: 'Strollers' },
        { key: toKey('Infant Car Seats'), label: 'Infant Car Seats' },
        { key: toKey('Baby Monitors'), label: 'Baby Monitors' },
        { key: toKey('Swaddles'), label: 'Swaddles' },
        { key: toKey('Baby Carriers'), label: 'Baby Carriers' },
      ]},
      { key: toKey('Kids’ Essentials'), label: 'Kids’ Essentials', leaves: [
        { key: toKey('Organizers'), label: 'Organizers' },
        { key: toKey('Backpacks'), label: 'Backpacks' },
        { key: toKey('Lunch Boxes'), label: 'Lunch Boxes' },
        { key: toKey('Water Bottles'), label: 'Water Bottles' },
      ]},
      { key: toKey('Pools & Outdoor Play'), label: 'Pools & Outdoor Play', leaves: [
        { key: toKey('Inflatable Pools'), label: 'Inflatable Pools' },
        { key: toKey('Sprinklers'), label: 'Sprinklers' },
        { key: toKey('Water Toys'), label: 'Water Toys' },
        { key: toKey('Light-Up Toys'), label: 'Light-Up Toys' },
      ]},
      { key: toKey('Toys'), label: 'Toys', leaves: [
        { key: toKey('Educational Kits'), label: 'Educational Kits' },
        { key: toKey('DIY/STEAM'), label: 'DIY/STEAM' },
        { key: toKey('Building Sets'), label: 'Building Sets' },
        { key: toKey('Plush'), label: 'Plush' },
        { key: toKey('RC & Drones'), label: 'RC & Drones' },
        { key: toKey('Puzzles'), label: 'Puzzles' },
      ]},
    ]
  },
  {
    key: toKey('Household & Cleaning'),
    label: 'Household & Cleaning',
    children: [
      { key: toKey('Laundry'), label: 'Laundry', leaves: [
        { key: toKey('Detergents'), label: 'Detergents' },
        { key: toKey('Washing Powder'), label: 'Washing Powder' },
        { key: toKey('Fabric Softeners'), label: 'Fabric Softeners' },
        { key: toKey('Bleach (consumer-grade)'), label: 'Bleach (consumer-grade)', terms: ['Bleach'] },
      ]},
      { key: toKey('Home Care'), label: 'Home Care', leaves: [
        { key: toKey('Glass/Kitchen/Bathroom Cleaners'), label: 'Glass/Kitchen/Bathroom Cleaners' },
        { key: toKey('Disinfectants'), label: 'Disinfectants' },
        { key: toKey('Hand Wash'), label: 'Hand Wash' },
        { key: toKey('Toilet Cleaners'), label: 'Toilet Cleaners' },
        { key: toKey('Sponges & Cloths'), label: 'Sponges & Cloths' },
      ]},
      { key: toKey('Barber & Salon'), label: 'Barber & Salon', leaves: [
        { key: toKey('Shears/Scissors'), label: 'Shears/Scissors' },
        { key: toKey('Barber Capes/Vests'), label: 'Barber Capes/Vests' },
        { key: toKey('Combs/Brushes'), label: 'Combs/Brushes' },
        { key: toKey('Hair Extension Tools'), label: 'Hair Extension Tools' },
        { key: toKey('Spray Bottles'), label: 'Spray Bottles' },
      ]},
    ]
  },
  {
    key: toKey('Automotive'),
    label: 'Automotive',
    children: [
      { key: toKey('Interior & Care'), label: 'Interior & Care', leaves: [
        { key: toKey('Seat Organizers'), label: 'Seat Organizers' },
        { key: toKey('Trunk Organizers'), label: 'Trunk Organizers' },
        { key: toKey('Car Vacuums'), label: 'Car Vacuums' },
        { key: toKey('Waxes'), label: 'Waxes' },
        { key: toKey('Microfiber Kits'), label: 'Microfiber Kits' },
        { key: toKey('Sunshades'), label: 'Sunshades' },
        { key: toKey('Air Fresheners'), label: 'Air Fresheners' },
      ]},
      { key: toKey('Electronics'), label: 'Electronics', leaves: [
        { key: toKey('Dash Cams'), label: 'Dash Cams', terms: ['Dash Camera'] },
        { key: toKey('USB Chargers'), label: 'USB Chargers' },
        { key: toKey('Bluetooth FM Transmitters'), label: 'Bluetooth FM Transmitters' },
        { key: toKey('Phone Mounts'), label: 'Phone Mounts' },
      ]},
      { key: toKey('Exterior Accessories'), label: 'Exterior Accessories', leaves: [
        { key: toKey('Stickers/Decals'), label: 'Stickers/Decals' },
        { key: toKey('Car Covers'), label: 'Car Covers' },
        { key: toKey('Valve Caps'), label: 'Valve Caps' },
        { key: toKey('Basic Bulbs'), label: 'Basic Bulbs' },
      ]},
    ]
  },
  {
    key: toKey('Electrical, Tools & Test'),
    label: 'Electrical, Tools & Test',
    children: [
      { key: toKey('Electrical Accessories'), label: 'Electrical Accessories', leaves: [
        { key: toKey('Power Strips'), label: 'Power Strips' },
        { key: toKey('Surge Protectors'), label: 'Surge Protectors' },
        { key: toKey('Power Adapters'), label: 'Power Adapters' },
        { key: toKey('Connectors'), label: 'Connectors' },
        { key: toKey('Cable Clips'), label: 'Cable Clips' },
        { key: toKey('Patch Panels'), label: 'Patch Panels' },
        { key: toKey('Extension Cords'), label: 'Extension Cords' },
      ]},
      { key: toKey('Home Tools'), label: 'Home Tools', leaves: [
        { key: toKey('Screwdriver Sets'), label: 'Screwdriver Sets' },
        { key: toKey('Drill/Driver Kits'), label: 'Drill/Driver Kits' },
        { key: toKey('Rotary Tools'), label: 'Rotary Tools' },
        { key: toKey('Soldering Irons'), label: 'Soldering Irons' },
        { key: toKey('Heat Guns'), label: 'Heat Guns' },
      ]},
      { key: toKey('Testers (consumer)'), label: 'Testers (consumer)', leaves: [
        { key: toKey('Multimeters'), label: 'Multimeters' },
        { key: toKey('Socket Testers'), label: 'Socket Testers' },
        { key: toKey('Voltage Pens'), label: 'Voltage Pens' },
        { key: toKey('Cable Testers'), label: 'Cable Testers' },
      ]},
    ]
  },
  {
    key: toKey('Lighting'),
    label: 'Lighting',
    children: [
      { key: toKey('Indoor'), label: 'Indoor', leaves: [
        { key: toKey('Ceiling Lights'), label: 'Ceiling Lights' },
        { key: toKey('LED Bulbs & Lamps'), label: 'LED Bulbs & Lamps' },
        { key: toKey('Desk Lamps'), label: 'Desk Lamps' },
        { key: toKey('Floor Lamps'), label: 'Floor Lamps' },
      ]},
      { key: toKey('Outdoor'), label: 'Outdoor', leaves: [
        { key: toKey('Garden Lights'), label: 'Garden Lights' },
        { key: toKey('Outdoor Fixtures'), label: 'Outdoor Fixtures' },
        { key: toKey('Smart Outdoor Lights'), label: 'Smart Outdoor Lights' },
        { key: toKey('Garage & Work Lights'), label: 'Garage & Work Lights' },
      ]},
      { key: toKey('Decorative'), label: 'Decorative', leaves: [
        { key: toKey('String Lights'), label: 'String Lights' },
        { key: toKey('Motif Lights'), label: 'Motif Lights' },
        { key: toKey('Neon-Style LED'), label: 'Neon-Style LED' },
        { key: toKey('Halloween Lights'), label: 'Halloween Lights' },
      ]},
    ]
  },
  {
    key: toKey('Home Appliances'),
    label: 'Home Appliances',
    children: [
      { key: toKey('Countertop & Small'), label: 'Countertop & Small', leaves: [
        { key: toKey('Air Fryers'), label: 'Air Fryers' },
        { key: toKey('Kettles'), label: 'Kettles' },
        { key: toKey('Coffee Makers'), label: 'Coffee Makers' },
        { key: toKey('Blenders'), label: 'Blenders' },
        { key: toKey('Mixers'), label: 'Mixers' },
        { key: toKey('Toaster Ovens'), label: 'Toaster Ovens' },
      ]},
      { key: toKey('Air & Climate'), label: 'Air & Climate', leaves: [
        { key: toKey('Desk/Stand Fans'), label: 'Desk/Stand Fans' },
        { key: toKey('Air Circulators'), label: 'Air Circulators' },
        { key: toKey('Portable Heaters (electric)'), label: 'Portable Heaters (electric)' },
        { key: toKey('Dehumidifiers'), label: 'Dehumidifiers' },
      ]},
      { key: toKey('Parts & Filters'), label: 'Parts & Filters', leaves: [
        { key: toKey('Water Filters (pitcher/inline)'), label: 'Water Filters (pitcher/inline)', terms: ['Pitcher Water Filter','Inline Water Filter'] },
        { key: toKey('HEPA Filters'), label: 'HEPA Filters' },
        { key: toKey('Replacement Gaskets'), label: 'Replacement Gaskets' },
      ]},
      { key: toKey('Components (small)'), label: 'Components (small)', leaves: [
        { key: toKey('Vacuum Cleaner Belts'), label: 'Vacuum Cleaner Belts' },
        { key: toKey('Small Motors'), label: 'Small Motors' },
      ]},
    ]
  },
  {
    key: toKey('Pet Supplies'),
    label: 'Pet Supplies',
    children: [
      { key: toKey('Pet Housing'), label: 'Pet Housing', leaves: [
        { key: toKey('Dog Crates'), label: 'Dog Crates' },
        { key: toKey('Bird/Parrot Cages'), label: 'Bird/Parrot Cages' },
        { key: toKey('Hamster Cages'), label: 'Hamster Cages' },
      ]},
      { key: toKey('Feeding & Care'), label: 'Feeding & Care', leaves: [
        { key: toKey('Bowls'), label: 'Bowls' },
        { key: toKey('Treats (Dog Snacks)'), label: 'Treats (Dog Snacks)', terms: ['Dog Treats','Dog Snacks'] },
        { key: toKey('Stain Removers'), label: 'Stain Removers' },
        { key: toKey('Poop Bag Dispensers'), label: 'Poop Bag Dispensers' },
        { key: toKey('Grooming Brushes'), label: 'Grooming Brushes' },
      ]},
      { key: toKey('Accessories & Toys'), label: 'Accessories & Toys', leaves: [
        { key: toKey('Collars & Leashes'), label: 'Collars & Leashes' },
        { key: toKey('Harnesses'), label: 'Harnesses' },
        { key: toKey('Cat Toys'), label: 'Cat Toys' },
        { key: toKey('Dog Backpacks'), label: 'Dog Backpacks' },
      ]},
      { key: toKey('Aquatics'), label: 'Aquatics', leaves: [
        { key: toKey('Aquariums'), label: 'Aquariums' },
        { key: toKey('Filters & Media'), label: 'Filters & Media' },
        { key: toKey('Aquarium Plants'), label: 'Aquarium Plants' },
        { key: toKey('Air Pumps'), label: 'Air Pumps' },
      ]},
    ]
  },
  {
    key: toKey('Gifts & Crafts'),
    label: 'Gifts & Crafts',
    children: [
      { key: toKey('Gifts'), label: 'Gifts', leaves: [
        { key: toKey('Gift Sets'), label: 'Gift Sets' },
        { key: toKey('Promotional Gifts'), label: 'Promotional Gifts' },
        { key: toKey('Wedding Souvenirs'), label: 'Wedding Souvenirs' },
        { key: toKey('Invitations'), label: 'Invitations' },
      ]},
      { key: toKey('Keychains'), label: 'Keychains', leaves: [
        { key: toKey('Leather'), label: 'Leather' },
        { key: toKey('Wood'), label: 'Wood' },
        { key: toKey('Crystal'), label: 'Crystal' },
        { key: toKey('Citrine'), label: 'Citrine' },
        { key: toKey('Natural Stone'), label: 'Natural Stone' },
        { key: toKey('Photo Keychains'), label: 'Photo Keychains' },
      ]},
      { key: toKey('Craft Supplies'), label: 'Craft Supplies', leaves: [
        { key: toKey('Stickers'), label: 'Stickers' },
        { key: toKey('Enamel Pins'), label: 'Enamel Pins' },
        { key: toKey('DIY Kits'), label: 'DIY Kits' },
        { key: toKey('Resin Molds'), label: 'Resin Molds' },
        { key: toKey('Cutting Mats'), label: 'Cutting Mats' },
        { key: toKey('Hobby Knives'), label: 'Hobby Knives' },
        { key: toKey('Bamboo Fans'), label: 'Bamboo Fans' },
      ]},
    ]
  },
  {
    key: toKey('Fabrics, Materials & DIY'),
    label: 'Fabrics, Materials & DIY',
    children: [
      { key: toKey('Textiles'), label: 'Textiles', leaves: [
        { key: toKey('Fabric (cotton/linen/poly)'), label: 'Fabric (cotton/linen/poly)' },
        { key: toKey('Tweed'), label: 'Tweed' },
        { key: toKey('Silk Yarn'), label: 'Silk Yarn' },
        { key: toKey('Felt Sheets'), label: 'Felt Sheets' },
      ]},
      { key: toKey('Plastics & Polymers'), label: 'Plastics & Polymers', leaves: [
        { key: toKey('PET/PC Sheets'), label: 'PET/PC Sheets' },
        { key: toKey('Acrylic Sheets'), label: 'Acrylic Sheets' },
        { key: toKey('EVA Foam'), label: 'EVA Foam' },
      ]},
      { key: toKey('Resins & Adhesives'), label: 'Resins & Adhesives', leaves: [
        { key: toKey('Craft Epoxy'), label: 'Craft Epoxy' },
        { key: toKey('UV Resin'), label: 'UV Resin' },
        { key: toKey('CA Glue'), label: 'CA Glue' },
        { key: toKey('Hot Glue'), label: 'Hot Glue' },
        { key: toKey('Double-Sided Tapes'), label: 'Double-Sided Tapes' },
      ]},
      { key: toKey('Dyes'), label: 'Dyes', leaves: [
        { key: toKey('Fabric Dyes'), label: 'Fabric Dyes' },
        { key: toKey('Tie-Dye Kits'), label: 'Tie-Dye Kits' },
        { key: toKey('Leather Dyes (small)'), label: 'Leather Dyes (small)' },
      ]},
    ]
  },
];
