'use client';

import React, { useMemo, useState } from 'react';
import type { SharedCategoryNode, SharedLeaf } from '@/lib/sharedTaxonomy';
import { SHARED_CATEGORIES, getSharedSearchTerms } from '@/lib/sharedTaxonomy';
import { ICONS } from '@/lib/categories';
import { Package } from 'lucide-react';

type Props = {
  // Called when a leaf is selected
  onSelect: (leaf: SharedLeaf) => void;
  // Optional: override categories (defaults to SHARED_CATEGORIES)
  categories?: SharedCategoryNode[];
};

// Map shared top-level keys to legacy icon keys in ICONS
const ICON_KEY_ALIASES: Record<string, string> = {
  'sports-outdoors': 'sports-entertainment',
  'safety-security-surveillance': 'safety-security',
  'beauty-personal-care-tattoo': 'beauty',
  'jewelry-eyewear-contact-lenses': 'jewelry-eyewear-watches',
  'shoes': 'shoes-accessories',
  'bags-travel': 'luggage-bags-cases',
  'household-cleaning': 'personal-home-care',
  'automotive': 'automotive-supplies',
  'electrical-tools-test': 'tools-hardware',
  'lighting': 'lights-lighting',
  'home-appliances': 'home-appliances',
  'pet-supplies': 'pet-supplies',
  'gifts-crafts': 'gifts-crafts',
  'fabrics-materials-diy': 'raw-materials',
  'school-office': 'school-office',
  'furniture': 'furniture',
  'home-garden': 'home-garden',
  'parents-kids-toys': 'parents-kids-toys',
  'packaging-printing': 'packaging-printing',
  'consumer-electronics': 'consumer-electronics',
};

function getIconForTopKey(key: string) {
  const legacyKey = ICON_KEY_ALIASES[key] || key;
  return ICONS[legacyKey] || Package;
}

export default function IconCategoryMenu({ onSelect, categories = SHARED_CATEGORIES }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  const tops = categories;
  const active = tops[activeIdx] ?? tops[0];

  return (
    <div className="flex gap-3">
      {/* Left rail with icons */}
      <div className="w-64 shrink-0 border-r border-gray-100 pr-2">
        <ul className="flex flex-col gap-1">
          {tops.map((node, idx) => {
            const Icon = getIconForTopKey(node.key);
            const isActive = idx === activeIdx;
            return (
              <li key={node.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onFocus={() => setActiveIdx(idx)}
                  onClick={() => setActiveIdx(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                    isActive ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${
                    isActive ? 'border-orange-200 bg-white' : 'border-gray-200 bg-white'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-gray-600'}`} />
                  </span>
                  <span className="text-sm font-medium truncate">{node.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right content panel for subcategories */}
      <div className="min-w-[460px] grow pl-1">
        <CategoryPanel node={active} onSelect={onSelect} />
      </div>
    </div>
  );
}

function CategoryPanel({ node, onSelect }: { node: SharedCategoryNode; onSelect: (leaf: SharedLeaf) => void }) {
  // Some nodes have direct leaves; others have children groups; some have nested children inside those groups.
  return (
    <div className="space-y-6">
      {node.leaves && node.leaves.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Popular in {node.label}</h4>
          <div className="flex flex-wrap gap-2">
            {node.leaves.map((leaf) => (
              <LeafPill key={leaf.key} leaf={leaf} onSelect={onSelect} />)
            )}
          </div>
        </div>
      )}

      {node.children && node.children.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {node.children.map((sub) => (
            <div key={sub.key} className="min-w-0">
              <h5 className="text-sm font-semibold mb-2 text-gray-800">{sub.label}</h5>
              {/* If sub has further children, render them as titled groups; otherwise render leaves */}
              {sub.children && sub.children.length > 0 ? (
                <div className="space-y-3">
                  {sub.children.map((subsub) => (
                    <div key={subsub.key}>
                      <div className="text-xs font-medium text-gray-600 mb-1">{subsub.label}</div>
                      <ul className="flex flex-wrap gap-2">
                        {(subsub.leaves || []).map((lf) => (
                          <li key={lf.key}><LeafPill leaf={lf} onSelect={onSelect} /></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {(sub.leaves || []).map((lf) => (
                    <li key={lf.key}><LeafPill leaf={lf} onSelect={onSelect} /></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeafPill({ leaf, onSelect }: { leaf: SharedLeaf; onSelect: (leaf: SharedLeaf) => void }) {
  const terms = useMemo(() => getSharedSearchTerms(leaf.key), [leaf.key]);
  const title = (terms.length ? terms[0] : leaf.label);
  return (
    <button
      type="button"
      onClick={() => onSelect({ ...leaf, terms: terms.length ? terms : [leaf.label] })}
      className="px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50 transition-colors"
      title={title}
    >
      {leaf.label}
    </button>
  );
}
