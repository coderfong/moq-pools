'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Search, TrendingUp, Clock } from 'lucide-react';

interface Suggestion {
  text: string;
  type: 'recent' | 'popular' | 'category';
}

const popularSearches = [
  'Phone Cases', 'T-Shirts', 'Water Bottles', 'Laptop Bags', 'Tote Bags',
  'Mugs', 'Notebooks', 'Pens', 'USB Drives', 'Keychains',
  'Hoodies', 'Hats', 'Socks', 'Sunglasses', 'Watches',
];

export default function SearchBar({ placeholder = 'Search products…' }: { placeholder?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = getRecentSearches();
    generateSuggestions(q, recent);
  }, [q]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function getRecentSearches(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('recentSearches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveRecentSearch(search: string) {
    if (typeof window === 'undefined' || !search.trim()) return;
    try {
      const recent = getRecentSearches();
      const updated = [search, ...recent.filter(s => s !== search)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch {}
  }

  function generateSuggestions(query: string, recent: string[]) {
    const suggestions: Suggestion[] = [];
    const trimmedQuery = query.trim().toLowerCase();

    // Show recent searches when input is empty or very short
    if (trimmedQuery.length < 2) {
      suggestions.push(...recent.slice(0, 5).map(text => ({ text, type: 'recent' as const })));
      suggestions.push(...popularSearches.slice(0, 5).map(text => ({ text, type: 'popular' as const })));
    } else {
      // Filter popular searches that match the query
      const matching = popularSearches
        .filter(item => item.toLowerCase().includes(trimmedQuery))
        .slice(0, 6);
      suggestions.push(...matching.map(text => ({ text, type: 'popular' as const })));

      // Add recent searches that match
      const matchingRecent = recent
        .filter(item => item.toLowerCase().includes(trimmedQuery))
        .slice(0, 3);
      suggestions.push(...matchingRecent.map(text => ({ text, type: 'recent' as const })));
    }

    setSuggestions(suggestions);
  }

  const submit = (e?: React.FormEvent, suggestionText?: string) => {
    e?.preventDefault();
    const searchText = suggestionText || q;
    if (!searchText.trim()) return;

    saveRecentSearch(searchText);
    setShowSuggestions(false);

    const sp = new URLSearchParams(params.toString());
    if (searchText) sp.set('q', searchText); else sp.delete('q');
    // Reset infinite scroll on new search
    sp.delete('extLimit');
    router.push(`${pathname}?${sp.toString()}`);
  };

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      submit(undefined, suggestions[highlightedIndex].text);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-3" ref={wrapperRef}>
      <div className="flex-1 relative">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          placeholder={placeholder}
          autoComplete="off"
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  type="button"
                  onClick={() => submit(undefined, suggestion.text)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-orange-50 transition-colors ${
                    highlightedIndex === index ? 'bg-orange-50' : ''
                  }`}
                >
                  {suggestion.type === 'recent' && (
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  {suggestion.type === 'popular' && (
                    <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 flex-1">{suggestion.text}</span>
                  {suggestion.type === 'popular' && (
                    <span className="text-xs text-gray-400">Popular</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button 
        type="submit"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300"
      >
        Search
      </button>
    </form>
  );
}
