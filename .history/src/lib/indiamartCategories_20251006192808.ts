// IndiaMART specific hierarchical taxonomy.
// Generated from user supplied category/subcategory/leaf listing.

export interface IndiaMartLeaf {
  key: string;          // kebab-case unique key for the leaf
  label: string;        // display label
  term: string;         // search term (can differ from label if normalized)
  aliases?: string[];   // optional alternate search terms
}

export interface IndiaMartCategoryNode {
  key: string;                // kebab-case unique key for node
  label: string;              // display label
  children?: IndiaMartCategoryNode[]; // nested sub-groups
  leaves?: IndiaMartLeaf[];           // leaf search terms directly under this node
}

// Helper to make a slug key
function k(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

// Note: We trim duplicate first-leaf items that repeat subgroup heading.
// For each subgroup we include only distinct leaves.

export const INDIAMART_CATEGORIES: IndiaMartCategoryNode[] = [
  {
    key: 'building-construction-material-equipment',
    label: 'Building Construction Material & Equipment',
    children: [
      { key: 'prefabricated-houses', label: 'Prefabricated Houses', leaves: [] },
      { key: 'scaffolding-planks-plates', label: 'Scaffolding Planks & Plates', leaves: [] },
      { key: 'construction-machines', label: 'Construction Machines', leaves: [] },
      { key: 'crushing-machines-plants', label: 'Crushing Machines & Plants', leaves: [] },
      {
        key: 'brick-making-machines', label: 'Brick Making Machines', leaves: [
          { key: 'fly-ash-brick-making-machine', label: 'Fly Ash Brick Making Machine', term: 'Fly Ash Brick Making Machine' },
          { key: 'clay-brick-making-machine', label: 'Clay Brick Making Machine', term: 'Clay Brick Making Machine' },
          { key: 'cement-brick-making-machine', label: 'Cement Brick Making Machine', term: 'Cement Brick Making Machine' },
        ]
      },
      {
        key: 'passenger-lifts', label: 'Passenger Lifts', leaves: [
          { key: 'residential-elevator', label: 'Residential Elevator', term: 'Residential Elevator' },
          { key: 'kone-passenger-lift', label: 'Kone Passenger Lift', term: 'Kone Passenger Lift', aliases: ['Kone Lift'] },
          { key: 'stair-lift', label: 'Stair Lift', term: 'Stair Lift' },
        ]
      },
      {
        key: 'tmt-bars', label: 'TMT Bars', leaves: [
          { key: 'tmt-steel-bars', label: 'TMT Steel Bars', term: 'TMT Steel Bars' },
          { key: 'tata-tmt-bars', label: 'TATA TMT Bars', term: 'TATA TMT Bars', aliases: ['TATA TMT'] },
          { key: 'kamdhenu-tmt-bars', label: 'Kamdhenu TMT Bars', term: 'Kamdhenu TMT Bars', aliases: ['Kamdhenu TMT'] },
        ]
      },
      {
        key: 'plywoods', label: 'Plywoods', leaves: [
          { key: 'shuttering-plywood', label: 'Shuttering Plywood', term: 'Shuttering Plywood' },
          { key: 'laminated-plywood', label: 'Laminated Plywood', term: 'Laminated Plywood' },
          { key: 'waterproof-plywood', label: 'Waterproof Plywood', term: 'Waterproof Plywood' },
        ]
      },
      {
        key: 'excavator', label: 'Excavator', leaves: [
          { key: 'hitachi-excavator', label: 'Hitachi Excavator', term: 'Hitachi Excavator' },
          { key: 'hyundai-excavator', label: 'Hyundai Excavator', term: 'Hyundai Excavator' },
          { key: 'komatsu-excavator', label: 'Komatsu Excavator', term: 'Komatsu Excavator' },
        ]
      },
      {
        key: 'emulsion-paints', label: 'Emulsion Paints', leaves: [
          { key: 'asian-emulsion-paints', label: 'Asian Emulsion Paints', term: 'Asian Emulsion Paints' },
          { key: 'berger-emulsion-paints', label: 'Berger Emulsion Paints', term: 'Berger Emulsion Paints' },
          { key: 'nerolac-emulsion-paints', label: 'Nerolac Emulsion Paints', term: 'Nerolac Emulsion Paints' },
        ]
      },
      {
        key: 'wooden-door', label: 'Wooden Door', leaves: [
          { key: 'designer-wooden-door', label: 'Designer Wooden Door', term: 'Designer Wooden Door' },
          { key: 'plywood-door', label: 'Plywood Door', term: 'Plywood Door' },
          { key: 'wooden-flush-doors', label: 'Wooden Flush Doors', term: 'Wooden Flush Doors' },
        ]
      },
      {
        key: 'pvc-pipes', label: 'PVC Pipes', leaves: [
          { key: 'finolex-pipes', label: 'Finolex Pipes', term: 'Finolex Pipes' },
          { key: 'rigid-pvc-pipes', label: 'Rigid PVC Pipes', term: 'Rigid PVC Pipes' },
          { key: 'flexible-pvc-pipes', label: 'Flexible PVC Pipes', term: 'Flexible PVC Pipes' },
        ]
      },
      {
        key: 'building-brick', label: 'Building Brick', leaves: [
          { key: 'red-brick', label: 'Red Brick', term: 'Red Brick' },
          { key: 'fly-ash-bricks', label: 'Fly Ash Bricks', term: 'Fly Ash Bricks' },
          { key: 'cement-brick', label: 'Cement Brick', term: 'Cement Brick' },
        ]
      },
    ]
  },
  {
    key: 'electronics-electrical-goods-supplies',
    label: 'Electronics & Electrical Goods & Supplies',
    children: [
      { key: 'voltage-power-stabilizers', label: 'Voltage & Power Stabilizers', leaves: [] },
      { key: 'gps-navigation-devices', label: 'GPS and Navigation Devices', leaves: [] },
      { key: 'biometrics-access-control-devices', label: 'Biometrics & Access Control Devices', leaves: [] },
      { key: 'cctv-surveillance-systems', label: 'CCTV, Surveillance Systems and Parts', leaves: [] },
      {
        key: 'office-automation-products', label: 'Office Automation Products', leaves: [
          { key: 'multifunction-printer', label: 'Multifunction Printer', term: 'Multifunction Printer' },
          { key: 'xerox-machines', label: 'Xerox Machines', term: 'Xerox Machines' },
          { key: 'fingerprint-scanners', label: 'Fingerprint Scanners', term: 'Fingerprint Scanners' },
        ]
      },
      {
        key: 'sensors-transducers', label: 'Sensors & Transducers', leaves: [
          { key: 'level-sensors', label: 'Level Sensors', term: 'Level Sensors' },
          { key: 'proximity-sensor', label: 'Proximity Sensor', term: 'Proximity Sensor' },
          { key: 'sensor-home-office', label: 'Sensor for Home & Office', term: 'Sensor for Home & Office', aliases: ['Home Sensor','Office Sensor'] },
          { key: 'load-cell', label: 'Load Cell', term: 'Load Cell' },
        ]
      },
      {
        key: 'process-controllers', label: 'Process Controllers', leaves: [
          { key: 'level-controllers', label: 'Level Controllers', term: 'Level Controllers' },
          { key: 'motor-controllers', label: 'Motor Controllers', term: 'Motor Controllers' },
          { key: 'temperature-controller', label: 'Temperature Controller', term: 'Temperature Controller' },
        ]
      },
      {
        key: 'control-automation', label: 'Control & Automation', leaves: [
          { key: 'vfd', label: 'VFD', term: 'VFD' },
          { key: 'plc', label: 'PLC', term: 'PLC', aliases: ['Programmable Logic Controller'] },
          { key: 'hmi', label: 'HMI', term: 'HMI', aliases: ['Human Machine Interface'] },
        ]
      },
      {
        key: 'diodes-active-devices', label: 'Diodes & Active Devices', leaves: [
          { key: 'integrated-circuits', label: 'Integrated Circuits', term: 'Integrated Circuits' },
          { key: 'thyristors', label: 'Thyristors', term: 'Thyristors' },
          { key: 'light-emitting-diode', label: 'Light Emitting Diode', term: 'Light Emitting Diode', aliases: ['LED'] },
        ]
      },
      {
        key: 'wires-cables', label: 'Wires & Cables', leaves: [
          { key: 'house-wire', label: 'House Wire', term: 'House Wire' },
          { key: 'armoured-cable', label: 'Armoured Cable', term: 'Armoured Cable' },
          { key: 'power-cable', label: 'Power Cable', term: 'Power Cable' },
        ]
      },
      {
        key: 'commercial-lights', label: 'Commercial Lights', leaves: [
          { key: 'flood-lights', label: 'Flood Lights', term: 'Flood Lights' },
          { key: 'street-lights', label: 'Street Lights', term: 'Street Lights' },
          { key: 'panel-light', label: 'Panel Light', term: 'Panel Light' },
        ]
      },
      {
        key: 'batteries', label: 'Batteries', leaves: [
          { key: 'lithium-battery', label: 'Lithium Battery', term: 'Lithium Battery' },
          { key: 'inverter-batteries', label: 'Inverter Batteries', term: 'Inverter Batteries' },
          { key: 'electric-vehicle-battery', label: 'Electric Vehicle Battery', term: 'Electric Vehicle Battery', aliases: ['EV Battery'] },
        ]
      },
      {
        key: 'solar-renewable-energy', label: 'Solar & Renewable Energy', leaves: [
          { key: 'solar-panels', label: 'Solar Panels', term: 'Solar Panels' },
          { key: 'solar-inverter', label: 'Solar Inverter', term: 'Solar Inverter' },
          { key: 'solar-pumps', label: 'Solar Pumps', term: 'Solar Pumps' },
        ]
      },
    ]
  },
  // Additional top-level groups omitted here for brevity in this initial commit.
  {
    key: 'pharmaceutical-drug-medicine',
    label: 'Pharmaceutical Drug, Medicine, Medical Care & Consultation',
    children: [
      {
        key: 'pharmaceutical-drug', label: 'Pharmaceutical Drug', leaves: [
          { key: 'anticoagulant-antiplatelet-drugs', label: 'Anticoagulant and Antiplatelet Drugs', term: 'Anticoagulant Drug', aliases: ['Antiplatelet Drug'] },
          { key: 'antiparasitic-drug', label: 'Antiparasitic Drug', term: 'Antiparasitic Drug' },
          { key: 'antibiotic-tablets-capsule-syrup', label: 'Antibiotic Tablets, Capsule & Syrup', term: 'Antibiotic Tablets', aliases: ['Antibiotic Capsules','Antibiotic Syrup'] },
          { key: 'antifungal-injection-tablet-syrup', label: 'Antifungal Injection, Tablet & Syrup', term: 'Antifungal Tablet', aliases: ['Antifungal Injection','Antifungal Syrup'] },
        ]
      },
      {
        key: 'nutraceuticals', label: 'Nutraceuticals', leaves: [
          { key: 'vitamin-tablets-capsules', label: 'Vitamin Tablets & Capsules', term: 'Vitamin Tablets', aliases: ['Vitamin Capsules'] },
          { key: 'weight-loss-supplement', label: 'Weight Loss Supplement', term: 'Weight Loss Supplement' },
          { key: 'dietary-supplements', label: 'Dietary Supplements', term: 'Dietary Supplements' },
          { key: 'mineral-supplement', label: 'Mineral Supplement', term: 'Mineral Supplement' },
        ]
      },
      {
        key: 'fitness-supplements', label: 'Fitness Supplements', leaves: [
          { key: 'weight-gain-nutrition', label: 'Weight Gain Nutrition', term: 'Weight Gain Nutrition' },
            { key: 'weight-gain-capsule', label: 'Weight Gain Capsule', term: 'Weight Gain Capsule' },
          { key: 'pre-workout-supplements', label: 'Pre workout Supplements', term: 'Pre Workout Supplements' },
          { key: 'immune-booster', label: 'Immune Booster', term: 'Immune Booster' },
        ]
      },
      {
        key: 'medical-treatment-services', label: 'Medical Treatment Services', leaves: [
          { key: 'dental-treatment-services', label: 'Dental Treatment Services', term: 'Dental Treatment Service' },
          { key: 'medical-surgery-services', label: 'Medical Surgery Services', term: 'Surgery Services' },
          { key: 'eye-treatment', label: 'Eye Treatment', term: 'Eye Treatment' },
          { key: 'plastic-surgery-services', label: 'Plastic Surgery Services', term: 'Plastic Surgery Service' },
        ]
      },
      {
        key: 'medical-test-services', label: 'Medical Test Services', leaves: [
          { key: 'ct-scan-services', label: 'CT Scan Services', term: 'CT Scan Service' },
          { key: 'ultrasound-services', label: 'Ultrasound Services', term: 'Ultrasound Service' },
          { key: 'echo-cardiography', label: 'ECHO Cardiography', term: 'ECHO Cardiography' },
          { key: 'blood-testing', label: 'Blood Testing', term: 'Blood Testing' },
        ]
      },
      {
        key: 'pcd-pharma-franchise', label: 'PCD Pharma Franchise', leaves: [
          { key: 'pharma-franchise', label: 'Pharma Franchise', term: 'Pharma Franchise' },
          { key: 'allopathic-pcd-pharma-franchise', label: 'Allopathic PCD Pharma Franchise', term: 'Allopathic PCD Pharma Franchise' },
          { key: 'ayurvedic-pcd-pharma-franchise', label: 'Ayurvedic PCD Pharma Franchise', term: 'Ayurvedic PCD Pharma Franchise' },
          { key: 'veterinary-pcd-pharma-franchise', label: 'Veterinary PCD Pharma Franchise', term: 'Veterinary PCD Pharma Franchise' },
        ]
      },
    ]
  },
  {
    key: 'hospital-medical-equipment',
    label: 'Hospital and Medical Equipment',
    children: [
      { key: 'medical-ventilators', label: 'Medical Ventilators', leaves: [] },
      { key: 'oxygen-cylinder', label: 'Oxygen Cylinder', leaves: [] },
      { key: 'patient-handling-equipment', label: 'Patient Handling Equipment', leaves: [] },
      { key: 'cpap-bipap-machine-accessories', label: 'CPAP, BiPAP Machine & Accessories', leaves: [] },
      { key: 'poct-devices', label: 'POCT Devices', leaves: [] },
      {
        key: 'medical-laboratory-instruments', label: 'Medical Laboratory Instruments', leaves: [
          { key: 'rapid-test-kit', label: 'Rapid Test Kit', term: 'Rapid Test Kit' },
          { key: 'biochemistry-analyzer', label: 'Biochemistry Analyzer', term: 'Biochemistry Analyzer' },
          { key: 'blood-bank-equipments', label: 'Blood Bank Equipments', term: 'Blood Bank Equipment' },
          { key: 'hematology-analyzers', label: 'Hematology Analyzers', term: 'Hematology Analyzer' },
        ]
      },
      {
        key: 'patient-monitoring-systems', label: 'Patient Monitoring Systems', leaves: [
          { key: 'blood-pressure-machine', label: 'Blood Pressure Machine', term: 'Blood Pressure Machine' },
          { key: 'capnometer', label: 'Capnometer', term: 'Capnometer' },
          { key: 'medical-monitor', label: 'Medical Monitor', term: 'Medical Monitor' },
          { key: 'surgical-monitor', label: 'Surgical Monitor', term: 'Surgical Monitor' },
        ]
      },
      {
        key: 'thermometer', label: 'Thermometer', leaves: [
          { key: 'infrared-thermometers', label: 'Infrared Thermometers', term: 'Infrared Thermometer' },
          { key: 'forehead-thermometer', label: 'Forehead Thermometer', term: 'Forehead Thermometer' },
          { key: 'non-contact-thermometer', label: 'Non Contact Thermometer', term: 'Non Contact Thermometer' },
          { key: 'digital-thermometers', label: 'Digital Thermometers', term: 'Digital Thermometer' },
        ]
      },
      {
        key: 'medical-imaging-machine', label: 'Medical Imaging Machine', leaves: [
          { key: 'x-ray-machine', label: 'X Ray Machine', term: 'X Ray Machine', aliases: ['X-Ray Machine'] },
          { key: 'ultrasound-machines', label: 'Ultrasound Machines', term: 'Ultrasound Machine' },
          { key: 'ecg-machine', label: 'ECG Machine', term: 'ECG Machine' },
          { key: 'doppler-machine', label: 'Doppler Machine', term: 'Doppler Machine' },
        ]
      },
      {
        key: 'stethoscope', label: 'Stethoscope', leaves: [
          { key: 'cardiology-stethoscope', label: 'Cardiology Stethoscope', term: 'Cardiology Stethoscope' },
          { key: 'dual-head-stethoscope', label: 'Dual Head Stethoscope', term: 'Dual Head Stethoscope' },
          { key: 'electronic-stethoscope', label: 'Electronic Stethoscope', term: 'Electronic Stethoscope' },
          { key: 'pediatric-stethoscope', label: 'Pediatric Stethoscope', term: 'Pediatric Stethoscope' },
        ]
      },
      {
        key: 'suction-machine', label: 'Suction Machine', leaves: [
          { key: 'electric-suction-unit', label: 'Electric Suction Unit', term: 'Electric Suction Unit' },
          { key: 'foot-operated-suction-unit', label: 'Foot Operated Suction Unit', term: 'Foot Operated Suction Unit' },
          { key: 'liposuction-machine', label: 'Liposuction Machine', term: 'Liposuction Machine' },
          { key: 'central-suction-system', label: 'Central Suction System', term: 'Central Suction System' },
        ]
      },
      {
        key: 'covid-prevention-care', label: 'COVID-19 Prevention & Care Supplies', leaves: [
          { key: 'mask-sanitizer-hygiene-supplies', label: 'Mask, Sanitizer & Other Hygiene Supplies', term: 'Mask Sanitizer' },
          { key: 'hospital-consumables-diagnostics', label: 'Hospital Consumables & Diagnostics', term: 'Hospital Consumables' },
        ]
      },
    ]
  },
  {
    key: 'industrial-plants-machinery-equipment',
    label: 'Industrial Plants, Machinery & Equipment',
    children: [
      { key: 'agarbatti-making-machines', label: 'Agarbatti Making Machines', leaves: [] },
      { key: 'disposable-plate-making-machine', label: 'Disposable Plate Making Machine', leaves: [] },
      { key: 'oil-extraction-machine', label: 'Oil Extraction Machine', leaves: [] },
      { key: 'animal-feed-making-machine', label: 'Animal Feed Making Machine', leaves: [] },
      {
        key: 'food-processing-machine', label: 'Food Processing Machine', leaves: [
          { key: 'flour-mill', label: 'Flour Mill', term: 'Flour Mill Machine' },
          { key: 'rice-mill-machinery', label: 'Rice Mill Machinery', term: 'Rice Mill Machinery' },
          { key: 'spice-processing-machines', label: 'Spice Processing Machines', term: 'Spice Processing Machine' },
        ]
      },
      {
        key: 'bag-making-machine', label: 'Bag Making Machine', leaves: [
          { key: 'non-woven-bag-making-machine', label: 'Non Woven Bag Making Machine', term: 'Non Woven Bag Making Machine' },
          { key: 'paper-bag-making-machine', label: 'Paper Bag Making Machine', term: 'Paper Bag Making Machine' },
          { key: 'biodegradable-bag-making-machine', label: 'Biodegradable Bag Making Machine', term: 'Biodegradable Bag Making Machine' },
        ]
      },
      {
        key: 'snack-machine', label: 'Snack Machine', leaves: [
          { key: 'popcorn-machines', label: 'Popcorn Machines', term: 'Popcorn Machine' },
          { key: 'pani-puri-making-machine', label: 'Pani Puri Making Machine', term: 'Pani Puri Making Machine' },
          { key: 'namkeen-making-machines', label: 'Namkeen Making Machines', term: 'Namkeen Making Machine' },
        ]
      },
      {
        key: 'bakery-dairy-machinery', label: 'Bakery & Dairy Machinery', leaves: [
          { key: 'bakery-machinery', label: 'Bakery Machinery', term: 'Bakery Machinery' },
          { key: 'bakery-oven', label: 'Bakery Oven', term: 'Bakery Oven' },
          { key: 'sweets-making-machine', label: 'Sweets Making Machine', term: 'Sweets Making Machine' },
        ]
      },
      {
        key: 'cnc-machines-lathe-machine', label: 'CNC Machines & Lathe Machine', leaves: [
          { key: 'lathe-machine', label: 'Lathe Machine', term: 'Lathe Machine' },
          { key: 'cnc-machines', label: 'CNC Machines', term: 'CNC Machine' },
          { key: 'cnc-vertical-machining-centers', label: 'CNC Vertical Machining Centers', term: 'CNC Vertical Machining Center' },
        ]
      },
      {
        key: 'printing-machine', label: 'Printing Machine', leaves: [
          { key: 'large-format-printers', label: 'Large Format Printers', term: 'Large Format Printer' },
          { key: 'offset-printing-machines', label: 'Offset Printing Machines', term: 'Offset Printing Machine' },
          { key: 'sublimation-printing-machine', label: 'Sublimation Printing Machine', term: 'Sublimation Printing Machine' },
        ]
      },
      {
        key: 'air-compressors', label: 'Air Compressors', leaves: [
          { key: 'oil-free-air-compressor', label: 'Oil Free Air Compressor', term: 'Oil Free Air Compressor' },
          { key: 'reciprocating-compressors', label: 'Reciprocating Compressors', term: 'Reciprocating Compressor' },
          { key: 'refrigeration-compressors', label: 'Refrigeration Compressors', term: 'Refrigeration Compressor' },
        ]
      },
      {
        key: 'water-purification-plants', label: 'Water Purification Plants', leaves: [
          { key: 'water-softening-systems', label: 'Water Softening Systems', term: 'Water Softening System' },
          { key: 'water-treatment-plants', label: 'Water Treatment Plants', term: 'Water Treatment Plant' },
          { key: 'reverse-osmosis-plants', label: 'Reverse Osmosis Plants', term: 'Reverse Osmosis Plant' },
        ]
      },
      {
        key: 'food-processing-plants', label: 'Food Processing Plants', leaves: [
          { key: 'animal-feed-making-machine-plant', label: 'Animal Feed Making Machine', term: 'Animal Feed Making Machine' },
          { key: 'sugarcane-juice-machine', label: 'Sugarcane Juice Machine', term: 'Sugarcane Juice Machine' },
          { key: 'wet-grinder', label: 'Wet Grinder', term: 'Wet Grinder' },
        ]
      },
    ]
  },
  {
    key: 'industrial-engineering-products',
    label: 'Industrial & Engineering Products, Spares and Supplies',
    children: [
      { key: 'hydraulic-pumps', label: 'Hydraulic Pumps', leaves: [] },
      { key: 'roof-ventilators', label: 'Roof Ventilators', leaves: [] },
      { key: 'electrical-insulation-sleeving', label: 'Electrical Insulation Sleeving', leaves: [] },
      { key: 'welding-electrodes', label: 'Welding Electrodes', leaves: [] },
      {
        key: 'submersible-pump', label: 'Submersible Pump', leaves: [
          { key: 'borewell-submersible-pump', label: 'Borewell Submersible Pump', term: 'Borewell Submersible Pump' },
          { key: 'cri-submersible-pumps', label: 'CRI Submersible Pumps', term: 'CRI Submersible Pump' },
          { key: 'open-well-submersible-pump', label: 'Open Well Submersible Pump', term: 'Open Well Submersible Pump' },
        ]
      },
      {
        key: 'automotive-oils', label: 'Automotive Oils', leaves: [
          { key: 'engine-oil', label: 'Engine Oil', term: 'Engine Oil' },
          { key: 'gear-oil', label: 'Gear Oil', term: 'Gear Oil' },
          { key: 'lubricating-oil', label: 'Lubricating Oil', term: 'Lubricating Oil' },
        ]
      },
      {
        key: 'water-tanks', label: 'Water Tanks', leaves: [
          { key: 'triple-layered-water-tanks', label: 'Triple Layered Water Tanks', term: 'Triple Layer Water Tank' },
          { key: 'stainless-steel-water-tank', label: 'Stainless Steel Water Tank', term: 'Stainless Steel Water Tank' },
          { key: 'supreme-water-tanks', label: 'Supreme Water Tanks', term: 'Supreme Water Tank' },
        ]
      },
      {
        key: 'pvc-sheets', label: 'PVC Sheets', leaves: [
          { key: 'pvc-foam-sheets', label: 'PVC Foam Sheets', term: 'PVC Foam Sheet' },
          { key: 'pvc-marble-sheet', label: 'PVC Marble Sheet', term: 'PVC Marble Sheet' },
          { key: 'transparent-pvc-sheet', label: 'Transparent PVC Sheet', term: 'Transparent PVC Sheet' },
        ]
      },
      {
        key: 'conveyor-components', label: 'Conveyor Components', leaves: [
          { key: 'conveyor-belt', label: 'Conveyor Belt', term: 'Conveyor Belt' },
          { key: 'conveyor-rollers', label: 'Conveyor Rollers', term: 'Conveyor Roller' },
          { key: 'conveyor-chains', label: 'Conveyor Chains', term: 'Conveyor Chain' },
        ]
      },
      {
        key: 'plastic-scrap', label: 'Plastic Scrap', leaves: [
          { key: 'pp-scrap', label: 'PP Scrap', term: 'PP Scrap' },
          { key: 'pet-bottle-scrap', label: 'Pet Bottle Scrap', term: 'Pet Bottle Scrap' },
          { key: 'pet-chips-scrap', label: 'PET Chips Scrap', term: 'PET Chips Scrap' },
        ]
      },
      {
        key: 'packaging-tapes', label: 'Packaging Tapes', leaves: [
          { key: 'self-adhesive-tapes', label: 'Self Adhesive Tapes', term: 'Self Adhesive Tape' },
          { key: 'bopp-tapes', label: 'BOPP Tapes', term: 'BOPP Tape' },
          { key: 'brown-tape', label: 'Brown Tape', term: 'Brown Tape' },
        ]
      },
      {
        key: 'industrial-rack', label: 'Industrial Rack', leaves: [
          { key: 'warehouse-racks', label: 'Warehouse Racks', term: 'Warehouse Rack' },
          { key: 'slotted-angle-racks', label: 'Slotted Angle Racks', term: 'Slotted Angle Rack' },
          { key: 'pallet-racks', label: 'Pallet Racks', term: 'Pallet Rack' },
        ]
      },
      {
        key: 'water-heater-geyser', label: 'Water Heater & Geyser', leaves: [
          { key: 'solar-water-heater', label: 'Solar Water Heater', term: 'Solar Water Heater' },
          { key: 'electric-geyser', label: 'Electric Geyser', term: 'Electric Geyser' },
          { key: 'gas-geyser', label: 'Gas Geyser', term: 'Gas Geyser' },
        ]
      },
    ]
  },
  {
    key: 'food-agriculture-farming',
    label: 'Food, Agriculture & Farming',
    children: [
      { key: 'dairy-products', label: 'Dairy Products', leaves: [] },
      { key: 'cooking-oil', label: 'Cooking Oil', leaves: [] },
      { key: 'tractor', label: 'Tractor', leaves: [] },
      { key: 'cultivator', label: 'Cultivator', leaves: [] },
      {
        key: 'rice', label: 'Rice', leaves: [
          { key: 'basmati-rice', label: 'Basmati Rice', term: 'Basmati Rice' },
          { key: 'kolam-rice', label: 'Kolam Rice', term: 'Kolam Rice' },
          { key: 'ponni-rice', label: 'Ponni Rice', term: 'Ponni Rice' },
          { key: 'sona-masoori-rice', label: 'Sona Masoori Rice', term: 'Sona Masoori Rice' },
        ]
      },
      {
        key: 'wheat', label: 'Wheat', leaves: [
          { key: 'wheat-grains', label: 'Wheat Grains', term: 'Wheat Grains' },
          { key: 'milling-wheat', label: 'Milling Wheat', term: 'Milling Wheat' },
          { key: 'lokwan-wheat', label: 'Lokwan Wheat', term: 'Lokwan Wheat' },
        ]
      },
      {
        key: 'pulses', label: 'Pulses', leaves: [
          { key: 'toor-dal', label: 'Toor Dal', term: 'Toor Dal' },
          { key: 'chana-dal', label: 'Chana Dal', term: 'Chana Dal' },
          { key: 'urad-dal', label: 'Urad Dal', term: 'Urad Dal' },
          { key: 'moong-dal', label: 'Moong Dal', term: 'Moong Dal' },
        ]
      },
      {
        key: 'fresh-vegetables', label: 'Fresh Vegetables', leaves: [
          { key: 'potato', label: 'Potato', term: 'Potato' },
          { key: 'onion', label: 'Onion', term: 'Onion' },
          { key: 'tomato', label: 'Tomato', term: 'Tomato' },
          { key: 'mushroom', label: 'Mushroom', term: 'Mushroom' },
        ]
      },
      {
        key: 'whole-spices', label: 'Whole Spices', leaves: [
          { key: 'green-cardamom', label: 'Green Cardamom', term: 'Green Cardamom' },
          { key: 'black-pepper', label: 'Black Pepper', term: 'Black Pepper' },
          { key: 'cardamom', label: 'Cardamom', term: 'Cardamom' },
          { key: 'turmeric', label: 'Turmeric', term: 'Turmeric' },
        ]
      },
      {
        key: 'seeds', label: 'Seeds', leaves: [
          { key: 'vegetable-seeds', label: 'Vegetable Seeds', term: 'Vegetable Seeds' },
          { key: 'hybrid-seeds', label: 'Hybrid Seeds', term: 'Hybrid Seeds' },
          { key: 'seed-spices', label: 'Seed Spices', term: 'Seed Spices' },
          { key: 'oil-seeds', label: 'Oil Seeds', term: 'Oil Seeds' },
        ]
      },
      {
        key: 'fertilizer', label: 'Fertilizer', leaves: [
          { key: 'organic-fertilizers', label: 'Organic Fertilizers', term: 'Organic Fertilizer' },
          { key: 'bio-fertilizers', label: 'Bio Fertilizers', term: 'Bio Fertilizer' },
          { key: 'vermicompost', label: 'Vermicompost', term: 'Vermicompost' },
          { key: 'npk-fertilizer', label: 'NPK Fertilizer', term: 'NPK Fertilizer' },
        ]
      },
      {
        key: 'agricultural-tools', label: 'Agricultural Tools', leaves: [
          { key: 'agricultural-sprayers', label: 'Agricultural Sprayers', term: 'Agricultural Sprayer' },
          { key: 'agricultural-plough', label: 'Agricultural Plough', term: 'Agricultural Plough' },
          { key: 'disc-harrow', label: 'Disc Harrow', term: 'Disc Harrow' },
          { key: 'land-leveler', label: 'Land Leveler', term: 'Land Leveler' },
        ]
      },
      {
        key: 'agricultural-machinery', label: 'Agricultural Machinery', leaves: [
          { key: 'brush-cutters', label: 'Brush Cutters', term: 'Brush Cutter' },
          { key: 'chain-saw', label: 'Chain Saw', term: 'Chain Saw' },
          { key: 'power-weeder', label: 'Power Weeder', term: 'Power Weeder' },
          { key: 'power-tiller', label: 'Power Tiller', term: 'Power Tiller' },
        ]
      },
    ]
  },
  {
    key: 'apparel-clothing-garments',
    label: 'Apparel, Clothing & Garments',
    children: [
      { key: 'apparel-clothing-fabric', label: 'Apparel & Clothing Fabric', leaves: [] },
      { key: 'kids-wear', label: 'Kids Wear', leaves: [] },
      { key: 'ladies-suits-dress-material', label: 'Ladies Suits & Dress Material', leaves: [] },
      {
        key: 'ladies-kurtis', label: 'Ladies Kurtis', leaves: [
          { key: 'designer-kurtis', label: 'Designer Kurtis', term: 'Designer Kurtis' },
          { key: 'cotton-kurti', label: 'Cotton Kurti', term: 'Cotton Kurti' },
          { key: 'ladies-woolen-kurti', label: 'Ladies Woolen Kurti', term: 'Woolen Kurti' },
        ]
      },
      {
        key: 'mens-t-shirts', label: "Mens T-Shirts", leaves: [
          { key: 'mens-round-neck-t-shirt', label: 'Mens Round Neck T Shirt', term: 'Mens Round Neck T Shirt' },
          { key: 'mens-polo-t-shirt', label: 'Mens Polo T Shirt', term: 'Mens Polo T Shirt' },
          { key: 'graphic-printed-t-shirt', label: 'Graphic Printed T-Shirt', term: 'Graphic Printed T Shirt' },
        ]
      },
      {
        key: 'blazers', label: 'Blazers', leaves: [
          { key: 'mens-blazer', label: 'Mens Blazer', term: 'Mens Blazer' },
          { key: 'womens-blazer', label: 'Womens Blazer', term: 'Women Blazer' },
          { key: 'designer-blazer', label: 'Designer Blazer', term: 'Designer Blazer' },
        ]
      },
      {
        key: 'safety-shoes', label: 'Safety Shoes', leaves: [
          { key: 'leather-safety-shoes', label: 'Leather Safety Shoes', term: 'Leather Safety Shoes' },
          { key: 'steel-toe-safety-shoes', label: 'Steel Toe Safety Shoes', term: 'Steel Toe Safety Shoes' },
          { key: 'industrial-shoes', label: 'Industrial Shoes', term: 'Industrial Shoes' },
        ]
      },
      {
        key: 'trouser', label: 'Trouser', leaves: [
          { key: 'cargo-pant', label: 'Cargo Pant', term: 'Cargo Pant' },
          { key: 'jogger-pant', label: 'Jogger Pant', term: 'Jogger Pant' },
          { key: 'chino-trousers', label: 'Chino Trousers', term: 'Chino Trousers' },
        ]
      },
      {
        key: 'mannequins', label: 'Mannequins', leaves: [
          { key: 'female-mannequins', label: 'Female Mannequins', term: 'Female Mannequin' },
          { key: 'dress-forms', label: 'Dress Forms', term: 'Dress Form' },
          { key: 'male-mannequins', label: 'Male Mannequins', term: 'Male Mannequin' },
        ]
      },
      {
        key: 'commercial-uniforms', label: 'Commercial Uniforms', leaves: [
          { key: 'worker-uniform', label: 'Worker Uniform', term: 'Worker Uniform' },
          { key: 'housekeeping-uniform', label: 'Housekeeping Uniform', term: 'Housekeeping Uniform' },
          { key: 'corporate-uniform', label: 'Corporate Uniform', term: 'Corporate Uniform' },
        ]
      },
      {
        key: 'shirt', label: 'Shirt', leaves: [
          { key: 'printed-shirt', label: 'Printed Shirt', term: 'Printed Shirt' },
          { key: 'designer-shirt', label: 'Designer Shirt', term: 'Designer Shirt' },
          { key: 'plain-shirt', label: 'Plain Shirt', term: 'Plain Shirt' },
        ]
      },
      {
        key: 'synthetic-fabric', label: 'Synthetic Fabric', leaves: [
          { key: 'rayon-fabrics', label: 'Rayon Fabrics', term: 'Rayon Fabric' },
          { key: 'faux-fur-fabric', label: 'Faux Fur Fabric', term: 'Faux Fur Fabric' },
          { key: 'viscose-fabrics', label: 'Viscose Fabrics', term: 'Viscose Fabric' },
        ]
      },
    ]
  },
  {
    key: 'packaging-material-supplies-machines',
    label: 'Packaging Material, Supplies & Machines',
    children: [
      { key: 'pouch-packaging-machines', label: 'Pouch Packaging Machines', leaves: [] },
      { key: 'non-woven-bag', label: 'Non Woven Bag', leaves: [] },
      { key: 'filling-machines', label: 'Filling Machines', leaves: [] },
      { key: 'bag-sealer', label: 'Bag Sealer', leaves: [] },
      {
        key: 'corrugated-packaging-boxes', label: 'Corrugated Packaging Boxes', leaves: [
          { key: 'corrugated-box', label: 'Corrugated Box', term: 'Corrugated Box' },
          { key: 'three-ply-corrugated-box', label: '3 Ply Corrugated Box', term: '3 Ply Corrugated Box' },
          { key: 'five-ply-corrugated-box', label: '5 Ply Corrugated Box', term: '5 Ply Corrugated Box' },
          { key: 'heavy-duty-industrial-corrugated-boxes', label: 'Heavy Duty Industrial Corrugated Boxes', term: 'Heavy Duty Corrugated Box' },
          { key: 'seven-ply-corrugated-box', label: '7 Ply Corrugated Box', term: '7 Ply Corrugated Box' },
        ]
      },
      {
        key: 'plastic-bottles', label: 'Plastic Bottles', leaves: [
          { key: 'pet-bottles', label: 'PET Bottles', term: 'PET Bottle' },
          { key: 'hdpe-bottle', label: 'HDPE Bottle', term: 'HDPE Bottle' },
          { key: 'plastic-spray-bottle', label: 'Plastic Spray Bottle', term: 'Plastic Spray Bottle' },
          { key: 'transparent-plastic-bottles', label: 'Transparent Plastic Bottles', term: 'Transparent Plastic Bottle' },
          { key: 'packaging-bottles', label: 'Packaging Bottles', term: 'Packaging Bottles' },
        ]
      },
      {
        key: 'cap-closures', label: 'Cap Closures', leaves: [
          { key: 'bottle-caps', label: 'Bottle Caps', term: 'Bottle Caps' },
          { key: 'jar-cap', label: 'Jar Cap', term: 'Jar Cap' },
          { key: 'flip-top-caps', label: 'Flip Top Caps', term: 'Flip Top Caps' },
          { key: 'metal-caps', label: 'Metal Caps', term: 'Metal Caps' },
          { key: 'screw-caps', label: 'Screw Caps', term: 'Screw Caps' },
        ]
      },
      {
        key: 'packaging-pouch', label: 'Packaging Pouch', leaves: [
          { key: 'plastic-pouches', label: 'Plastic Pouches', term: 'Plastic Pouches' },
          { key: 'stand-up-pouch', label: 'Stand Up Pouch', term: 'Stand Up Pouch' },
          { key: 'zipper-pouches', label: 'Zipper Pouches', term: 'Zipper Pouches' },
          { key: 'paper-pouch', label: 'Paper Pouch', term: 'Paper Pouch' },
          { key: 'printed-pouches', label: 'Printed Pouches', term: 'Printed Pouches' },
        ]
      },
      {
        key: 'packaging-machines', label: 'Packaging Machines', leaves: [
          { key: 'pouch-packaging-machines-leaf', label: 'Pouch Packaging Machines', term: 'Pouch Packaging Machine' },
          { key: 'fruit-juice-packaging-machine', label: 'Fruit Juice Packaging Machine', term: 'Fruit Juice Packaging Machine' },
          { key: 'blister-packaging-machines', label: 'Blister Packaging Machines', term: 'Blister Packaging Machine' },
          { key: 'shrink-packaging-machines', label: 'Shrink Packaging Machines', term: 'Shrink Packaging Machine' },
          { key: 'vacuum-packaging-machines', label: 'Vacuum Packaging Machines', term: 'Vacuum Packaging Machine' },
        ]
      },
      {
        key: 'form-fill-seal-packaging-machines', label: 'Form Fill & Seal Packaging Machines', leaves: [
          { key: 'spices-packing-machines', label: 'Spices Packing Machines', term: 'Spice Packing Machine' },
          { key: 'liquid-packaging-machinery', label: 'Liquid Packaging Machinery', term: 'Liquid Packaging Machine' },
          { key: 'fertilizer-packing-machine', label: 'Fertilizer Packing Machine', term: 'Fertilizer Packing Machine' },
          { key: 'snack-packing-machine', label: 'Snack Packing Machine', term: 'Snack Packing Machine' },
          { key: 'vertical-form-fill-seal-machines', label: 'Vertical Form Fill Seal Machines', term: 'Vertical Form Fill Seal Machine' },
        ]
      },
    ]
  },
  {
    key: 'chemicals-dyes-solvents',
    label: 'Chemicals, Dyes, Solvents & Allied Products',
    children: [
      { key: 'paint-additives', label: 'Paint Additives', leaves: [] },
      { key: 'inorganic-salts', label: 'Inorganic Salts', leaves: [] },
      { key: 'organic-inorganic-solvents', label: 'Organic & Inorganic Solvents', leaves: [] },
      { key: 'waterproofing-chemicals', label: 'Waterproofing Chemicals', leaves: [] },
      {
        key: 'industrial-alcohol', label: 'Industrial Alcohol', leaves: [
          { key: 'rubbing-alcohol-ipa', label: 'Rubbing Alcohol, Isopropyl Alcohol IPA', term: 'Isopropyl Alcohol' },
          { key: 'ethyl-alcohol', label: 'Ethyl Alcohol', term: 'Ethyl Alcohol' },
          { key: 'neutral-ethanol', label: 'Neutral Ethanol', term: 'Neutral Ethanol' },
        ]
      },
      {
        key: 'chemical-compound', label: 'Chemical Compound', leaves: [
          { key: 'ipa-hcl', label: 'IPA HCL', term: 'IPA HCL' },
          { key: 'glycerine', label: 'Glycerine', term: 'Glycerine' },
          { key: 'laboratory-reagents', label: 'Laboratory Reagents', term: 'Laboratory Reagent' },
          { key: 'silver-nitrate', label: 'Silver Nitrate', term: 'Silver Nitrate' },
        ]
      },
      {
        key: 'industrial-chemicals', label: 'Industrial Chemicals', leaves: [
          { key: 'speciality-chemicals', label: 'Speciality Chemicals', term: 'Speciality Chemicals' },
          { key: 'waterproofing-chemicals-leaf', label: 'Waterproofing Chemicals', term: 'Waterproofing Chemical' },
          { key: 'water-treatment-chemicals', label: 'Water Treatment Chemicals', term: 'Water Treatment Chemical' },
          { key: 'adhesive-chemical', label: 'Adhesive Chemical', term: 'Adhesive Chemical' },
        ]
      },
      {
        key: 'industrial-dyes', label: 'Industrial Dyes', leaves: [
          { key: 'reactive-dyes', label: 'Reactive Dyes', term: 'Reactive Dye' },
          { key: 'acid-dyes', label: 'Acid Dyes', term: 'Acid Dye' },
          { key: 'direct-dyes', label: 'Direct Dyes', term: 'Direct Dye' },
          { key: 'solvent-dyes', label: 'Solvent Dyes', term: 'Solvent Dye' },
        ]
      },
      {
        key: 'resin', label: 'Resin', leaves: [
          { key: 'pvc-resin', label: 'PVC Resin', term: 'PVC Resin' },
          { key: 'ion-exchange-resin', label: 'Ion Exchange Resin', term: 'Ion Exchange Resin' },
          { key: 'polyester-resins', label: 'Polyester Resins', term: 'Polyester Resin' },
          { key: 'casting-resin', label: 'Casting Resin', term: 'Casting Resin' },
        ]
      },
      {
        key: 'chemical-fertilizers', label: 'Chemical Fertilizers', leaves: [
          { key: 'micronutrient-fertilizers', label: 'Micronutrient Fertilizers', term: 'Micronutrient Fertilizer' },
          { key: 'phosphate-fertilizers', label: 'Phosphate Fertilizers', term: 'Phosphate Fertilizer' },
          { key: 'chemical-fertilizers-leaf', label: 'Chemical Fertilizers', term: 'Chemical Fertilizer' },
          { key: 'sulfur-fertilizers', label: 'Sulfur Fertilizers', term: 'Sulfur Fertilizer' },
        ]
      },
    ]
  },
  {
    key: 'transportation-logistics',
    label: 'Transportation & Logistics',
    children: [
      { key: 'automotive-logistics', label: 'Automotive Logistics', leaves: [] },
      { key: 'pharmacy-dropshipper', label: 'Pharmacy Dropshipper', leaves: [] },
      { key: 'drop-shipping-services', label: 'Drop Shipping Services', leaves: [] },
      {
        key: 'transportation-services', label: 'Transportation Services', leaves: [
          { key: 'goods-transport-services', label: 'Goods Transport Services', term: 'Goods Transport Service' },
          { key: 'dangerous-goods-transportation', label: 'Dangerous Goods Transportation', term: 'Dangerous Goods Transportation' },
          { key: 'food-transportation-services', label: 'Food Transportation Services', term: 'Food Transportation Service' },
          { key: 'liquid-transportation-service', label: 'Liquid Transportation Service', term: 'Liquid Transportation Service' },
        ]
      },
      {
        key: 'domestic-relocation-service', label: 'Domestic Relocation Service', leaves: [
          { key: 'packers-movers', label: 'Packers Movers', term: 'Packers Movers' },
          { key: 'loading-unloading-services', label: 'Loading Unloading Services', term: 'Loading Unloading Service' },
          { key: 'local-shifting-service', label: 'Local Shifting Service', term: 'Local Shifting Service' },
          { key: 'household-relocation-service', label: 'Household Relocation Service', term: 'Household Relocation Service' },
        ]
      },
      {
        key: 'cargo-shipping', label: 'Cargo & Shipping', leaves: [
          { key: 'air-cargo-service', label: 'Air Cargo Service', term: 'Air Cargo Service' },
          { key: 'rail-cargo', label: 'Rail Cargo', term: 'Rail Cargo' },
          { key: 'sea-cargo-service', label: 'Sea Cargo Service', term: 'Sea Cargo Service' },
          { key: 'road-transportation-services', label: 'Road Transportation Services', term: 'Road Transportation Service' },
        ]
      },
      {
        key: 'truck-rentals', label: 'Truck Rentals', leaves: [
          { key: 'tipper-truck-rental-services', label: 'Tipper Truck Rental Services', term: 'Tipper Truck Rental Service' },
          { key: 'full-trucks-service', label: 'Full Trucks Service', term: 'Full Truck Service' },
          { key: 'lorry-transport-services', label: 'Lorry Transport Services', term: 'Lorry Transport Service' },
          { key: 'container-truck-service', label: 'Container Truck Service', term: 'Container Truck Service' },
        ]
      },
      {
        key: 'logistics-service', label: 'Logistics Service', leaves: [
          { key: 'third-party-logistics', label: 'Third Party Logistics', term: 'Third Party Logistics' },
          { key: 'cold-chain-logistics', label: 'Cold Chain Logistics', term: 'Cold Chain Logistics' },
          { key: 'local-logistics-services', label: 'Local Logistics Services', term: 'Local Logistics Service' },
          { key: 'contract-logistics-service', label: 'Contract Logistics Service', term: 'Contract Logistics Service' },
        ]
      },
      {
        key: 'other-services', label: 'Other Services', leaves: [
          { key: 'warehousing-services', label: 'Warehousing Services', term: 'Warehousing Service' },
          { key: 'home-delivery-service', label: 'Home Delivery Service', term: 'Home Delivery Service' },
          { key: 'courier-service', label: 'Courier Service', term: 'Courier Service' },
        ]
      },
    ]
  },
];

// ---- Helpers ----

export function flattenIndiaMartLeaves(nodes: IndiaMartCategoryNode[] = INDIAMART_CATEGORIES): IndiaMartLeaf[] {
  const out: IndiaMartLeaf[] = [];
  const visit = (n: IndiaMartCategoryNode) => {
    if (n.leaves) out.push(...n.leaves);
    if (n.children) n.children.forEach(visit);
  };
  nodes.forEach(visit);
  return out;
}

export function findIndiaMartLeaf(key: string): IndiaMartLeaf | undefined {
  return flattenIndiaMartLeaves().find(l => l.key === key);
}

export function getIndiaMartSearchTerms(leafOrGroupKey: string): string[] {
  const terms = new Set<string>();
  // 1. Direct leaf lookup
  const leaf = flattenIndiaMartLeaves().find(l => l.key === leafOrGroupKey);
  if (leaf) {
    terms.add(leaf.term);
    (leaf.aliases || []).forEach(a => terms.add(a));
  }
  // 2. Walk tree to find parent subgroup & top-level group for fallbacks OR to treat subgroup/group key itself.
  const walk = (nodes: IndiaMartCategoryNode[], parents: IndiaMartCategoryNode[]): boolean => {
    for (const n of nodes) {
      // If this node key itself matches (subgroup or top-level group clicked)
      if (n.key === leafOrGroupKey) {
        // Use subgroup/group label as a broad term
        terms.add(n.label);
        // Add up to first few leaf terms under it (acts like featured seeds)
        if (n.leaves) n.leaves.slice(0, 3).forEach(l => { terms.add(l.term); (l.aliases||[]).forEach(a => terms.add(a)); });
        if (n.children) {
          // sample first leaf of each child subgroup to diversify
            for (const child of n.children) {
              if (child.leaves && child.leaves.length) {
                const l0 = child.leaves[0];
                terms.add(l0.term); (l0.aliases||[]).forEach(a => terms.add(a));
              }
            }
        }
        // Also include top-level parent (if we are in a subgroup)
        if (parents.length) terms.add(parents[0].label);
        return true;
      }
      // Leaf case: capture subgroup + top-level fallback
      if (n.leaves?.some(l => l.key === leafOrGroupKey)) {
        const lf = n.leaves.find(l => l.key === leafOrGroupKey)!;
        terms.add(lf.term); (lf.aliases||[]).forEach(a => terms.add(a));
        terms.add(n.label); // subgroup fallback
        if (parents.length) terms.add(parents[0].label); // top-level fallback
        return true;
      }
      if (n.children && walk(n.children, parents.concat(n))) return true;
    }
    return false;
  };
  walk(INDIAMART_CATEGORIES, []);
  return Array.from(terms);
}
