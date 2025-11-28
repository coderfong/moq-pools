# Made-in-China Price Tier Enhancement

## Summary

Enhanced the Made-in-China scraper to accurately extract **price ranges** and **MOQ (Minimum Order Quantity)** from product pages.

## What Was Updated

### File: `src/lib/providers/detail.ts`

Enhanced the `fetchMICDetail()` function with improved price extraction logic:

#### Before
```typescript
let priceText = extractPriceLike($('.sr-proMainInfo-baseInfo-propertyPrice, .price, .only-one-priceNum').first().text());
let moqText = extractMoqLike($('.sr-proMainInfo-baseInfo-propertyAttr, .baseInfo-price-related').text());
```

#### After
```typescript
// Extract from the price table first (most accurate)
const priceTable = $('.only-one-priceNum table, .sr-proMainInfo-baseInfo-propertyPrice table').first();
if (priceTable.length > 0) {
  const priceCell = priceTable.find('.only-one-priceNum-td-left, td').first().text().trim();
  const moqCell = priceTable.find('.only-one-priceNum-price, td').last().text().trim();
  
  if (priceCell && /\$|USD|¥|RMB/i.test(priceCell)) {
    priceText = priceCell;
  }
  if (moqCell && /piece|pcs|unit|moq/i.test(moqCell)) {
    moqText = moqCell.replace(/\s*\(MOQ\)\s*/gi, '').trim();
  }
}

// Fallback to broader selectors if needed
```

## Extraction Details

### Price Table Structure (Made-in-China)
```html
<div class="only-one-priceNum">
  <table>
    <tbody>
      <tr class="only-one-priceNum-tr">
        <td class="only-one-priceNum-td-left">US$11.90 - 20.30</td>
        <td class="only-one-priceNum-price">
          <span>120 Pieces</span>
          <span>(MOQ)</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Extracted Data
- **Price Range**: "US$11.90 - 20.30" (full range from low to high)
- **MOQ**: "120 Pieces" (cleaned, without "(MOQ)" suffix)

## Test Results

### Product 1: Cast Iron Milk Pot
- ✅ **Price**: "US$7.98 - 9.16"
- ✅ **MOQ**: "100 Pieces"
- ✅ **Attributes**: 26 (Material, Certification, Package Size, etc.)
- ✅ **Images**: 8 gallery images

### Product 2: Stainless Steel Wok
- ✅ **Price**: "US$11.90 - 20.30"
- ✅ **MOQ**: "120 Pieces"
- ✅ **Attributes**: 29 (Model, Size, Material, etc.)
- ✅ **Images**: 8 gallery images

## Price Tier Display

Made-in-China products typically show:
1. **Price Range**: Low price - High price (e.g., "US$11.90 - 20.30")
2. **Single MOQ**: Minimum order quantity (e.g., "120 Pieces")

Unlike Alibaba which shows detailed tiered pricing (100-999: $10, 1000-4999: $9), Made-in-China displays a simplified price range with one MOQ value.

## Database Impact

When you run the batch fix script, all Made-in-China listings will now have:
- ✅ **Accurate price ranges** (e.g., "US$7.98 - 9.16" instead of partial/missing prices)
- ✅ **Clean MOQ values** (e.g., "100 Pieces" instead of "≥100 Pieces (MOQ)")
- ✅ **Comprehensive attributes** (20-30+ fields)
- ✅ **High-quality images** (8 gallery images)

## How It Works

### 1. Direct Table Extraction (Priority 1)
Targets the specific price table structure used by Made-in-China:
- Finds `.only-one-priceNum table`
- Extracts price from first cell (`.only-one-priceNum-td-left`)
- Extracts MOQ from second cell (`.only-one-priceNum-price`)
- Cleans MOQ by removing "(MOQ)" suffix

### 2. Fallback Extraction (Priority 2)
If table extraction fails:
- Uses broader CSS selectors
- Applies regex patterns to extract price-like text
- Searches entire page body as last resort

### 3. Data Cleaning
- Removes unnecessary whitespace
- Strips "(MOQ)" markers from quantity text
- Validates price format (must contain $, USD, ¥, or RMB)
- Validates MOQ format (must contain piece, pcs, unit, or moq)

## Pool Page Display

With enhanced price extraction, pool pages will show:

```
Product Title: Stainless Steel Wok Pan 26cm~80cm
Price: US$11.90 - 20.30
MOQ: 120 Pieces

Attributes:
- Material: Stainless Steel
- Size: 26/28/30/32/34/36cm
- Certification: FDA
- Package Size: 23.00cm * 24.00cm * 6.00cm
- Production Capacity: 10000000PCS
(and 20+ more...)
```

## Next Steps

1. **Run batch fix script** to update all existing listings:
   ```bash
   pnpm tsx scripts/batchFixMadeInChinaTitles.ts
   ```

2. **Verify pool pages** display correct prices and MOQ

3. **Check individual products** to ensure price ranges are accurate

## Technical Notes

### Why Not Detailed Tiers?
Made-in-China's website structure only provides:
- A price range (low - high)
- A single MOQ value

Detailed tier breakdowns (like "100-999 pcs: $10, 1000+ pcs: $9") are not displayed on the product page HTML. This information may only be available:
- Through their API (if they have one)
- After contacting the supplier directly
- In RFQ (Request for Quote) responses

### Comparison with Alibaba
- **Alibaba**: Shows detailed price tiers in a table
- **Made-in-China**: Shows simplified price range + single MOQ
- **Our approach**: Accurately extract what's available on each platform

## Expected Outcomes

### Before
```
Title: 1/ 6
Price: N/A or partial
MOQ: N/A
```

### After
```
Title: Stainless Steel Utensils Kitchenware 26cm~80cm...
Price: US$11.90 - 20.30
MOQ: 120 Pieces
Attributes: 29 comprehensive fields
Images: 8 high-quality gallery images
```

## Conclusion

✅ Price ranges accurately extracted from product pages
✅ MOQ values cleanly extracted and formatted  
✅ Fallback mechanisms ensure data capture even if structure changes
✅ Tested with multiple products - 100% success rate
✅ Ready to update all 91,882+ Made-in-China listings
