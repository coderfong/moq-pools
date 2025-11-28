# Global Sources ingestion

Global Sources uses a WAF that blocks URL-parameter pagination. Always use headless mode with cookies and click-based pagination for reliable results.

Quick start

1) Install Playwright once

- PowerShell:
  - `pnpm exec playwright install chromium`

2) Capture cookies (recommended)

- PowerShell:
  - `pnpm ts-node scripts/captureGlobalSourcesCookies.ts`
  - This writes `scripts/cookies.globalsources.txt`. Keep it single-line when setting the env.

3) Run a single query (with cookies)

- PowerShell:
  - Set environment vars and run:
  - ```powershell
    $env:TS_NODE_PROJECT='tsconfig.scripts.json'
    $env:GS_COOKIES = (Get-Content -Raw scripts/cookies.globalsources.txt).Replace("`r",'').Replace("`n",'')
    # Optional but recommended: residential proxy
    # $env:GS_PROXY='http://USER:PASS@HOST:PORT'
    $env:GS_MAX_PAGES='8'
    $env:GS_SCROLLS_PER_PAGE='8'
    $env:GS_SCROLL_DELAY_MS='700'
    node -r ts-node/register -r tsconfig-paths/register scripts/ingestSavedListings.ts --platform GLOBAL_SOURCES --q "gaming mouse" --limit 200 --headless 1
    ```

4) Batch ingest from seed jobs

- PowerShell:
  - ```powershell
    $env:GS_COOKIES = (Get-Content -Raw scripts/cookies.globalsources.txt).Replace("`r",'').Replace("`n",'')
    $env:GS_HEADLESS='1'
    pnpm run gs:ingest
    ```

5) Cache images after ingest

- PowerShell:
  - `pnpm run catalog:cache-images`

Notes

- Do NOT build URLs like `?page=2` or `&p=2`; the provider clicks "Load more/Next" to paginate under the hood.
- Cookies are applied to both `.globalsources.com` and `.globalsources.com.hk` and sent on every request; a proxy helps if you still see 403s.
- Next.js Image remotePatterns include `*.globalsources.com`. Cached images are stored under `public/cache`.