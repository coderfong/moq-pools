"use client";

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, X } from 'lucide-react';

export interface FilterState {
  priceRange: [number, number];
  moqRange: [number, number];
  platforms: string[];
  categories: string[];
  suppliers: string[];
  inStock: boolean;
  freeShipping: boolean;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  className?: string;
}

const PLATFORMS = [
  { id: 'ALIBABA', label: 'Alibaba' },
  { id: 'MADE_IN_CHINA', label: 'Made-in-China' },
  { id: 'INDIAMART', label: 'IndiaMART' },
  { id: '1688', label: '1688.com' },
];

const CATEGORIES = [
  { id: 'electronics', label: 'Electronics' },
  { id: 'fashion', label: 'Fashion & Apparel' },
  { id: 'home', label: 'Home & Garden' },
  { id: 'industrial', label: 'Industrial Equipment' },
  { id: 'toys', label: 'Toys & Games' },
  { id: 'sports', label: 'Sports & Outdoors' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'beauty', label: 'Beauty & Personal Care' },
];

export default function AdvancedFilters({
  filters,
  onChange,
  onReset,
  className = '',
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const togglePlatform = (platform: string) => {
    const platforms = filters.platforms.includes(platform)
      ? filters.platforms.filter((p) => p !== platform)
      : [...filters.platforms, platform];
    updateFilter('platforms', platforms);
  };

  const toggleCategory = (category: string) => {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    updateFilter('categories', categories);
  };

  const activeFiltersCount = 
    (filters.platforms.length > 0 ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.freeShipping ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 ? 1 : 0) +
    (filters.moqRange[0] > 1 || filters.moqRange[1] < 10000 ? 1 : 0);

  return (
    <div className={className}>
      {/* Filter toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="w-full sm:w-auto flex items-center gap-2"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {activeFiltersCount > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-orange-600 text-white rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      {/* Filters panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 z-50 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onReset}>
                Reset All
              </Button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">
                Price Range (${filters.priceRange[0]} - ${filters.priceRange[1]})
              </Label>
              <Slider
                min={0}
                max={10000}
                step={50}
                value={filters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
                className="w-full"
              />
            </div>

            {/* MOQ Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">
                MOQ Range ({filters.moqRange[0]} - {filters.moqRange[1]} units)
              </Label>
              <Slider
                min={1}
                max={10000}
                step={10}
                value={filters.moqRange}
                onValueChange={(value) => updateFilter('moqRange', value as [number, number])}
                className="w-full"
              />
            </div>

            {/* Platforms */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Platforms</Label>
              <div className="space-y-2">
                {PLATFORMS.map((platform) => (
                  <div key={platform.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={filters.platforms.includes(platform.id)}
                      onCheckedChange={() => togglePlatform(platform.id)}
                    />
                    <Label
                      htmlFor={`platform-${platform.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {platform.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3 md:col-span-2">
              <Label className="text-sm font-semibold text-gray-900">Categories</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((category) => (
                  <div key={category.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={filters.categories.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <Label
                      htmlFor={`category-${category.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick filters */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Quick Filters</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="in-stock"
                    checked={filters.inStock}
                    onCheckedChange={(checked) => updateFilter('inStock', checked)}
                  />
                  <Label htmlFor="in-stock" className="text-sm font-normal cursor-pointer">
                    In Stock Only
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="free-shipping"
                    checked={filters.freeShipping}
                    onCheckedChange={(checked) => updateFilter('freeShipping', checked)}
                  />
                  <Label htmlFor="free-shipping" className="text-sm font-normal cursor-pointer">
                    Free Shipping
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Apply button */}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsOpen(false)} className="bg-orange-600 hover:bg-orange-700">
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
