# How to Avoid Alibaba Blocking You

## Why Alibaba Blocks You
Alibaba uses sophisticated anti-bot detection that looks for:
- **High request volume** from same IP
- **Regular patterns** (same timing between requests)
- **Missing browser fingerprints** (headless detection)
- **No human-like behavior** (mouse movements, scrolling)

## Strategies to Avoid Blocking

### 1. **Slow Down Your Requests** ✅ EASIEST
```javascript
// In fix-all-alibaba-client.js
const DELAY_BETWEEN_REQUESTS = 10000; // 10 seconds
const DELAY_BETWEEN_BATCHES = 30000;  // 30 seconds
const BATCH_SIZE = 1; // Process 1 at a time
```

**Recommended schedule:**
- Process **50-100 listings per session**
- Wait **2-4 hours between sessions**
- Run during **different times of day**

### 2. **Use the Resume Feature** ✅ IMPLEMENTED
The script now auto-saves progress and stops after 15 consecutive failures.

**To use:**
```bash
# Start processing
node fix-all-alibaba-client.js

# Press Ctrl+C to stop anytime
# Progress saved to alibaba-fix-progress.json

# Wait 2-4 hours, then resume
node fix-all-alibaba-client.js  # Picks up where you left off
```

### 3. **Rotate Your IP Address** 🔄 ADVANCED
Change your IP between sessions:

**Option A: Restart Router**
- Unplug router for 5 minutes
- Get new IP from ISP

**Option B: Use VPN**
- NordVPN, ExpressVPN, etc.
- Change servers between sessions

**Option C: Mobile Hotspot**
- Use phone's data connection
- Different IP than home network

### 4. **Use Residential Proxies** 💰 EXPENSIVE
Services like:
- Bright Data (formerly Luminati)
- Smartproxy
- Oxylabs

Cost: $50-300/month but looks like real users

### 5. **Randomize Timing** 🎲 MODERATE
Make requests look more human:

```javascript
// Random delay 5-15 seconds
const randomDelay = () => {
  const min = 5000;
  const max = 15000;
  return Math.floor(Math.random() * (max - min + 1) + min);
};

await new Promise(resolve => setTimeout(resolve, randomDelay()));
```

### 6. **Add More Headless Evasion** 🔧 TECHNICAL
Already using Playwright with stealth, but can add:
- Random viewport sizes
- Fake user interaction (scrolling, mouse movement)
- Cookie persistence between sessions
- Different user agents

### 7. **Spread Across Multiple Machines** 🖥️ COMPLEX
- Run script on different computers
- Each has different IP
- Process 50-100 each

## Recommended Workflow

### Conservative (Safest)
```bash
# Session 1: Morning (9 AM)
DELAY_BETWEEN_REQUESTS=15000 node fix-all-alibaba-client.js
# Process ~50 listings, takes 12-15 minutes
# Ctrl+C to stop

# Session 2: Afternoon (3 PM) - 6 hours later
node fix-all-alibaba-client.js
# Process another ~50 listings

# Session 3: Night (9 PM) - 6 hours later  
node fix-all-alibaba-client.js
# Process another ~50 listings
```

**Result:** 150 listings/day with minimal risk

### Moderate
```bash
# Process 100 listings per session
# 3 sessions per day (morning, afternoon, evening)
# Each session 4 hours apart
```

**Result:** 300 listings/day

### Aggressive (High Risk)
```bash
# Current settings: no delays
# Will get blocked after 100-200 listings
# Need 2-4 hour cooldown
```

**Result:** Fast but requires frequent breaks

## What to Do When Blocked

### Symptoms
- Getting `alibaba:fallback-json/meta` repeatedly
- 0 attributes on most listings
- Script auto-stops after 15 failures

### Recovery
1. **Wait 2-4 hours minimum**
2. Change IP if possible (restart router/VPN)
3. Add delays to script
4. Resume: `node fix-all-alibaba-client.js`

### Check if Block Lifted
```bash
# Test with single listing
node check-alibaba-status.js
```

If still seeing fallback responses, wait longer.

## Long-Term Strategy

For 113,662 listings:

### Option 1: Slow & Steady (Safest)
- 150 listings/day
- **758 days** (2+ years) 😱

### Option 2: Moderate Pace
- 300 listings/day  
- **379 days** (~1 year)

### Option 3: Distributed (Recommended)
- Run on 3 different machines/IPs
- 150 listings each = 450/day
- **253 days** (~8 months)

### Option 4: Pay for Service
- Use professional scraping service
- $500-2000 one-time cost
- Done in days/weeks

## Current Progress Tracking

Check status anytime:
```bash
node check-alibaba-status.js
```

View progress file:
```bash
cat alibaba-fix-progress.json
```

## Best Practices

✅ **DO:**
- Save progress frequently (auto-done)
- Stop after 15 consecutive failures (auto-done)
- Wait 2-4 hours between sessions
- Vary your request timing
- Use different IPs when possible

❌ **DON'T:**
- Run 24/7 without breaks
- Use zero delays
- Ignore consecutive failures
- Always run at same time
- Use same IP for weeks

## Quick Commands

```bash
# Start fresh or resume
node fix-all-alibaba-client.js

# Check current status
node check-alibaba-status.js

# Reset progress (start over)
rm alibaba-fix-progress.json

# View progress
cat alibaba-fix-progress.json
```

## Need Help?

If still getting blocked frequently:
1. Increase `DELAY_BETWEEN_REQUESTS` to 30-60 seconds
2. Use VPN and change server between sessions  
3. Process only 20-30 at a time
4. Wait 6-8 hours between sessions
