"use client";
import React, { useState } from 'react';
import { SHARED_CATEGORIES, SharedCategoryNode, SharedLeaf, getSharedSearchTerms } from '@/lib/sharedTaxonomy';

interface Props {
  onSelect?: (leaf: { key: string; label: string; terms: string[] }) => void;
  className?: string;
}

export function SharedCategoryMenu({ onSelect, className }: Props) {
  const [openTop, setOpenTop] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

  function toggleTop(k: string) {
    setOpenTop(g => g === k ? null : k);
    setOpenSub(null);
  }
  function toggleSub(k: string) {
    setOpenSub(s => s === k ? null : k);
  }
  function selectLeaf(leaf: SharedLeaf) {
    const terms = getSharedSearchTerms(leaf.key);
    onSelect?.({ key: leaf.key, label: leaf.label, terms });
  }
  function selectNodeAsLeaf(node: SharedCategoryNode) {
    const terms = getSharedSearchTerms(node.key);
    onSelect?.({ key: node.key, label: node.label, terms });
  }

  const top = SHARED_CATEGORIES;

  return (
    <div className={className || ''}>
      <div className="text-sm font-semibold mb-2">Browse Categories</div>
      {top.map(t => {
        const expanded = t.key === openTop;
        return (
          <div key={t.key} className="border rounded-md mb-2">
            <div className="cursor-pointer px-3 py-2 flex items-center justify-between text-sm font-medium bg-gray-50 hover:bg-gray-100" onClick={() => toggleTop(t.key)}>
              <span>{t.label}</span>
              <span className="text-xs text-gray-500">{expanded ? '−' : '+'}</span>
            </div>
            {expanded && (
              <div className="px-2 py-2 space-y-1">
                {(t.children || []).map(sub => renderSub(sub))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  function renderSub(sub: SharedCategoryNode) {
    const hasLeaves = !!(sub.leaves && sub.leaves.length);
    const hasChildren = !!(sub.children && sub.children.length);
    const expanded = sub.key === openSub;
    const clickable = !hasLeaves && !hasChildren; // treat as search node
    return (
      <div key={sub.key}>
        <div
          className={"cursor-pointer px-3 py-1.5 flex items-center justify-between text-xs font-medium text-gray-700 " + (hasLeaves || hasChildren ? 'hover:bg-gray-50' : 'hover:text-blue-600')}
          onClick={() => clickable ? selectNodeAsLeaf(sub) : toggleSub(sub.key)}
          tabIndex={0}
          aria-label={sub.label + (hasLeaves || hasChildren ? ' (expand)' : '')}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && clickable) { e.preventDefault(); selectNodeAsLeaf(sub); }
            else if ((e.key === 'Enter' || e.key === ' ') && (hasLeaves || hasChildren)) { e.preventDefault(); toggleSub(sub.key); }
          }}
        >
          <span>{sub.label}</span>
          {(hasLeaves || hasChildren) && <span className="text-[10px] text-gray-500">{expanded ? '−' : '+'}</span>}
        </div>
        {expanded && hasLeaves && (
          <div className="pl-3 py-1 grid grid-cols-1 gap-1">
            {sub.leaves!.map(leaf => (
              <button type="button" key={leaf.key} onClick={() => selectLeaf(leaf)} className="text-left text-xs px-2 py-1 rounded border border-transparent hover:border-blue-300 hover:bg-blue-50">
                {leaf.label}
              </button>
            ))}
          </div>
        )}
        {expanded && sub.children && (
          <div className="pl-3 py-1 space-y-1">
            {sub.children.map(c => renderSub(c))}
          </div>
        )}
      </div>
    );
  }
}

export default SharedCategoryMenu;
