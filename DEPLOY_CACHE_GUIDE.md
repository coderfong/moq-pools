# Deploy Cache Folder to Vercel

## Problem
- 78,009 cached images in `public/cache/`
- Vercel has limitations for large static assets

## Solutions

### Option A: Use Vercel Blob Storage (Recommended for Vercel)
```bash
# 1. Install Vercel Blob
pnpm add @vercel/blob

# 2. Upload cache to Vercel Blob
# Create upload-cache-to-blob.js script

# 3. Update image URLs to use Blob storage
```

### Option B: Use External CDN (Best for large files)
```bash
# Upload to AWS S3 / Cloudflare R2 / DigitalOcean Spaces
# Update environment variables with CDN URL
# Images will be served from CDN instead of Vercel
```

### Option C: Docker Self-Hosting (Easiest)
```bash
# Build Docker image with cache included
docker build -t moq-pools .

# Run with cache folder
docker run -p 3007:3007 moq-pools

# Or use docker-compose
docker-compose up -d
```

## Docker Deployment Steps (RECOMMENDED)

1. **Verify cache folder exists:**
   ```powershell
   Test-Path public/cache
   Get-ChildItem public/cache | Measure-Object
   ```

2. **Build Docker image:**
   ```powershell
   docker build -t moq-pools:latest .
   ```

3. **Test locally:**
   ```powershell
   docker run -p 3007:3007 --env-file .env.local moq-pools:latest
   ```

4. **Deploy to production:**
   - Push to Docker Hub/Registry
   - Pull and run on production server
   - Cache folder included automatically

## Vercel Alternative (if you must use Vercel)

Create `upload-cache-to-cdn.js` to upload images to external CDN and update database paths.

Would you like me to create the CDN upload script?
