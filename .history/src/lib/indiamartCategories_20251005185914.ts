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
  // TODO: Add remaining groups: pharmaceutical-drug-medicine, hospital-medical-equipment,
  // industrial-plants-machinery, industrial-engineering-products, food-agriculture-farming,
  // apparel-clothing-garments, packaging-material-supplies-machines, chemicals-dyes-solvents,
  // transportation-logistics, covid-prevention-care.
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

export function getIndiaMartSearchTerms(leafKey: string): string[] {
  const stack: string[] = [];
  const walk = (nodes: IndiaMartCategoryNode[], parents: IndiaMartCategoryNode[]) => {
    for (const n of nodes) {
      if (n.leaves?.some(l => l.key === leafKey)) {
        const leaf = n.leaves.find(l => l.key === leafKey)!;
        stack.push(leaf.term);
        if (leaf.aliases) stack.push(...leaf.aliases);
        // parent subgroup fallback
        stack.push(n.label);
        // top-level fallback
        if (parents.length) stack.push(parents[0].label);
        return true;
      }
      if (n.children && walk(n.children, parents.concat(n))) return true;
    }
    return false;
  };
  walk(INDIAMART_CATEGORIES, []);
  return Array.from(new Set(stack));
}
