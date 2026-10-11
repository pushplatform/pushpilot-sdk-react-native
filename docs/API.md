# API Reference

Complete API documentation for Push Platform React Native SDK.

## Table of Contents

- [PushPlatform](#pushplatform)
  - [initialize()](#initialize)
  - [getInstallationId()](#getinstallationid)
  - [login()](#login)
  - [logout()](#logout)
  - [onNotificationReceived()](#onnotificationreceived)
  - [onNotificationOpened()](#onnotificationopened)
- [Types](#types)
  - [PushPlatformConfig](#pushplatformconfig)
  - [Installation](#installation)
  - [PushNotification](#pushnotification)
  - [NotificationContext](#notificationcontext)
  - [SDKError](#sdkerror)

---

## PushPlatform

Main SDK class for Push Platform integration.

### initialize()

Initialize the SDK with your API credentials.

**Must be called once before using any other SDK methods.**

```typescript
static initialize(config: PushPlatformConfig): Promise<void>
```

**Parameters:**

- `config` — SDK configuration object

**Returns:** Promise that resolves when initialization completes

**Throws:** `SDKError` if configuration is invalid or initialization fails

**Example:**

```typescript
await PushPlatform.initialize({
  apiKey: 'YOUR_API_KEY',
  applicationId: '00000000-0000-4000-8000-000000000000',
  apiBaseURL: 'https://api.your-domain.example',
  environment: 'production',
  debugMode: false,
});
```

---

### getInstallationId()

Get the unique installation ID for this device.

The installation ID is a UUID that persists across app sessions and survives app reinstalls.

```typescript
static getInstallationId(): Promise<string>
```

**Returns:** Promise that resolves with installation ID (UUID string)

**Throws:** `SDKError` if SDK not initialized

**Example:**

```typescript
const installationId = await PushPlatform.getInstallationId();
console.log('Installation ID:', installationId);
// Output: "550e8400-e29b-41d4-a716-446655440000"
```

---

### login()

Associate this installation with a user ID.

Links the device installation to a user in your system, enabling user-targeted push notifications.

```typescript
static login(userId: string): Promise<void>
```

**Parameters:**

- `userId` — Your system's user identifier (max 255 characters)

**Returns:** Promise that resolves when login completes

**Throws:** `SDKError` if SDK not initialized or login fails

**Example:**

```typescript
await PushPlatform.login('user-12345');

// Now you can send pushes to this user across all their devices
```

---

### logout()

Dissociate the current user from this installation.

The installation remains active and can still receive broadcast notifications.

```typescript
static logout(): Promise<void>
```

**Returns:** Promise that resolves when logout completes

**Throws:** `SDKError` if SDK not initialized or logout fails

**Example:**

```typescript
await PushPlatform.logout();

// Installation is now anonymous (no user association)
```

---

### onNotificationReceived()

Register a callback for when push notifications are received.

Fires when notifications arrive, whether the app is in foreground or background.

```typescript
static onNotificationReceived(
  callback: (context: NotificationContext) => void
): Subscription
```

**Parameters:**

- `callback` — Function called when notification is received

**Returns:** Subscription object with `remove()` method

**Example:**

```typescript
const subscription = PushPlatform.onNotificationReceived((context) => {
  console.log('Notification received:', context.notification.title);
  console.log('In foreground:', context.foreground);
  
  if (context.notification.data) {
    console.log('Custom data:', context.notification.data);
  }
});

// Later: cleanup
subscription.remove();
```

---

### onNotificationOpened()

Register a callback for when user taps a notification.

Fires when the user opens a notification (app was terminated or backgrounded).

```typescript
static onNotificationOpened(
  callback: (context: NotificationContext) => void
): Subscription
```

**Parameters:**

- `callback` — Function called when notification is opened

**Returns:** Subscription object with `remove()` method

**Example:**

```typescript
const subscription = PushPlatform.onNotificationOpened((context) => {
  console.log('Notification opened:', context.notification.title);
  
  // Handle deep links
  const deeplink = context.notification.data?.deeplink;
  if (deeplink) {
    navigation.navigate(deeplink);
  }
  
  // Handle action button clicks
  if (context.actionId) {
    console.log('User clicked action:', context.actionId);
  }
});

// Later: cleanup
subscription.remove();
```

---

## Types

### PushPlatformConfig

SDK initialization configuration.

```typescript
interface PushPlatformConfig {
  apiKey: string;
  applicationId?: string;
  apiBaseURL: string;
  environment: 'development' | 'production';
  debugMode?: boolean;
}
```

**Fields:**

- `apiKey` — API key from Push Platform dashboard (required)
- `applicationId` — Application UUID used to register the installation. Required by the native iOS and Android SDKs for server registration.
- `apiBaseURL` — Base URL of the PushPlatform API (required)
- `environment` — Target environment: `'development'` or `'production'` (required)
- `debugMode` — Enable verbose logging (optional, default: `false`)

---

### Installation

Installation record from the platform.

```typescript
interface Installation {
  id: string;
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  sdkVersion: string;
  locale: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### PushNotification

Push notification payload.

```typescript
interface PushNotification {
  id: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  category?: string;
  badge?: number;
  sound?: string;
}
```

**Fields:**

- `id` — Unique notification identifier (from `event_id` field)
- `title` — Notification title
- `body` — Notification body text
- `data` — Custom key-value data
- `category` — Notification category (for action buttons)
- `badge` — Badge count (iOS)
- `sound` — Sound name

---

### NotificationContext

Context information about a notification event.

```typescript
interface NotificationContext {
  notification: PushNotification;
  actionId?: string;
  userText?: string;
  foreground: boolean;
}
```

**Fields:**

- `notification` — The notification payload
- `actionId` — Action button identifier (if user clicked action button)
- `userText` — User-entered text (if notification had text input action)
- `foreground` — Whether app was in foreground when notification was received

---

### SDKError

Error object for SDK operations.

```typescript
interface SDKError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

**Error Codes:**

- `NOT_CONFIGURED` — SDK not initialized (call `initialize()` first)
- `INVALID_CONFIG` — Invalid configuration parameters
- `INVALID_ENVIRONMENT` — Invalid environment value
- `NETWORK_ERROR` — Network request failed
- `API_ERROR` — API returned error response
- `INVALID_TOKEN` — Token format invalid
- `MAX_RETRIES_EXCEEDED` — Maximum retry attempts exceeded
- `STORAGE_ERROR` — Failed to access secure storage (Android)
- `KEYCHAIN_ACCESS_DENIED` — Keychain access denied (iOS)
- `INITIALIZATION_FAILED` — SDK initialization failed
- `NOT_INITIALIZED` — SDK not initialized

---

## Advanced Usage

### Multiple Event Listeners

You can register multiple listeners for the same event:

```typescript
const sub1 = PushPlatform.onNotificationReceived((context) => {
  // Handler 1: Update UI
  updateNotificationBadge(context.notification);
});

const sub2 = PushPlatform.onNotificationReceived((context) => {
  // Handler 2: Analytics tracking
  analytics.track('notification_received', {
    id: context.notification.id,
    foreground: context.foreground,
  });
});

// Cleanup both
sub1.remove();
sub2.remove();
```

### Cleanup Pattern

Use React hooks for automatic cleanup:

```typescript
useEffect(() => {
  const subscription = PushPlatform.onNotificationReceived(handleNotification);
  
  return () => subscription.remove();
}, []);
```

### Deep Link Routing

```typescript
PushPlatform.onNotificationOpened((context) => {
  const { data } = context.notification;
  
  if (data?.screen) {
    // Navigate to specific screen
    navigation.navigate(data.screen, data.params);
  } else if (data?.url) {
    // Open web URL
    Linking.openURL(data.url);
  }
});
```

### VoIP/Call Push (iOS Only)

VoIP push notifications are handled automatically by the native iOS SDK. Your JavaScript code receives events after CallKit registration:

```typescript
PushPlatform.onNotificationReceived((context) => {
  const { notification } = context;
  
  if (notification.data?.callId) {
    // Incoming call notification (after CallKit registration)
    showIncomingCallUI(notification.data.callId, notification.title);
  }
});
```

---

## Security Notes

- **Push tokens are never exposed to JavaScript** — Token registration is handled entirely by native SDKs
- **Event callbacks provide registration status only** — No token values are passed to JavaScript
- **VoIP/CallKit logic remains in Swift (iOS)** — JavaScript receives informational events only

---

## See Also

- [Quick Start Guide](QUICK_START.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Migration Guide](MIGRATION.md)
