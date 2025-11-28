# Product Detail Drawer

A beautiful, intelligent side drawer that displays **value-added information** not shown on product cards, personalized to the buyer's location.

## Philosophy

The drawer **doesn't repeat** what's already visible on the product card (price, title, image). Instead, it shows:

- 🌍 **Localized shipping estimates** to the user's country
- � **Import duties & taxes** specific to their location  
- 📦 **Pool buying status** and how to save together
- 💳 **Payment methods** available in their region
- 🏭 **Production & quality details**
- 🛡️ **Warranty & return policies**
- � **Platform trust signals**

## Key Features

- ✨ **Location-Aware**: Estimates shipping, duties, and payment methods based on user's country
- 📊 **Value-Added Info**: Shows details NOT visible on product cards
- 🎨 **Beautiful Design**: Modern gradients and smooth animations
- ⚡ **Smart Caching**: Prefetching and in-memory caching
- 🔒 **Type-Safe**: Full TypeScript support

## What the Drawer Shows

### 1. Shipping to Your Location 🚚
- Delivery time estimate (varies by country distance from supplier)
- Shipping method (Express/Air/Sea based on location)
- Cost estimate (Low/Medium/High)
- Customs clearance info

**Example**:
- **Singapore** (close to China): 5-10 days, Express, Low cost
- **USA**: 12-20 days, Air/Sea, Medium cost
- **Europe**: 15-25 days, Air/Sea, Medium-High cost

### 2. Import Duties & Taxes 💰
- Import duty rates for buyer's country
- VAT/GST rates
- DDP (Delivered Duty Paid) availability

**Example**:
- **USA**: 0-10% duty, No VAT (state sales tax)
- **UK**: 0-12% duty, 20% VAT
- **Singapore**: 0% duty, 9% GST

### 3. Pool Buying Status 🎯
- Current pool progress vs MOQ
- Units still needed
- Time remaining
- Join pool CTA with escrow/refund guarantees

### 4. Payment Methods Available 💳
- Credit/Debit cards (global)
- PayPal (US, CA, GB, AU, SG)
- Alipay/WeChat (CN, HK, TW)
- UPI/RazorPay (IN)
- SEPA/Klarna (DE, AT, NL)
- Localized to user's country

### 5. Production Details 🏭
- Lead time estimates
- MOQ details
- Customization options
- Sample availability
- Certifications

### 6. Warranty & Returns 🛡️
- Warranty period
- Return window
- DOA policy
- Quality inspection process

### 7. Platform Trust Signals 🏅
- Verified supplier status
- Transaction protection
- Order history
- Ratings

## Usage

```tsx
import DetailLink from '@/components/DetailLink';

<DetailLink 
  url={product.url}
  title={product.title}
  productData={product}
>
  View Shipping & Details
</DetailLink>
```

## Location Detection

The drawer automatically fetches the user's country from their profile:

```typescript
// Fetched from /api/me
{
  countryCode: "SG",  // ISO code
  countryName: "Singapore"
}
```

### Programmatic Usage

```tsx
import { openProductDrawer } from '@/components/DetailLink';

function MyComponent() {
  const handleClick = () => {
    openProductDrawer(
      'https://example.com/product',
      'Product Title',
      {
        title: 'Product Title',
        price: '$99.99',
        moq: 100,
        // ... more product data
      }
    );
  };

  return <button onClick={handleClick}>Open Drawer</button>;
}
```

### Using Custom Events

```tsx
function triggerDrawer() {
  const evt = new CustomEvent('open-detail-panel', {
    detail: {
      url: 'https://example.com/product',
      title: 'Product Title',
      productData: {
        // Product data object
      }
    }
  });
  window.dispatchEvent(evt);
}
```

## Product Data Structure

```typescript
type ProductData = {
  title?: string;
  platform?: string;           // e.g., 'ALIBABA', 'MADE_IN_CHINA'
  price?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;           // e.g., 'USD', 'CNY'
  moq?: number;                // Minimum Order Quantity
  moqRaw?: string;
  storeName?: string;
  description?: string;
  priceTiers?: PriceTier[];    // Array of pricing tiers
  detailJson?: any;            // Additional structured data
  image?: string;
  ordersRaw?: string;
  ratingRaw?: string;
};

type PriceTier = {
  min: number;
  max?: number;
  price: number;
  originalPrice?: number;
};
```

## API Endpoint

The drawer fetches product data from:

```
GET /api/products/by-url?url={productUrl}
```

**Response:**
```json
{
  "product": {
    "id": "...",
    "platform": "ALIBABA",
    "url": "...",
    "title": "...",
    "priceMin": 99.99,
    "currency": "USD",
    // ... more fields
  }
}
```

## Sections Displayed

1. **Product Image** - If available
2. **Pricing Tiers** - Shows all price tiers with discounts
3. **Pool Status** - Current pool progress and MOQ
4. **Product Details** - MOQ, lead time, variants, certifications, etc.
5. **Shipping Information** - Methods, delivery times, etc.
6. **Seller Information** - Store name, rating, years active
7. **Description** - Product description
8. **Important Notes** - Warnings and disclaimers

## Styling

The drawer uses:
- **TailwindCSS** for utility classes
- **Gradient backgrounds** for visual appeal
- **Smooth transitions** for opening/closing
- **Custom scrollbar** styling (`.drawer-scroll` class)
- **Responsive design** - full-width on mobile, 48rem on desktop

## Keyboard Support

- **ESC** - Close the drawer
- **Click outside** - Close the drawer

## Caching

The component includes built-in caching:
- Product data is cached in memory per URL
- Prefetching on hover/focus
- Reduces API calls for frequently viewed products

## Example Integration

In your product listing page:

```tsx
import DetailLink from '@/components/DetailLink';

export default function ProductsPage() {
  const products = [...]; // Your products array

  return (
    <div className="grid gap-4">
      {products.map(product => (
        <div key={product.id} className="border rounded-lg p-4">
          <h3>{product.title}</h3>
          <p>{product.description}</p>
          
          <DetailLink
            url={product.url}
            title={product.title}
            productData={product}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Full Details
          </DetailLink>
        </div>
      ))}
    </div>
  );
}
```

## Notes

- The drawer must be included in your main layout (already included in the root layout)
- Product data can be passed directly or will be fetched from the API
- All product URLs should be from saved listings in the database
- The drawer works with multiple source platforms (Alibaba, Made in China, IndiaMART, etc.)
