export type CategoryDef = { key: string; featured: string[] };

export const CATEGORIES: CategoryDef[] = [
  { key: 'consumer-electronics', featured: [
    'Gaming Mouse','Gaming Keyboards','Mouse','Tablet PC','Gaming Laptops','Keyboards','Laptops','Computer Accessories','Computer Parts','Keycaps','Computer Case','Keyboard And Mouse','Desktops'
  ]},
  { key: 'sports-entertainment', featured: [
    'Bicycle Accessories','Jetski','Fishing Accessories','Accessories','Bicycle','Keyboard Instrument','Piano Keyboard','Camping Gear','Scooter Accessories','Bicycle Parts','Travel Trailers','Novelties','Hunting Accessories'
  ]},
  { key: 'school-office', featured: [
    'Badge Holder','Highlighters','Staplers','Laminator','Art Supplies','Typewriter','Notebooks','Gouache Paint','Plotter Cutter','Hole Punches','Electronic Dictionary','Office Stationery','Cutting Plotter'
  ]},
  { key: 'furniture', featured: [
    'Storage Cabinet','Plastic Chair','Baby Cribs','Baby Bed','Desk','Gaming Tables','Gaming Desk','Luggage Racks','Baby Fence','Wardrobe Closet','Waiting Chairs','Furniture accessories','Wedding Table'
  ]},
  { key: 'safety-security', featured: [
    'Micro Camera','Army Boots','Hidden Camera','Spy Camera','Mini Cameras','Boots','Keys','Respirator','Emergency Kits','Underwater Camera','Traffic Lights','Locksmith Tools','Wireless Camera'
  ]},
  { key: 'apparel-accessories', featured: [
    'Witch Costume','Top Hat','Fishing Suit','African Clothes','Church Hats','Carnival Costume','African Clothing','Boy Swimming Trunks','Knight Costume','Dreadlocks Cap','Collar Stays','Stage Costume','Clothing Chains'
  ]},
  { key: 'home-garden', featured: [
    'Irrigation Sprinkler','Dry herb vaporizers','Wedding Backdrop','Living Room Decoration','Christmas Gifts','Home Decor','Christmas decorations','Batter Dispenser','Opener Keychain','Fruit Tray','Glass Holder','Serviettes','Herb Vaporizer'
  ]},
  { key: 'beauty', featured: [
    'Cryolipolysis Slimming Machine','Eye Cream','Face Cream','Manicure Tables','Nail Supplies','Skin Care Products','Cosmetic','Rotary Machine','Cleaning Gel','Tanning Machine','Tattoo Guns','Tanning Bed','Nail Equipments'
  ]},
  { key: 'jewelry-eyewear-watches', featured: [
    'Moonstone','Hair Sticks','Fashion accessories','Fine Jewelry Earrings','Fine Jewelry Necklaces','Contact Lenses','Jewelry','Pocket Watch Chains','Tie Pin','Forehead Jewelry','Hematite Beads','Spacer Beads','Medical Glasses'
  ]},
  { key: 'shoes-accessories', featured: [
    'Cowboy Boots','Ankle Boots','Flat Shoes','Women Boots','Sandals','Men shoes','Women shoes','Fur Shoe','Leather Sandals','Leather Boots','Hunting Boots','Shoe Accessories','Winter Boots'
  ]},
  { key: 'luggage-bags-cases', featured: [
    "Men's Backpacks","Tactical Backpacks","Men's Handbags","Women's Backpacks",'Shoulder Bag','Backpack','Bag','Hydration Backpack','Basketball Bag','Sports Backpack','Hiking Backpack','Trolley Bag','Crossbody Bag'
  ]},
  { key: 'packaging-printing', featured: [
    'Food Bag','Pill Box','Wine Bottle','Pepper Spray','Wedding Favors','Plastic Bottles','Coffee Cup','Propane Tank','Beer Kegs','Card Box','Wedding Bag','Growth Hormone','Plastic Tray'
  ]},
  { key: 'parents-kids-toys', featured: [
    'Candy Toys','Boys clothing','Organizers','Party Decoration','Swimming Pool','Baby Strollers','Toys','Diy Toys','Water Toys','Light-up Toys','Infant Car Seats','Plush Backpacks','Airgun'
  ]},
  { key: 'personal-home-care', featured: [
    'Bleach','Glass Cleaners','Liquid Soap','Hair Extension Tools','Scissors','Washing Powder','Detergent','Barber Vest','Massage Cream','Disinfectant','Kitchen Cleaner','Hand Wash','Toilet Cleaners'
  ]},
  { key: 'health-medical', featured: [
    'Continuous Glucose Monitor','Ginseng','Stretcher','Oxygen Concentrator','Electric Wheelchair','Wheelchair','Collagen','Nebulizer Mask','Nursing Chair','Sterilizer Box','Patient Lift','Cpap Machine','Insulin Pen'
  ]},
  { key: 'gifts-crafts', featured: [
    'Leather Keychain','Promotional Business Gifts','Wedding Souvenirs','Natural stone','Wedding Invitation','Gift Sets','Keychain','Wood Key Chains','Citrine','Crystal Keychain','Window Stickers','Bamboo Fan','Enamel'
  ]},
  { key: 'pet-supplies', featured: [
    'Parrot Cage','Dog Crate','Hamster Cage','Cat Toy','Bird Cage','Aquariums','Pet Accessories','Poop Bag Dispenser','Dog Toilet','Aquarium Plants','Dog Snacks','Dog Backpack','Stain Removers'
  ]},
  { key: 'industrial-machinery', featured: [
    'Sorting Machine','Wet Grinder','Spindle Motor','Shafts','Peeling Machine','Balers','Table','Pneumatic Connector','Bho Extractor','Honey Centrifuge','Linear Robots','Honey Filter','Gear Cutting Machines'
  ]},
  { key: 'commercial-equipment', featured: [
    'Buffet Table','Christmas Inflatable','Kitchen Machines','Bakery Equipment','Cutting Machine','Freezers','Water Filter','Printing Materials','Promotion Tables','Security Robots','Headphone Stand','Cooking Machine','Cream Machine'
  ]},
  { key: 'construction-building-machinery', featured: [
    'Power Plant','Pavers','Mining Machinery','Crusher','Construction Machine','Crane','Concrete Pumps','Drill Head','Rippers','Stone Cutter','Forming Machine','Hydraulic Crane','Steam Turbine'
  ]},
  { key: 'construction-real-estate', featured: [
    'Tombstones','Veneers','Liquid Soap Dispensers','Exterior Doors','Toilet Accessories','Fireplaces','Doors','Garden Faucet','Robe Hooks','Filling Valves','Grating','Automatic Sliding Door','Gravel'
  ]},
  { key: 'lights-lighting', featured: [
    'Garden Lights','Outdoor Lighting','Led Lamp','Ceiling Lights','Lamp','Light','Led Light','Motif Lights','Lamp LED','Halloween lights','Smart Outdoor Lights','Garage Light','Working Light'
  ]},
  { key: 'home-appliances', featured: [
    'Industrial Fans','Gas Heaters','Water Cooler','Clothes Dryers','Car Refrigerators','Water Purifier','Kitchen Appliances','Refrigerator Motor','Vacuum Cleaner Motor','Electric Knives','Coffee Kettle','Washing Machine Motor','Toaster Ovens'
  ]},
  { key: 'automotive-supplies', featured: [
    'Interior Accessories','Car Interior Accessories','Car Alarms','Wax','Car Vacuum Cleaner','Cloth','Car Stickers','Exhaust Valve','Ramps','Tire Repair Tools','Car Decal','Emergency Tools','Car Organizers'
  ]},
  { key: 'vehicle-parts', featured: []},
  { key: 'tools-hardware', featured: []},
  { key: 'renewable-energy', featured: []},
  { key: 'electrical-equipment', featured: [
    'Cable Connector','Fuse Box','Limit Switches','Battery Terminal','Power Strips','Electrical Equipment','Connectors','Power Converter','Power Factor Controllers','Wire Clip','Electrical instruments','Patch Panel','Flow Switches'
  ]},
  { key: 'material-handling', featured: [
    'Trolley Cart','Pallet Truck','Winches','Conveyor Belt','Roller','Shelves','Forklifts','Anchor Winch','Forklift Parts','Casters','Forklift Truck','Manipulator','Lifter'
  ]},
  { key: 'testing-instruments', featured: [
    'Gas Regulator','Infrared Camera','Lab Equipment','Weighing Scales','Oscilloscopes','Digital Scale','Thermal Camera','Ph Test Strips','Measuring instruments','Dissolved Oxygen Meter','Gnss Receiver','Oxygen Regulator','Body Composition Analyzer'
  ]},
  { key: 'power-transmission', featured: [
    'Fan Motor','Hydraulic Motors','Linear Actuator','Gearboxes','Hydraulic Cylinders','Bearing','Motor','Conveyor Chain','Sprockets','Bushing','Bushings','Joint','Vibration Motors'
  ]},
  { key: 'electronic-components', featured: [
    'Touch Screen','Motion Sensor','Sensor','Power Supplies','LEDs','Keypad','Switches','Solenoids','Buzzer','Rectifiers','Encoders','Transistors','Antenna'
  ]},
  { key: 'vehicles-transportation', featured: [
    'Gas Scooters','UTVs','Golf Carts','Dirt Bike','ATVs','Electric Motorcycles','Motorcycle','Cruiser Motorcycles','Dump Trailer','Hybrid Car','Sportbikes','Electric ATVs','Pit Bike'
  ]},
  { key: 'agriculture-food-beverage', featured: [
    'Brandy','Fresh fruit','Mayonnaise','Fish Pond','Bread','Ice Cream','Pizza','Quinoa','Vinegar','Hams','Boer Goats','Mooncakes','Rum'
  ]},
  { key: 'raw-materials', featured: [
    'Sodium Hydroxide','Tweed Fabric','Herbicides','Zinc','Fabric','PET','PC','Polyurethane Rubber','Transmission Oils','Silk Yarn','Calcium Nitrate','Fungicides','Potassium Nitrate'
  ]},
  { key: 'fabrication-services', featured: [
    'Concrete Blocks Molds','Casting Services','Sheet Metal Fabrication','Machining Services','Plastic Mold','Moulds','Concrete Molds','Steel Products','Metal Products','Injection Mould','Plastic Model','Press Mold','Forging Services'
  ]},
  // Added extended IndiaMART-aligned categories
  { key: 'building-materials-equipment', featured: [
    'Prefabricated Houses','Scaffolding Planks','Construction Machines','Crushing Plants','Brick Making Machines','Fly Ash Brick Making Machine','Cement Brick Making Machine','Passenger Lifts','Residential Elevator','TMT Steel Bars','Shuttering Plywood','Excavator','Emulsion Paints','PVC Pipes'
  ]},
  { key: 'pharma-drugs', featured: [
    'Antibiotic Tablets','Antifungal Injection','Vitamin Tablets','Dietary Supplements','Mineral Supplement','Weight Loss Supplement','Weight Gain Nutrition','Immune Booster','Pre workout Supplements','Antiparasitic Drug','Anticoagulant Drugs','Nutraceuticals','Ayurvedic PCD'
  ]},
  { key: 'hospital-medical-equipment', featured: [
    'Medical Ventilators','Oxygen Cylinder','Rapid Test Kit','Biochemistry Analyzer','Patient Monitoring Systems','Blood Pressure Machine','Infrared Thermometers','X Ray Machine','ECG Machine','Stethoscope','Suction Machine','Dental Treatment Services','Ultrasound Machines'
  ]},
  { key: 'industrial-plants-machinery', featured: [
    'Agarbatti Making Machines','Oil Extraction Machine','Food Processing Machine','Rice Mill Machinery','Spice Processing Machines','Non Woven Bag Making Machine','Pani Puri Making Machine','Bakery Machinery','Lathe Machine','CNC Machines','Air Compressors','Water Treatment Plants','Reverse Osmosis Plants'
  ]},
  { key: 'packaging-material-machines', featured: [
    'Corrugated Box','PET Bottles','Bottle Caps','Plastic Pouches','Stand Up Pouch','Fruit Juice Packaging Machine','Shrink Packaging Machines','Vacuum Packaging Machines','Spices Packing Machines','Snack Packing Machine','Form Fill Seal Machines','Blister Packaging Machines','Zipper Pouches'
  ]},
  { key: 'chemicals-dyes', featured: [
    'Isopropyl Alcohol','Ethyl Alcohol','Glycerine','Silver Nitrate','Reactive Dyes','Acid Dyes','Direct Dyes','PVC Resin','Casting Resin','Micronutrient Fertilizers','Waterproofing Chemicals','Water Treatment Chemicals','Adhesive Chemical'
  ]},
  { key: 'transportation-logistics', featured: [
    'Air Cargo Service','Sea Cargo Service','Road Transportation Services','Goods Transport Services','Cold Chain Logistics','Third Party Logistics','Container Truck Service','Packers Movers','Household Relocation Service','Warehouse Racks','Tipper Truck Rental Services','Contract Logistics Service','Loading Unloading Services'
  ]},
];
