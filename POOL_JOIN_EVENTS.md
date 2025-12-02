# Pool Join Events System

This document describes the automated events and notifications that trigger when a user joins a product pool.

## Overview

When a user successfully joins a pool (payment confirmed), the system automatically triggers multiple events to ensure all stakeholders are informed and the pool progress is properly tracked.

## Event Flow

```
User Completes Payment
        ↓
Payment Confirmed (app/api/payment/confirm/route.ts)
        ↓
    ┌───┴────────────────────────────────┐
    │   POST-JOIN EVENTS TRIGGERED       │
    ├────────────────────────────────────┤
    │ 1. User In-App Alert               │
    │ 2. User Confirmation Email         │
    │ 3. Admin In-App Alert              │
    │ 4. Admin Email Notification        │
    │ 5. Existing Participants Alert     │
    │ 6. Pool Milestone Check            │
    └────────────────────────────────────┘
```

## Events Detail

### 1. User In-App Alert/Notification

**Location:** `src/lib/notifications.ts` → `createUserAlert()`

Creates an in-app alert for the user confirming their pool participation.

**Alert Type:** `GROUP_UPDATE`

**Content:**
- **Title:** "Welcome to the pool for [Product Name]!"
- **Body:** Payment amount, escrow status, and current pool progress
- **Link:** Direct link to pool page

**Stored in:** `Alert` table in database

### 2. User Confirmation Email

**Location:** `src/lib/email.ts` → `sendPoolJoinConfirmationEmail()`

Sends a detailed confirmation email to the user's registered email address.

**Email Includes:**
- Welcome message
- Order details (quantity, amount, payment status)
- Current pool progress with percentage
- Pool deadline
- Next steps explanation
- Link to track pool progress
- Contact information

**Configuration Required:**
```env
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SECURE=0
SMTP_FROM=noreply@MOQPools.com
```

### 3. Admin In-App Alert

**Location:** `src/lib/notifications.ts` → `createAdminAlert()`

Creates alerts for all admin users about the new pool participant.

**Alert Type:** `GROUP_UPDATE`

**Content:**
- **Title:** "New participant: [Product Name]"
- **Body:** User details, quantity joined, updated pool progress
- **Link:** Direct link to pool page

**Target:** All users with `role = 'ADMIN'`

### 4. Admin Email Notification

**Location:** `src/lib/email.ts` → `sendAdminPoolJoinNotification()`

Sends email to admin team about new pool participant.

**Email Includes:**
- User information (name, email)
- Product details
- Purchase details (quantity, amount)
- Pool progress update
- Link to pool page

**Configuration:**
```env
ADMIN_EMAIL=admin@MOQPools.com
```

### 5. Existing Participants Notification

**Location:** `src/lib/notifications.ts` → `notifyExistingPoolParticipants()`

Notifies all existing pool participants that someone new has joined.

**Alert Type:** `GROUP_UPDATE`

**Content:**
- **Title:** "New participant joined your pool!"
- **Body:** New participant name, product name, updated progress
- **Link:** Direct link to pool page

**Note:** Excludes the newly joined user from receiving this notification.

### 6. Pool Milestone Check

**Location:** `src/lib/notifications.ts` → `checkAndUpdatePoolMilestone()`

Automatically checks if the pool has reached any progress milestones and notifies all participants.

**Milestones:**

#### 50% Milestone
- **Title:** "🎯 Halfway There! [Product Name]"
- **Body:** Celebrates reaching 50% of goal
- **Priority:** Normal

#### 90% Milestone
- **Title:** "🔥 Almost There! [Product Name]"
- **Body:** Indicates pool is 90% full, shows remaining units
- **Priority:** Normal

#### MOQ Reached (100%)
- **Title:** "🎉 Pool Complete! [Product Name]"
- **Body:** Celebrates MOQ achievement, mentions order will be placed
- **Priority:** High

**Milestone Tracking:**
- Uses `lastProgressMilestone` field in Pool table to prevent duplicate notifications
- Milestones: `NONE`, `FIFTY`, `NINETY`, `MOQ`

## Real-Time Progress Updates

### Client-Side Progress Tracker

**Location:** `src/components/PoolProgressTracker.tsx`

A React client component that polls for pool progress updates.

**Usage:**
```tsx
import PoolProgressTracker from '@/components/PoolProgressTracker';

<PoolProgressTracker
  poolId={pool.id}
  initialPledgedQty={pool.pledgedQty}
  targetQty={pool.targetQty}
  pollInterval={30000} // 30 seconds
  onProgressUpdate={(data) => {
    // Handle progress update
    console.log('New progress:', data);
  }}
/>
```

**Features:**
- Polls server every 30 seconds (configurable)
- Only updates when values change
- Provides callback for custom handling
- Automatically cleans up on unmount

### Progress API Endpoint

**Location:** `app/api/pools/[id]/progress/route.ts`

Provides lightweight endpoint for checking pool progress.

**Endpoint:** `GET /api/pools/{poolId}/progress`

