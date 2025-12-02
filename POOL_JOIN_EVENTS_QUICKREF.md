# Pool Join Events - Quick Reference

## What Was Implemented

When a user joins a pool, the following events now trigger automatically:

### ✅ User Notifications
1. **In-app alert** - Immediate notification in the app
2. **Confirmation email** - Detailed email with order summary and next steps

### ✅ Admin Notifications  
3. **Admin in-app alert** - All admins get notified of new participant
4. **Admin email** - Email summary sent to admin team

### ✅ Community Updates
5. **Participant alerts** - Existing pool members get notified of new joiners

### ✅ Progress Tracking
6. **Milestone checks** - Automatic detection of 50%, 90%, and 100% (MOQ) milestones
7. **Real-time updates** - Client-side component that polls for progress updates every 30s

## Files Created

- `src/lib/notifications.ts` - Alert and notification management
- `src/components/PoolProgressTracker.tsx` - Real-time progress tracking component  
- `app/api/pools/[id]/progress/route.ts` - API endpoint for progress data
- `POOL_JOIN_EVENTS.md` - Complete documentation

## Files Modified

- `src/lib/email.ts` - Added pool join email functions
- `app/api/payment/confirm/route.ts` - Integrated all post-join events

## Usage Example

### In a Pool Page Component

```tsx
import PoolProgressTracker from '@/components/PoolProgressTracker';

export default function PoolPage({ pool }) {
  return (
    <div>
      {/* Your pool UI */}
      
      {/* Add progress tracker for real-time updates */}
      <PoolProgressTracker
        poolId={pool.id}
        initialPledgedQty={pool.pledgedQty}
        targetQty={pool.targetQty}
      />
    </div>
  );
}
```

## Configuration Required

Add these to your `.env`:

```env
# Email (optional but recommended)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=password
SMTP_FROM=MOQPools <noreply@MOQPools.com>

# Admin notifications
ADMIN_EMAIL=admin@MOQPools.com

# App URLs
APP_BASE_URL=https://MOQPools.com
```

## How It Works

```
User Joins Pool
      ↓
Payment Confirmed
      ↓
┌─────────────────────┐
│  6 Events Trigger:  │
├─────────────────────┤
│ 1. User Alert       │
│ 2. User Email       │
│ 3. Admin Alert      │
│ 4. Admin Email      │
│ 5. Notify Others    │
│ 6. Check Milestones │
└─────────────────────┘
      ↓
Progress Updates
```

## Testing

1. Join a pool with payment
2. Check your email for confirmation
3. Check in-app alerts/notifications
4. Admin should see notification
5. Other pool members should see alert
6. Progress bar should update

## Milestone Alerts

- **50%** - "🎯 Halfway There!"
- **90%** - "🔥 Almost There!"  
- **100%** - "🎉 Pool Complete!" (high priority)

## API Endpoints

- `GET /api/pools/{id}/progress` - Get current pool progress

Response:
```json
{
  "pledgedQty": 150,
  "targetQty": 200,
  "status": "OPEN",
  "participantCount": 12
}
```

## Notes

- All notifications fail gracefully if email is not configured
- Progress tracker polls every 30 seconds by default
- Milestones are only triggered once (tracked in database)
- Payment confirmation always succeeds even if notifications fail
