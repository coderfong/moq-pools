import fs from 'node:fs/promises';

type Platform = 'ALIBABA' | 'MADE_IN_CHINA' | 'INDIAMART';
type Job = { platform: Platform; q: string; limit: number; headless?: boolean; categories?: string[]; terms?: string[] };

// Flattened sub-sub categories provided by user for Computers & related
const TERMS: string[] = [
  // Computers & Tablets
  'Laptops',
  'Gaming Laptops',
  'Desktops',
  'Mini PCs',
  'All-in-Ones',
  'Tablet PCs',
  '2-in-1s',
  'e-Readers',
  'Portable Workstations',
  // PC Peripherals
  'Keyboards',
  'Mechanical Keyboards',
  'Membrane Keyboards',
  'Gaming Keyboards',
  'Mice',
  'Gaming Mice',
  'Mousepads',
  'Wrist Rests',
  'Keycaps',
  'Keyboard and Mouse Combos',
  'Webcams 1080p',
  'Webcams 4K',
  'USB Microphones',
  'Wired Headsets',
  'Wireless Headsets',
  'Desktop Speakers',
  // PC Parts (small/parcelable)
  'SSD',
  'HDD',
  'RAM',
  'NVMe Enclosures',
  'Capture Cards',
  'Case Fans',
  'Thermal Paste',
  'SATA Cables',
  'PSU Cables',
  'Dust Filters',
  // Accessories & Cables
  'USB-C Cables',
  'USB-A Cables',
  'USB-C to USB-A Cables',
  'HDMI Cables',
  'DisplayPort Cables',
  'HDMI to DP Cables',
  'USB-C Hubs',
  'USB Hubs',
  'Docking Stations',
  'Thunderbolt Docks',
  'Laptop Chargers',
  'GaN Chargers',
  'Power Banks',
  'Laptop Stands',
  'Screen Protectors for Laptops',
  'Cleaning Kits for Electronics',
  'Cable Management Accessories',
  // Monitors & Displays
  'Gaming Monitors 144Hz',
  'Gaming Monitors 240Hz',
  '4K Monitors',
  'Portable Monitors',
  'Color Accurate Monitors',
  // Networking
  'Wi-Fi Routers',
  'Mesh Wi-Fi Systems',
  'Wi-Fi Range Extenders',
  'Network Switches',
  'PoE Switches',
  'NAS Enclosures',
  'Ethernet Cables',
  'SFP Modules',
  // Smart Home
  'Smart Plugs',
  'Smart Bulbs',
  'Smart Switches',
  'Smart Home Hubs',
  'Motion Sensors',
  'Contact Sensors',
  'Temperature Sensors',
  'Video Doorbells',
  'Smart Thermostats',
  // Audio & Video
  'True Wireless Earbuds',
  'Over-Ear Headphones',
  'Headphone DAC Amp',
  'Soundbars',
  'Portable Bluetooth Speakers',
  'Media Streamers',
  'Bluetooth Transmitters',
  // Wearables & XR
  'Smartwatches',
  'Fitness Bands',
  'VR Headsets',
  'AR Headsets',
  'Watch Replacement Straps',
  // Gaming Consoles & Accessories
  'Game Controllers',
  'Controller Charging Docks',
  'Gaming Headsets',
  'Racing Wheels',
  'Flight Sticks',
  'Console Storage Expansion',
  'Console Skins'
];

function parseListEnv(name: string): string[] | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function parseIntEnv(name: string, def: number): number {
  const v = Number(process.env[name] || '');
  return Number.isFinite(v) && v > 0 ? v : def;
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.map(s => s.trim()).filter(Boolean)));
}

function buildVariants(term: string, modifiers?: string[]): string[] {
  const t = term.trim();
  const defaultMods = [
    '',
    'wholesale',
    'bulk',
    'supplier',
    'factory',
    'manufacturer',
    'oem',
    'odm',
    'custom',
    'custom logo',
    'private label',
    'ready to ship',
    'dropshipping',
    'in stock',
    'low moq',
    'free sample',
    'fast delivery',
    'cheap',
    'best',
    '2024',
    '2025',
  ];
  const mods = (modifiers && modifiers.length ? modifiers : defaultMods).map((m) => m.trim());
  const out: string[] = [];
  for (const m of mods) out.push(m ? `${t} ${m}` : t);
  return dedupe(out);
}

function buildJobs(terms: string[], perTermLimit = 160, modifiers?: string[], termsCap = 0, jobsCap = 0): Job[] {
  const qList = dedupe(terms);
  const jobs: Job[] = [];
  let emitted = 0;
  for (let i = 0; i < qList.length; i++) {
    if (termsCap > 0 && i >= termsCap) break;
    const base = qList[i];
    const variants = buildVariants(base, modifiers);
    for (const q of variants) {
      const limit = Math.max(100, perTermLimit);
      jobs.push({ platform: 'ALIBABA', q, limit, headless: true, categories: ['computers'], terms: [base] });
      jobs.push({ platform: 'MADE_IN_CHINA', q, limit, headless: false, categories: ['computers'], terms: [base] });
      jobs.push({ platform: 'INDIAMART', q, limit, headless: false, categories: ['computers'], terms: [base] });
      emitted += 3;
      if (jobsCap > 0 && emitted >= jobsCap) break;
    }
    if (jobsCap > 0 && emitted >= jobsCap) break;
  }
  return jobs;
}

async function main() {
  const limit = Number(process.env.COMPUTERS_LIMIT || '160');
  const modifiers = parseListEnv('COMPUTERS_MODIFIERS');
  const termsCap = parseIntEnv('COMPUTERS_TERMS_CAP', 0);
  const jobsCap = parseIntEnv('COMPUTERS_JOBS_CAP', 0);
  const outPath = 'scripts/catalogue.computers.generated.json';
  const jobs = buildJobs(TERMS, limit, modifiers, termsCap, jobsCap);
  await fs.writeFile(outPath, JSON.stringify({ jobs }, null, 2));
  console.log(`Generated ${jobs.length} jobs across ALIBABA, MIC, INDIAMART at ${outPath} (limit=${limit}, termsCap=${termsCap || 'none'}, jobsCap=${jobsCap || 'none'})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
