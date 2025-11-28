// Shipping cost calculator for MOQ Pools
// Based on weight, dimensions, and distance

export interface ShippingDimensions {
  length: number; // inches
  width: number;  // inches  
  height: number; // inches
  weight: number; // pounds
}

export interface ShippingZone {
  name: string;
  multiplier: number;
  maxWeight?: number; // Some zones have weight limits
}

// Shipping zones with cost multipliers
export const SHIPPING_ZONES: Record<string, ShippingZone> = {
  LOCAL: { name: 'Local (0-50 miles)', multiplier: 1.0 },
  REGIONAL: { name: 'Regional (51-300 miles)', multiplier: 1.5 },
  NATIONAL: { name: 'National (301-1500 miles)', multiplier: 2.0 },
  CROSS_COUNTRY: { name: 'Cross Country (1500+ miles)', multiplier: 3.0, maxWeight: 150 },
  INTERNATIONAL: { name: 'International', multiplier: 5.0, maxWeight: 70 }
};

// Item size categories with base rates
export const SIZE_CATEGORIES = {
  SMALL: {
    name: 'Small Package',
    maxWeight: 5,
    maxDimSum: 36, // L+W+H
    baseRate: 8.99,
    description: 'Electronics, accessories, small parts'
  },
  MEDIUM: {
    name: 'Medium Package', 
    maxWeight: 20,
    maxDimSum: 84,
    baseRate: 15.99,
    description: 'Pool chemicals, small equipment'
  },
  LARGE: {
    name: 'Large Package',
    maxWeight: 70,
    maxDimSum: 165,
    baseRate: 35.99,
    description: 'Pool pumps, filters, medium equipment'
  },
  OVERSIZED: {
    name: 'Oversized/Freight',
    maxWeight: 500,
    maxDimSum: 999,
    baseRate: 149.99,
    description: 'Large pool equipment, heavy machinery'
  },
  FREIGHT_ONLY: {
    name: 'Freight Only',
    maxWeight: 999999,
    maxDimSum: 999999,
    baseRate: 299.99,
    description: 'Vehicles, very large equipment - requires freight'
  }
};

// Items that should be excluded entirely
export const EXCLUDED_KEYWORDS = [
  // Vehicles
  'car', 'truck', 'vehicle', 'motorcycle', 'atv', 'boat', 'yacht',
  'trailer', 'rv', 'camper', 'bus', 'van',
  
  // Heavy machinery
  'excavator', 'bulldozer', 'crane', 'forklift', 'tractor',
  'combine', 'harvester', 'compactor', 'loader',
  
  // Large furniture
  'sofa', 'couch', 'bed', 'mattress', 'wardrobe', 'cabinet',
  'dining table', 'desk', 'bookshelf',
  
  // Large appliances  
  'washing machine', 'dryer', 'refrigerator', 'freezer',
  'dishwasher', 'oven', 'stove'
];

export function calculateDimensionalWeight(dimensions: ShippingDimensions): number {
  // Dimensional weight formula: (L × W × H) / 139 (for domestic)
  return (dimensions.length * dimensions.width * dimensions.height) / 139;
}

export function getBillableWeight(dimensions: ShippingDimensions): number {
  const actualWeight = dimensions.weight;
  const dimWeight = calculateDimensionalWeight(dimensions);
  return Math.max(actualWeight, dimWeight);
}

export function categorizeItem(dimensions: ShippingDimensions): keyof typeof SIZE_CATEGORIES {
  const { weight } = dimensions;
  const dimSum = dimensions.length + dimensions.width + dimensions.height;
  
  if (weight <= SIZE_CATEGORIES.SMALL.maxWeight && dimSum <= SIZE_CATEGORIES.SMALL.maxDimSum) {
    return 'SMALL';
  }
  if (weight <= SIZE_CATEGORIES.MEDIUM.maxWeight && dimSum <= SIZE_CATEGORIES.MEDIUM.maxDimSum) {
    return 'MEDIUM';
  }
  if (weight <= SIZE_CATEGORIES.LARGE.maxWeight && dimSum <= SIZE_CATEGORIES.LARGE.maxDimSum) {
    return 'LARGE';
  }
  if (weight <= SIZE_CATEGORIES.OVERSIZED.maxWeight) {
    return 'OVERSIZED';
  }
  return 'FREIGHT_ONLY';
}

export function shouldExcludeItem(title: string, description: string = ''): boolean {
  const text = (title + ' ' + description).toLowerCase();
  return EXCLUDED_KEYWORDS.some(keyword => text.includes(keyword));
}

