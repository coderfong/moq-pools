'use client';

import { useState, useEffect } from 'react';
import { calculateShipping, estimateDimensions, SHIPPING_ZONES } from '@/lib/shipping';

interface ShippingCalculatorProps {
  title: string;
  description?: string;
  category?: string;
  price: number;
}

export function ShippingCalculator({ title, description, category, price }: ShippingCalculatorProps) {
  const [selectedZone, setSelectedZone] = useState<keyof typeof SHIPPING_ZONES>('NATIONAL');
  const [shippingInfo, setShippingInfo] = useState<any>(null);

  useEffect(() => {
    const dimensions = estimateDimensions(title, description, category);
    const shipping = calculateShipping(dimensions, selectedZone);
    setShippingInfo(shipping);
  }, [title, description, category, selectedZone]);

  if (!shippingInfo) return null;

  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <h4 className="font-semibold text-gray-900 mb-3">📦 Shipping Calculator</h4>
      
      {/* Zone Selector */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Shipping Zone:
        </label>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value as keyof typeof SHIPPING_ZONES)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {Object.entries(SHIPPING_ZONES).map(([key, zone]) => (
            <option key={key} value={key}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>

      {/* Shipping Results */}
      {shippingInfo.canShip ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Category:</span>
            <span className="font-medium">{shippingInfo.category}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Billable Weight:</span>
            <span>{shippingInfo.billableWeight.toFixed(1)} lbs</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Base Rate:</span>
            <span>${shippingInfo.baseRate.toFixed(2)}</span>
          </div>
          
          {shippingInfo.weightSurcharge > 0 && (
            <div className="flex justify-between text-sm">
              <span>Weight Surcharge:</span>
              <span>${shippingInfo.weightSurcharge.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Zone Multiplier:</span>
            <span>{shippingInfo.zoneMultiplier}x</span>
          </div>
          
          <hr className="my-2" />
          
          <div className="flex justify-between font-semibold">
            <span>Shipping Cost:</span>
            <span className="text-blue-600">${shippingInfo.recommendedPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total Price:</span>
            <span className="text-green-600">
              ${(price + shippingInfo.recommendedPrice).toFixed(2)}
            </span>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            * Shipping cost includes handling fee and packaging
          </div>
        </div>
      ) : (
        <div className="text-red-600 p-3 bg-red-50 rounded border border-red-200">
          <div className="font-semibold">⚠️ Cannot Ship</div>
          <div className="text-sm mt-1">{shippingInfo.reason}</div>
          <div className="text-sm mt-2">
            <strong>Available Options:</strong>
            <br />• Local pickup only
            <br />• Freight shipping (contact for quote)
            <br />• Professional installation service
          </div>
        </div>
      )}
    </div>
  );
}

export function ShippingBadge({ 
  title, 
  description, 
  category,
  zone = 'NATIONAL' 
}: {
  title: string;
  description?: string;
  category?: string;
  zone?: keyof typeof SHIPPING_ZONES;
}) {
  const dimensions = estimateDimensions(title, description, category);
  const shipping = calculateShipping(dimensions, zone);

  if (!shipping.canShip) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Freight Only
      </span>
    );
  }

  const shippingCost = shipping.recommendedPrice;
  let badgeColor = 'bg-green-100 text-green-800';
  
  if (shippingCost > 100) badgeColor = 'bg-red-100 text-red-800';
  else if (shippingCost > 50) badgeColor = 'bg-yellow-100 text-yellow-800';
  else if (shippingCost > 25) badgeColor = 'bg-blue-100 text-blue-800';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
      📦 ${shippingCost}
    </span>
  );
}