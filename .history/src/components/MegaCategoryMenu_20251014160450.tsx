'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SharedCategoryNode, SharedLeaf } from '@/lib/sharedTaxonomy';
import { SHARED_CATEGORIES, getSharedSearchTerms } from '@/lib/sharedTaxonomy';
import { ICONS } from '@/lib/categories';
import { Package } from 'lucide-react';

type Props = {
  onSelect: (leaf: SharedLeaf) => void;
  categories?: SharedCategoryNode[];
};

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

export default function MegaCategoryMenu({ onSelect, categories = SHARED_CATEGORIES }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const tops = categories;
  const active = tops[activeIdx] ?? tops[0];

  const handleKey = (e: React.KeyboardEvent) => {
    const max = tops.length - 1;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      setActiveIdx((prev) => {
        if (e.key === "ArrowDown") return prev === max ? 0 : prev + 1;
        if (e.key === "ArrowUp") return prev === 0 ? max : prev - 1;
        if (e.key === "Home") return 0;
        if (e.key === "End") return max;
        return prev;
      });
    }
  };

  return (
    <div className="flex gap-3 p-3">
      {/* Left rail */}
      <nav className="w-64 shrink-0 border-r border-gray-100 pr-2" aria-label="Categories">
        <ul className="flex flex-col gap-1 focus:outline-none" tabIndex={0} onKeyDown={handleKey}>
          {tops.map((node, idx) => {
            const Icon = getIconForTopKey(node.key);
            const selected = idx === activeIdx;
            return (
              <li key={node.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onFocus={() => setActiveIdx(idx)}
                  onClick={() => setActiveIdx(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                    selected ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border bg-white ${
                    selected ? 'border-orange-200' : 'border-gray-200'
                  }`}>
                    <Icon className={`w-4 h-4 ${selected ? 'text-orange-600' : 'text-gray-600'}`} />
                  </span>
                  <span className="text-sm font-medium truncate">{node.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Right content */}
      <div className="min-w-[520px] grow pl-1">
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {active.children && active.children.map((sub) => (
                  <div key={sub.key} className="min-w-0 pb-4 mb-2 border-b border-gray-100 last:border-b-0 last:pb-0 last:mb-0">
                    <SubHeader nodeKey={sub.key} label={sub.label} onSelect={onSelect} />

                    {/* Direct leaves */}
                    {sub.leaves && sub.leaves.length > 0 && (
                      <ul className="flex flex-col items-start gap-1 mb-3">
                        {sub.leaves.map((lf) => (
                          <li key={lf.key}><LeafPill leaf={lf} onSelect={onSelect} /></li>
                        ))}
                      </ul>
                    )}

                    {/* Sub-sub groups */}
                    {sub.children && sub.children.length > 0 && (
                      <div className="space-y-4">
                        {sub.children.map((subsub) => (
                          <div key={subsub.key} className="min-w-0">
                            <SubSubHeader nodeKey={subsub.key} label={subsub.label} onSelect={onSelect} />
                            {subsub.leaves && subsub.leaves.length > 0 && (
                              <ul className="flex flex-col items-start gap-1 mt-1">
                                {subsub.leaves.map((lf) => (
                                  <li key={lf.key}><LeafPill leaf={lf} onSelect={onSelect} /></li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SubHeader({ nodeKey, label, onSelect }: { nodeKey: string; label: string; onSelect: (leaf: SharedLeaf) => void }) {
  return (
    <button
      type="button"
      className="group flex items-center gap-1.5 text-sm font-semibold mb-2 text-gray-800 hover:text-orange-700 focus:text-orange-700 focus:outline-none"
      onClick={() => {
        const terms = getSharedSearchTerms(nodeKey);
        onSelect({ key: nodeKey, label, terms: terms.length ? terms : [label] });
      }}
    >
      <span>{label}</span>
      <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  );
}

function SubSubHeader({ nodeKey, label, onSelect }: { nodeKey: string; label: string; onSelect: (leaf: SharedLeaf) => void }) {
  return (
    <button
      type="button"
      className="group inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-orange-700 focus:text-orange-700 focus:outline-none"
      onClick={() => {
        const terms = getSharedSearchTerms(nodeKey);
        onSelect({ key: nodeKey, label, terms: terms.length ? terms : [label] });
      }}
    >
      <span>{label}</span>
      <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  );
}

function LeafPill({ leaf, onSelect }: { leaf: SharedLeaf; onSelect: (leaf: SharedLeaf) => void }) {
  const terms = useMemo(() => getSharedSearchTerms(leaf.key), [leaf.key]);
  const title = (terms.length ? terms[0] : leaf.label);
  return (
    <button
      type="button"
      onClick={() => onSelect({ ...leaf, terms: terms.length ? terms : [leaf.label] })}
      className="px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50 focus:border-orange-400 focus:text-orange-700 focus:bg-orange-50 transition-colors"
      title={title}
    >
      {leaf.label}
    </button>
  );
}