export function calculateShipping(
  dimensions: ShippingDimensions,
  zone: keyof typeof SHIPPING_ZONES = 'NATIONAL',
  markup: number = 1.5 // 50% markup for profit/handling
): {
  category: string;
  baseRate: number;
  zoneMultiplier: number;
  billableWeight: number;
  weightSurcharge: number;
  totalCost: number;
  recommendedPrice: number;
  canShip: boolean;
  reason?: string;
} {
  const shippingZone = SHIPPING_ZONES[zone];
  const itemCategory = categorizeItem(dimensions);
  const sizeCategory = SIZE_CATEGORIES[itemCategory];
  
  // Check if item can be shipped
  if (itemCategory === 'FREIGHT_ONLY') {
    return {
      category: sizeCategory.name,
      baseRate: 0,
      zoneMultiplier: 0,
      billableWeight: 0,
      weightSurcharge: 0,
      totalCost: 0,
      recommendedPrice: 0,
      canShip: false,
      reason: 'Item too large - freight only or local pickup'
    };
  }
  
  // Check zone weight limits
  if (shippingZone.maxWeight && dimensions.weight > shippingZone.maxWeight) {
    return {
      category: sizeCategory.name,
      baseRate: 0,
      zoneMultiplier: 0,
      billableWeight: 0,
      weightSurcharge: 0,
      totalCost: 0,
      recommendedPrice: 0,
      canShip: false,
      reason: `Exceeds ${shippingZone.name} weight limit of ${shippingZone.maxWeight}lbs`
    };
  }
  
  const billableWeight = getBillableWeight(dimensions);
  const baseRate = sizeCategory.baseRate;
  
  // Weight surcharge for heavy items
  let weightSurcharge = 0;
  if (billableWeight > 20) {
    weightSurcharge = (billableWeight - 20) * 2.50; // $2.50 per lb over 20lbs
  }
  
  const subtotal = (baseRate + weightSurcharge) * shippingZone.multiplier;
  const totalCost = Math.round(subtotal * 100) / 100;
  const recommendedPrice = Math.round(totalCost * markup * 100) / 100;
  
  return {
    category: sizeCategory.name,
    baseRate,
    zoneMultiplier: shippingZone.multiplier,
    billableWeight,
    weightSurcharge,
    totalCost,
    recommendedPrice,
    canShip: true
  };
}

// Estimate dimensions from product info
export function estimateDimensions(
  title: string,
  description: string = '',
  category: string = ''
): ShippingDimensions {
  const text = (title + ' ' + description + ' ' + category).toLowerCase();
  
  // Pool pumps
  if (text.includes('pump') && text.includes('pool')) {
    return { length: 24, width: 18, height: 16, weight: 45 };
  }
  
  // Pool filters
  if (text.includes('filter') && text.includes('pool')) {
    return { length: 20, width: 20, height: 24, weight: 35 };
  }
  
  // Pool chemicals
  if (text.includes('chemical') || text.includes('chlorine') || text.includes('acid')) {
    return { length: 12, width: 8, height: 10, weight: 15 };
  }
  
  // Electronics/accessories
  if (text.includes('electronic') || text.includes('controller') || text.includes('sensor')) {
    return { length: 8, width: 6, height: 4, weight: 3 };
  }
  
  // Small parts/accessories
  if (text.includes('parts') || text.includes('valve') || text.includes('fitting')) {
    return { length: 6, width: 4, height: 4, weight: 2 };
  }
  
  // Large equipment (cleaners, heaters)
  if (text.includes('cleaner') || text.includes('heater') || text.includes('generator')) {
    return { length: 30, width: 24, height: 20, weight: 80 };
  }
  
  // Default medium package
  return { length: 16, width: 12, height: 8, weight: 10 };
}

// Example usage in your listing processing
export function processListingShipping(listing: {
  title: string;
  description?: string;
  category?: string;
  price?: number;
}) {
  // Check if should exclude
  if (shouldExcludeItem(listing.title, listing.description)) {
    return {
      shouldExclude: true,
      reason: 'Item too large for standard shipping'
    };
  }
  
  // Estimate shipping
  const dimensions = estimateDimensions(listing.title, listing.description, listing.category);
  const shipping = calculateShipping(dimensions);
  
  if (!shipping.canShip) {
    return {
      shouldExclude: true,
      reason: shipping.reason
    };
  }
  
  // Add shipping costs to listing
  const shippingCost = shipping.recommendedPrice;
  const totalPrice = (listing.price || 0) + shippingCost;
  
  return {
    shouldExclude: false,
    dimensions,
    shipping: {
      category: shipping.category,
      cost: shippingCost,
      canShip: true
    },
    totalPrice,
    shippingInfo: `${shipping.category} - $${shippingCost} shipping`
  };
}

// Simplified shipping cost calculator for OrderSummary component
export function calculateShippingCost(params: {
  quantity: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  zone?: 'domestic' | 'canada' | 'international';
  productTitle?: string;
}): { cost: number; zone: 'domestic' | 'canada' | 'international' } {
  const { quantity, weight = 1, dimensions, zone = 'domestic', productTitle = '' } = params;
  
  // Create ShippingDimensions object
  const shippingDims: ShippingDimensions = {
    length: dimensions?.length || 12,
    width: dimensions?.width || 8,
    height: dimensions?.height || 6,
    weight: weight || quantity
  };
  
  // Map zone to SHIPPING_ZONES
  const zoneMap: Record<typeof zone, keyof typeof SHIPPING_ZONES> = {
    'domestic': 'NATIONAL',
    'canada': 'CROSS_COUNTRY',
    'international': 'INTERNATIONAL'
  };
  
  const shippingZone = zoneMap[zone];
  const result = calculateShipping(shippingDims, shippingZone);
  
  return {
    cost: result.canShip ? result.recommendedPrice * quantity : 0,
    zone
  };
}