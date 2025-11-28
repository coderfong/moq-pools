// X-ray listing quality helpers: normalization, classification, exclusion, dedupe

export const ACCESSORY_TOKENS = [
  'film','cassette','apron','lead apron','leadapr','holder','trolley','stand','hanger','shield','protector','protection','cover','viewer','box','rack','marker','gloves','glove'
];

export const STOPWORDS = [
  'x','ray','xray','machine','system','equipment','unit','digital','high','frequency','portable','mobile','for','and','with','the','medical','model','new'
];

export const MODALITY_TOKENS = [
  'c-arm','carm','c arm','fluoroscopy','fluoroscope','mammography','mammogram','opg','panoramic','cephalometric','dr','cr','flat panel','fpd'
];

export const DENTAL_TOKENS = ['dental','opg','panoramic','cephalometric'];
export const VET_TOKENS = ['vet','veterinary','animal'];

// Core radiography tokens
export const CORE_TOKENS = ['x ray','x-ray','radiography','radiographic'];

const ACRONYMS = new Set(['dr','cr','fpd']);

export function sanitizeTitle(input?: string): string {
  if (!input) return 'Product';
  let t = input.replace(/\s+/g,' ').trim();
  // unify C-Arm variants
  t = t.replace(/c\s*[- ]\s*arm/gi,'C-Arm');
  // remove trailing punctuation / hyphen clusters
  t = t.replace(/[\s-–_:;,/]+$/,'');
  // de-duplicate immediate repeated words (case-insensitive)
  t = t.replace(/\b(\w+)(\s+\1\b)+/gi, (m,w) => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase());
  // token cleanup & acronym capitalization
  t = t.split(' ').map(tok => {
    const low = tok.toLowerCase();
    if (ACRONYMS.has(low)) return low.toUpperCase();
    if (low === 'x' || low === 'x-ray' || low === 'x-ray,') return 'X';
    if (low === 'ray') return 'Ray';
    return tok.length <= 3 ? tok : tok.charAt(0).toUpperCase()+tok.slice(1);
  }).join(' ');
  return t;
}

export interface ClassificationResult {
  groups: string[]; // e.g. ['xray','modality','dental']
  isAccessory: boolean;
  canonicalKey: string; // used for dedupe in-run
  informativeTokenCount: number;
}

export function classify(title: string, searchTerm?: string): ClassificationResult {
  const lower = title.toLowerCase();
  const tokens = Array.from(new Set(lower.replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(Boolean)));
  const isAccessory = ACCESSORY_TOKENS.some(tok => lower.includes(tok));
  const groups = new Set<string>();
  if (CORE_TOKENS.some(tok => lower.includes(tok.replace(/ /g,'')) || lower.includes(tok))) groups.add('xray');
  if (MODALITY_TOKENS.some(tok => lower.includes(tok))) groups.add('modality');
  if (DENTAL_TOKENS.some(tok => lower.includes(tok))) groups.add('dental');
  if (VET_TOKENS.some(tok => lower.includes(tok))) groups.add('vet');
  if (searchTerm) {
    const st = searchTerm.toLowerCase();
    if (st.includes('c arm') || st.includes('c-arm')) groups.add('modality');
    if (st.includes('dental')) groups.add('dental');
    if (st.includes('vet')) groups.add('vet');
    if (/x\s?ray|radiograph/.test(st)) groups.add('xray');
  }
  // informative tokens (remove stopwords)
  const informative = tokens.filter(tok => !STOPWORDS.includes(tok));
  const canonicalKey = informative.slice().sort().join(' ');
  return { groups: Array.from(groups), isAccessory, canonicalKey, informativeTokenCount: informative.length };
}

export interface QualityGateOptions {
  minInformative?: number; // default 2
  allowAccessories?: boolean;
  seen?: Set<string>; // canonical keys already seen
}

export function passesQuality(result: ClassificationResult, opts: QualityGateOptions): boolean {
  const { minInformative = 2, allowAccessories = false, seen } = opts;
  if (result.informativeTokenCount < minInformative) return false;
  if (!allowAccessories && result.isAccessory) return false;
  if (seen && seen.has(result.canonicalKey)) return false;
  return true;
}
