"use client";

import { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, Zap } from 'lucide-react';
import Link from 'next/link';

interface SearchSuggestion {
  type: 'product' | 'category' | 'supplier' | 'trending';
  text: string;
  url: string;
  metadata?: string;
}

interface SmartSearchProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export default function SmartSearch({ onSearch, className = '' }: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // In production, this would call your search API
        // For now, using mock data
        const mockSuggestions: SearchSuggestion[] = [
          {
            type: 'trending',
            text: `${query} keyboard`,
            url: `/products?q=${encodeURIComponent(query + ' keyboard')}`,
            metadata: 'Trending',
          },
          {
            type: 'product',
            text: `${query} mechanical switches`,
            url: `/products?q=${encodeURIComponent(query + ' mechanical switches')}`,
            metadata: '1,234 products',
          },
          {
            type: 'category',
            text: `${query} in Electronics`,
            url: `/categories/electronics?q=${encodeURIComponent(query)}`,
            metadata: 'Category',
          },
          {
            type: 'supplier',
            text: `Suppliers with "${query}"`,
            url: `/suppliers?q=${encodeURIComponent(query)}`,
            metadata: '45 suppliers',
          },
        ];

        setTimeout(() => {
          setSuggestions(mockSuggestions);
          setLoading(false);
        }, 200);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-orange-600" />;
      case 'product':
        return <Search className="w-4 h-4 text-blue-600" />;
      case 'category':
        return <Zap className="w-4 h-4 text-purple-600" />;
      case 'supplier':
        return <Clock className="w-4 h-4 text-green-600" />;
      default:
        return <Search className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search products, suppliers, categories..."
            className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && (query.length >= 2 || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-600">
              <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <Link
                    href={suggestion.url}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => setQuery(suggestion.text)}
                  >
                    <div className="flex-shrink-0">{getIcon(suggestion.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.text}
                      </div>
                    </div>
                    {suggestion.metadata && (
                      <div className="flex-shrink-0 text-xs text-gray-500">
                        {suggestion.metadata}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-600 text-sm">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
