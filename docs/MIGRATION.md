# Migration Guide

Universal migration guide for transitioning to Push Platform React Native SDK from any legacy push notification provider.

## Table of Contents

- [Overview](#overview)
- [Migration Strategy](#migration-strategy)
- [Dual Registration Mode](#dual-registration-mode)
- [Event Deduplication](#event-deduplication)
- [Step-by-Step Migration](#step-by-step-migration)
- [Testing](#testing)
- [Rollback Plan](#rollback-plan)

---

## Overview

This guide provides a universal migration approach that works with **any** legacy push notification provider. The strategy leverages Push Platform's built-in event deduplication to enable safe, gradual migration without duplicate notifications.

### Key Principles

- **Universal compatibility**: Works with any legacy provider (OneSignal, Firebase only, custom implementations, etc.)
- **Zero-downtime migration**: Dual registration mode ensures continuous service
- **Automatic deduplication**: Native SDKs filter duplicates via `event_id`/`call_id`
- **Gradual rollout**: Migrate user cohorts incrementally
- **Safe rollback**: Legacy provider remains functional during migration

---

## Migration Strategy

### Phase 1: Dual Registration (Recommended)

Run both legacy provider and Push Platform SDKs simultaneously. Your backend sends pushes to both providers, and the native SDKs deduplicate events automatically.

**Benefits:**
- No service disruption
- Test Push Platform with real traffic
- Immediate rollback capability
- Gradual user migration

**Duration:** 1-4 weeks (depending on traffic and testing requirements)

### Phase 2: Full Migration

Once Push Platform is validated:
1. Migrate backend to send via Push Platform only
2. Remove legacy SDK code
3. Clean up dual registration logic

---

## Dual Registration Mode

During migration, both SDKs coexist:

```typescript
import { useEffect } from 'react';
import PushPlatform from '@pushplatform/react-native';
import LegacyProvider from 'legacy-sdk'; // Your existing provider

function App() {
  useEffect(() => {
    // Initialize both SDKs
    initializeBothSDKs();
  }, []);

  const initializeBothSDKs = async () => {
    // Initialize Push Platform
    await PushPlatform.initialize({
      apiKey: 'your-pushplatform-api-key',
      appId: 'your-app-id',
      environment: 'production',
    });

    // Initialize legacy provider (keep existing code)
    await LegacyProvider.initialize({
      appId: 'your-legacy-app-id',
    });

    // Register handlers for both
    setupPushPlatformHandlers();
    setupLegacyHandlers();
  };

  return <YourApp />;
}
```

---

## Event Deduplication

Push Platform's native SDKs automatically deduplicate events using `event_id` and `call_id` fields. When your backend sends the same notification to both providers, only one event reaches JavaScript.

### How It Works

1. **Backend sends push with unique ID:**
   ```json
   {
     "notification": {
       "title": "New message",
       "body": "You have a new message"
     },
     "data": {
       "event_id": "msg_12345",
       "message_id": "67890"
     }
   }
   ```

2. **Both providers deliver to device:**
   - Legacy provider → device
   - Push Platform → device

3. **Native SDK deduplicates:**
   - First notification arrives → forwarded to JavaScript
   - Duplicate arrives (same `event_id`) → silently dropped

4. **JavaScript receives exactly one event:**
   ```typescript
   PushPlatform.onNotificationReceived((context) => {
     // This fires only once, even though two pushes arrived
     console.log('Message:', context.notification.data.message_id);
   });
   ```

### Backend Implementation

Send notifications to both providers with identical `event_id`:

```javascript
// Backend: Send to both providers during migration
async function sendPush(userId, notification) {
  const eventId = generateUniqueId(); // e.g., "notif_abc123"

  // Send via legacy provider
  await legacyProvider.send({
    userId,
    title: notification.title,
    body: notification.body,
    data: {
      event_id: eventId, // Critical: same ID for both
      ...notification.data,
    },
  });

  // Send via Push Platform
  await pushPlatform.send({
    userId,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: {
      event_id: eventId, // Critical: same ID for both
      ...notification.data,
    },
  });
}
```

---

## Step-by-Step Migration

### Step 1: Install Push Platform SDK

```bash
npm install @pushplatform/react-native
```

iOS setup:
```bash
cd ios && pod install && cd ..
```

### Step 2: Initialize Both SDKs

Add Push Platform initialization alongside your existing legacy provider:

```typescript
// Keep existing legacy provider initialization
await LegacyProvider.initialize({ appId: 'legacy-app-id' });

// Add Push Platform initialization
await PushPlatform.initialize({
  apiKey: 'your-api-key',
  appId: 'your-app-id',
  environment: 'production',
});
```

### Step 3: Register Event Handlers

Set up handlers for both SDKs:

```typescript
// Push Platform handlers
PushPlatform.onNotificationReceived((context) => {
  handleNotification(context.notification);
});

PushPlatform.onNotificationOpened((context) => {
  handleNotificationOpen(context.notification);
});

// Legacy provider handlers (keep existing code)
LegacyProvider.onReceived((notification) => {
  handleNotification(notification);
});

LegacyProvider.onOpened((notification) => {
  handleNotificationOpen(notification);
});
```

### Step 4: Update Backend

Modify your backend to send to both providers with identical `event_id`:

```javascript
// Before: Send to legacy provider only
await legacyProvider.send(userId, notification);

// During migration: Send to both with same event_id
const eventId = generateUniqueId();
await Promise.all([
  legacyProvider.send(userId, { ...notification, event_id: eventId }),
  pushPlatform.send(userId, { ...notification, event_id: eventId }),
]);
```

### Step 5: Test Dual Registration

1. **Send test notification** from your backend
2. **Verify single event** in app (check logs)
3. **Confirm deduplication** works (only one notification shown)

### Step 6: Gradual Rollout

Deploy to user cohorts incrementally:

```typescript
// Example: Rollout to 10% of users
const shouldUsePushPlatform = userId => {
  return hash(userId) % 100 < 10; // 10% rollout
};

if (shouldUsePushPlatform(userId)) {
  await pushPlatform.send(userId, notification);
} else {
  await legacyProvider.send(userId, notification);
}
```

### Step 7: Monitor

Track metrics during dual registration:
- Notification delivery rate (both providers)
- Deduplication rate (should be ~100%)
- Event handler invocations (should be single)
- User-reported issues

### Step 8: Full Migration

Once validated (typically 1-4 weeks):

1. **Backend:** Switch to Push Platform only
   ```javascript
   // Remove legacy provider sends
   await pushPlatform.send(userId, notification);
   ```

2. **App:** Remove legacy SDK
   ```bash
   npm uninstall legacy-sdk
   ```

3. **Cleanup:** Remove legacy initialization and handlers

---

## Testing

### Test Scenarios

1. **Single notification:**
   - Send via both providers with same `event_id`
   - Verify only one event in app

2. **Different notifications:**
   - Send via both providers with different `event_id`
   - Verify two separate events

3. **App states:**
   - Test foreground, background, terminated states
   - Verify deduplication works in all states

4. **Deep links:**
   - Send notification with deep link data
   - Verify routing works correctly

5. **Action buttons:**
   - Send notification with action buttons
   - Verify actions handled correctly

### Debug Logging

Enable debug mode to verify deduplication:

```typescript
await PushPlatform.initialize({
  apiKey: 'your-api-key',
  appId: 'your-app-id',
  environment: 'production',
  debugMode: true, // Enable verbose logging
});
```

Check logs for:
- "Event deduplicated" messages
- Event IDs being processed
- Duplicate event_id detections

---

## Rollback Plan

If issues arise during migration:

### Immediate Rollback (App-Side)

1. **Stop Push Platform initialization:**
   ```typescript
   // Comment out Push Platform initialization
   // await PushPlatform.initialize({ ... });
   ```

2. **Redeploy app** or use remote config to disable initialization

3. **Keep legacy provider active** (already running)

### Backend Rollback

1. **Stop sending to Push Platform:**
   ```javascript
   // Send to legacy provider only
   await legacyProvider.send(userId, notification);
   ```

2. **Monitor delivery rates** to confirm rollback successful

### Full Rollback

If complete rollback needed:

1. Remove Push Platform SDK:
   ```bash
   npm uninstall @pushplatform/react-native
   ```

2. Remove initialization code

3. Rebuild and redeploy app

---

## Migration Checklist

- [ ] Install Push Platform SDK
- [ ] Initialize both SDKs (dual registration)
- [ ] Register event handlers for both providers
- [ ] Update backend to send to both with `event_id`
- [ ] Test single notification deduplication
- [ ] Test all app states (foreground/background/terminated)
- [ ] Deploy to test cohort (10% of users)
- [ ] Monitor metrics for 1-2 weeks
- [ ] Expand to 50% of users
- [ ] Monitor for another week
- [ ] Deploy to 100% of users
- [ ] Switch backend to Push Platform only
- [ ] Remove legacy SDK from app
- [ ] Clean up dual registration code

---

## Best Practices

1. **Always use unique event_id:** Generate unique IDs for each notification
2. **Test deduplication thoroughly:** Verify in all app states before production
3. **Monitor during migration:** Track delivery rates and user reports
4. **Gradual rollout:** Don't migrate all users at once
5. **Keep rollback ready:** Maintain legacy provider during migration period
6. **Document backend changes:** Ensure team knows about dual-send period

---

## Support

For migration assistance:
- [API Documentation](API.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/pushplatform/react-native/issues)
