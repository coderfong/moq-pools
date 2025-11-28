"use client";
import { useCompareStore, CompareItem } from '@/store/compareStore';
import Image from 'next/image';
import Link from 'next/link';
import { X, ExternalLink, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ComparePage() {
  const router = useRouter();
  const items = useCompareStore((state) => state.items);
  const removeItem = useCompareStore((state) => state.removeItem);
  const clearAll = useCompareStore((state) => state.clearAll);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                <path d="M7 21h10" />
                <path d="M12 3v18" />
                <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No products to compare
            </h2>
            <p className="text-gray-600 mb-8">
              Start adding products to compare them side-by-side
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const attributes = [
    { key: 'image', label: 'Product Image' },
    { key: 'title', label: 'Title' },
    { key: 'price', label: 'Price' },
    { key: 'moq', label: 'MOQ' },
    { key: 'platform', label: 'Platform' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'description', label: 'Description' },
    { key: 'action', label: 'Actions' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Compare Products
            </h1>
            <p className="text-gray-600">
              Comparing {items.length} {items.length === 1 ? 'product' : 'products'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Back
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-6 text-left font-semibold text-gray-900 bg-gray-50 sticky left-0 z-10">
                    Attribute
                  </th>
                  {items.map((item) => (
                    <th
                      key={item.id}
                      className="py-4 px-6 text-center font-semibold text-gray-900 bg-gray-50 min-w-[250px]"
                    >
                      <button
                        onClick={() => removeItem(item.id)}
                        className="float-right p-1 hover:bg-red-100 rounded-full text-red-600 transition-colors"
                        aria-label="Remove from comparison"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attributes.map((attr, idx) => (
                  <tr key={attr.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 z-10 bg-inherit">
                      {attr.label}
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="py-4 px-6 text-center">
                        {attr.key === 'image' && (
                          <div className="relative h-40 w-full rounded-lg overflow-hidden bg-gray-100">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingCart className="w-12 h-12 text-gray-300" />
                              </div>
                            )}
                          </div>
                        )}
                        {attr.key === 'title' && (
                          <div className="font-semibold text-gray-900">{item.title}</div>
                        )}
                        {attr.key === 'price' && item.price && (
                          <div className="text-orange-600 font-bold text-lg">{item.price}</div>
                        )}
                        {attr.key === 'moq' && item.moq && (
                          <div className="text-gray-700">{item.moq}</div>
                        )}
                        {attr.key === 'platform' && item.platform && (
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            {item.platform}
                          </span>
                        )}
                        {attr.key === 'supplier' && item.supplier && (
                          <div className="text-gray-700 text-sm">{item.supplier}</div>
                        )}
                        {attr.key === 'description' && item.description && (
                          <div className="text-gray-600 text-sm line-clamp-3 text-left">
                            {item.description}
                          </div>
                        )}
                        {attr.key === 'action' && (
                          <Link
                            href={item.url}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200"
                          >
                            View Product
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        {!item[attr.key as keyof CompareItem] && attr.key !== 'image' && attr.key !== 'action' && (
                          <div className="text-gray-400 text-sm">—</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add More Products */}
        {items.length < 4 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              You can compare up to 4 products. Add {4 - items.length} more!
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 border-2 border-orange-500 text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-orange-50 transition-all duration-200"
            >
              Browse More Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