**Response:**
```json
{
  "pledgedQty": 150,
  "targetQty": 200,
  "status": "OPEN",
  "participantCount": 12
}
```

## Database Schema

### Alert Table

```prisma
model Alert {
  id           String            @id @default(cuid())
  user         User              @relation(fields: [userId], references: [id])
  userId       String
  type         AlertType         // GROUP_UPDATE, SHIPPING, PROMOTION, SYSTEM
  title        String
  body         String
  link         String?
  status       AlertStatus       @default(UNREAD)
  triageStatus AlertTriageStatus @default(OPEN)
  priority     Boolean?
  timestamp    DateTime          @default(now())
  // ... admin fields
}
```

### Pool Table

```prisma
model Pool {
  id                    String             @id @default(cuid())
  pledgedQty            Int                @default(0)
  targetQty             Int
  status                PoolStatus         @default(OPEN)
  lastProgressMilestone ProgressMilestone  @default(NONE)
  // ... other fields
}
```

## Implementation Checklist

When a user joins a pool, the system should:

- [x] Create pool item in database
- [x] Update pool's `pledgedQty`
- [x] Create payment record with AUTHORIZED status
- [x] Create conversation thread for the order
- [x] Send initial admin message in conversation
- [x] Create in-app alert for user
- [x] Send confirmation email to user
- [x] Create alerts for all admin users
- [x] Send notification email to admins
- [x] Notify existing pool participants
- [x] Check and update pool milestones
- [x] Provide real-time progress updates

## Error Handling

All notification functions are designed to fail gracefully:

- Email failures are logged but don't block the payment confirmation
- Missing SMTP configuration causes emails to be silently skipped
- Database errors in notifications don't affect payment processing
- Progress updates continue even if some notifications fail

## Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# SMTP Configuration (optional but recommended)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-password
SMTP_SECURE=0
SMTP_FROM=MOQPools <noreply@MOQPools.com>

# Admin Notifications
ADMIN_EMAIL=admin@MOQPools.com
SUPPORT_EMAIL=support@MOQPools.com

# Application URLs
APP_BASE_URL=https://MOQPools.com
NEXT_PUBLIC_APP_URL=https://MOQPools.com
```

## Testing

### Manual Testing

1. **Join a pool as a new user:**
   - Verify user receives in-app alert
   - Check email inbox for confirmation
   - Confirm admin receives notification
   - Check that existing participants are notified

2. **Test milestone notifications:**
   - Join pool at 40% → no milestone
   - Join pool at 50% → 50% milestone triggered
   - Join pool at 90% → 90% milestone triggered
   - Join pool at 100% → MOQ milestone triggered

3. **Test progress tracker:**
   - Open pool page
   - Have another user join the pool
   - Wait for poll interval (30s)
   - Verify progress bar updates automatically

### API Testing

```bash
# Check pool progress
curl http://localhost:3000/api/pools/{poolId}/progress

# Expected response:
# {
#   "pledgedQty": 150,
#   "targetQty": 200,
#   "status": "OPEN",
#   "participantCount": 12
# }
```

## Future Enhancements

Potential improvements for the pool join events system:

1. **WebSocket/Server-Sent Events**
   - Replace polling with real-time push notifications
   - Instant progress bar updates across all clients

2. **Push Notifications**
   - Browser push notifications for important milestones
   - Mobile app push notifications via FCM/APNS

3. **SMS Notifications**
   - Optional SMS for milestone achievements
   - Twilio or similar integration

4. **Slack/Discord Integration**
   - Admin channel notifications for new participants
   - Automated milestone announcements

5. **Analytics Dashboard**
   - Track notification delivery rates
   - Monitor email open rates
   - Analyze participant engagement

6. **Customizable Notification Preferences**
   - Let users choose which notifications to receive
   - Frequency settings (instant, daily digest, etc.)

## Troubleshooting

### Emails Not Sending

1. Check SMTP configuration in environment variables
2. Verify SMTP credentials are correct
3. Check firewall/network restrictions
4. Review application logs for SMTP errors
5. Test with a simple SMTP client to isolate the issue

### In-App Alerts Not Showing

1. Check that Alert records are being created in database
2. Verify user has correct permissions
3. Check that alerts are marked as UNREAD
4. Ensure alerts component is properly integrated in UI

### Progress Not Updating

1. Verify API endpoint is accessible
2. Check browser console for fetch errors
3. Confirm PoolProgressTracker component is mounted
4. Check that poolId is being passed correctly

### Milestones Not Triggering

1. Verify `lastProgressMilestone` field in Pool table
2. Check that percentage calculations are correct
3. Ensure milestone logic hasn't been modified
4. Review logs for errors in checkAndUpdatePoolMilestone

## Related Files

- `app/api/payment/confirm/route.ts` - Main payment confirmation handler
- `src/lib/email.ts` - Email sending functions
- `src/lib/notifications.ts` - Alert and notification functions
- `src/components/PoolProgressTracker.tsx` - Client-side progress tracker
- `app/api/pools/[id]/progress/route.ts` - Progress API endpoint
- `prisma/schema.prisma` - Database schema definitions
