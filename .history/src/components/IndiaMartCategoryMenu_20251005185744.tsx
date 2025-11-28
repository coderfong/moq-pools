"use client";
import React, { useState } from 'react';
import { INDIAMART_CATEGORIES, IndiaMartCategoryNode, IndiaMartLeaf, getIndiaMartSearchTerms } from '@/lib/indiamartCategories';
import { usePlatform } from '@/lib/platformContext';

interface Props {
  onSelect?: (leaf: { key: string; label: string; terms: string[] }) => void;
  className?: string;
}

export function IndiaMartCategoryMenu({ onSelect, className }: Props) {
  const { platform } = usePlatform();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

  if (platform !== 'INDIAMART') return null;

  const groups = INDIAMART_CATEGORIES;

  function toggleGroup(k: string) {
    setOpenGroup(g => g === k ? null : k);
    setOpenSub(null);
  }
  function toggleSub(k: string) {
    setOpenSub(s => s === k ? null : k);
  }
  function selectLeaf(leaf: IndiaMartLeaf) {
    const terms = getIndiaMartSearchTerms(leaf.key);
    onSelect?.({ key: leaf.key, label: leaf.label, terms });
  }

  const groupCls = 'border rounded-md mb-2';
  const headerCls = 'cursor-pointer px-3 py-2 flex items-center justify-between text-sm font-medium bg-gray-50 hover:bg-gray-100';
  const subHeaderCls = 'cursor-pointer px-3 py-1.5 flex items-center justify-between text-xs font-medium text-gray-700 hover:bg-gray-50';

  return (
    <div className={className || ''}>
      <div className="text-sm font-semibold mb-2">IndiaMART Categories</div>
      {groups.map(g => {
        const expanded = g.key === openGroup;
        return (
          <div key={g.key} className={groupCls}>
            <div className={headerCls} onClick={() => toggleGroup(g.key)}>
              <span>{g.label}</span>
              <span className="text-xs text-gray-500">{expanded ? '−' : '+'}</span>
            </div>
            {expanded && (
              <div className="px-2 py-2 space-y-1">
                {g.children?.map(sub => renderSub(sub))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  function renderSub(sub: IndiaMartCategoryNode) {
    const expanded = sub.key === openSub;
    const hasLeaves = (sub.leaves && sub.leaves.length > 0);
    return (
      <div key={sub.key}>
        <div className={subHeaderCls} onClick={() => hasLeaves ? toggleSub(sub.key) : undefined}>
          <span>{sub.label}</span>
          {hasLeaves && <span className="text-[10px] text-gray-500">{expanded ? '−' : '+'}</span>}
        </div>
        {expanded && hasLeaves && (
          <div className="pl-3 py-1 grid grid-cols-1 gap-1">
            {sub.leaves!.map(leaf => (
              <button
                type="button"
                key={leaf.key}
                onClick={() => selectLeaf(leaf)}
                className="text-left text-xs px-2 py-1 rounded border border-transparent hover:border-blue-300 hover:bg-blue-50"
              >{leaf.label}</button>
            ))}
          </div>
        )}
      </div>
    );
  }
}
