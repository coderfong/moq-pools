# Alibaba Image URL Fix - Summary

## Problem
Images showing 404 errors on Vercel deployment because database has `/cache/` paths (local only) instead of direct Alibaba CDN URLs.

## Solution
Extract single best quality image from `detailJson.gallery` and update database to use Alibaba CDN URLs directly.

## Image Selection Priority

The script selects **ONE** image per listing using this priority:

1. **Existing 960x960 images** - Best quality from Alibaba carousel
2. **Original full-size images** - No size suffix (e.g., `.jpg` without `_350x350`)
   - ⚠️ **Keep as-is** - Don't upgrade these (not all support size variants)
3. **Large resolution images** - `_600x600` or `_350x350`
4. **Any non-thumbnail** - Excludes `_80x80`, `_50x50`, `_120x120`
5. **First gallery image** - Fallback

### Thumbnail Upgrade Rules
- `_80x80` → `_350x350` ✅ (reliable)
- `_50x50` → `_350x350` ✅ (reliable)
- `_120x120` → `_350x350` ✅ (reliable)
- Original `.jpg` → **KEEP AS-IS** ⚠️ (don't upgrade)

## Usage

### Preview Changes (Dry Run)
```bash
node fix-alibaba-image-urls.js --dry-run
```

### Apply Changes
```bash
node fix-alibaba-image-urls.js
```

## Example

**Before:**
```
/cache/823a2883b5214e4c011b2dc5f083f620210d6442.jpg
```

**After:**
```
https://sc04.alicdn.com/kf/Hff6c843d8a3240d39402ac9d49cb9acdM.jpg
```

## Vercel Deployment

✅ **Works on Vercel** - Images served directly from Alibaba CDN
- No local cache needed
- Next.js config already has Alibaba CDN domains whitelisted
- ProductCard uses `<img>` tags (no Next.js Image optimization needed)

## Script Output

```
================================================================================
FIXING ALIBABA IMAGE URLS
================================================================================

Found 58843 Alibaba listings with /cache/ images

[1/58843] Fast Delivery Wall Decor UV Print...
  Current: /cache/823a2883b5214e4c011b2dc5f083f620210d6442.jpg
  ✅ Fixed: https://sc04.alicdn.com/kf/HTB1hAcfVZfpK1RjSZFOq6y6nFXaG.jpg

================================================================================
SUMMARY
================================================================================
✅ Fixed: 45000
⚠️  No images found: 13843
❌ Errors: 0
================================================================================
```

## Testing

Test image selection logic on a sample listing:
```bash
node test-single-image-selection.js
```

## Files Modified

- `fix-alibaba-image-urls.js` - Main fix script
- `test-single-image-selection.js` - Testing utility

## Notes

- Script has 50ms delay between updates to avoid overwhelming database
- Listings without `detailJson.gallery` are skipped
- Original image URLs are preserved (no aggressive upgrades)
- HTTPS protocol is automatically added if missing
