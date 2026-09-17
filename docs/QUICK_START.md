# Quick Start Guide

Get started with Push Platform React Native SDK in 5 minutes.

## Prerequisites

- React Native 0.68.0 or higher
- iOS 13.0+ / Android 8.0+ (API 26+)
- Node.js 16+ and npm/yarn
- Xcode 14+ (for iOS development)
- Android Studio (for Android development)

## Installation

Install the SDK via npm or yarn:

```bash
npm install @pushplatform/react-native
# or
yarn add @pushplatform/react-native
```

## Platform Setup

### iOS

Install native dependencies with CocoaPods:

```bash
cd ios && pod install && cd ..
```

Add required capabilities to your app's `Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

For VoIP push support (optional), add:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>voip</string>
</array>
```

### Android

Autolinking handles Gradle configuration automatically. No additional setup required.

Add FCM configuration to your `android/app/google-services.json` (obtain from Firebase Console).

## Basic Integration

### 1. Initialize SDK

Initialize the SDK in your app's entry point (e.g., `App.tsx`):

```typescript
import { useEffect } from 'react';
import PushPlatform from '@pushplatform/react-native';

function App() {
  useEffect(() => {
    initializePushPlatform();
  }, []);

  const initializePushPlatform = async () => {
    try {
      await PushPlatform.initialize({
        apiKey: 'your-api-key-here',
        appId: 'your-app-id',
        environment: 'production', // or 'development'
        debugMode: __DEV__, // Enable debug logs in development
      });

      const installationId = await PushPlatform.getInstallationId();
      console.log('Push Platform initialized:', installationId);
    } catch (error) {
      console.error('Failed to initialize Push Platform:', error);
    }
  };

  return <YourApp />;
}
```

### 2. Request Notification Permissions

iOS requires explicit permission request:

```typescript
import { Platform } from 'react-native';
import { requestNotifications } from 'react-native-permissions';

const requestPermissions = async () => {
  if (Platform.OS === 'ios') {
    const { status } = await requestNotifications(['alert', 'badge', 'sound']);
    console.log('Notification permission:', status);
  }
  // Android: Permissions handled automatically on Android 12 and below
  // Android 13+: System prompt shown automatically on first notification
};
```

### 3. Handle Notifications

Listen for notification events:

```typescript
useEffect(() => {
  // Notification received (foreground or background)
  const receivedSubscription = PushPlatform.onNotificationReceived((context) => {
    console.log('Notification received:', context.notification.title);
    console.log('In foreground:', context.foreground);
    console.log('Data:', context.notification.data);
  });

  // Notification opened (user tapped notification)
  const openedSubscription = PushPlatform.onNotificationOpened((context) => {
    console.log('Notification opened:', context.notification.title);
    
    // Handle deep links
    const deeplink = context.notification.data?.deeplink;
    if (deeplink) {
      // Navigate to specific screen
      navigation.navigate(deeplink);
    }

    // Handle action button clicks
    if (context.actionId) {
      console.log('Action clicked:', context.actionId);
    }
  });

  // Cleanup
  return () => {
    receivedSubscription.remove();
    openedSubscription.remove();
  };
}, []);
```

### 4. Associate User (Optional)

Link the installation to a user ID:

```typescript
const loginUser = async (userId: string) => {
  try {
    await PushPlatform.login(userId);
    console.log('User logged in:', userId);
  } catch (error) {
    console.error('Login failed:', error);
  }
};

const logoutUser = async () => {
  try {
    await PushPlatform.logout();
    console.log('User logged out');
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
```

## Sending Test Notification

Use the Push Platform API or dashboard to send a test notification:

```bash
curl -X POST https://api.pushplatform.example/v1/push \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "installation_id": "your-installation-id",
    "notification": {
      "title": "Hello from Push Platform!",
      "body": "Your first push notification",
      "data": {
        "deeplink": "/home"
      }
    }
  }'
```

## Next Steps

- [API Reference](API.md) — Complete API documentation
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues and solutions
- [Migration Guide](MIGRATION.md) — Migrating from other push providers

## Complete Example

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import PushPlatform from '@pushplatform/react-native';

export default function App() {
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  useEffect(() => {
    initializeSDK();
    setupNotificationHandlers();
  }, []);

  const initializeSDK = async () => {
    try {
      await PushPlatform.initialize({
        apiKey: 'your-api-key',
        appId: 'your-app-id',
        environment: 'production',
        debugMode: __DEV__,
      });

      const id = await PushPlatform.getInstallationId();
      setInstallationId(id);
    } catch (error) {
      Alert.alert('Initialization Error', String(error));
    }
  };

  const setupNotificationHandlers = () => {
    PushPlatform.onNotificationReceived((context) => {
      setLastNotification(
        `Received: ${context.notification.title} (foreground: ${context.foreground})`
      );
    });

    PushPlatform.onNotificationOpened((context) => {
      setLastNotification(`Opened: ${context.notification.title}`);
      Alert.alert('Notification Opened', context.notification.title || 'No title');
    });
  };

  const handleLogin = async () => {
    try {
      await PushPlatform.login('user-123');
      Alert.alert('Success', 'User logged in');
    } catch (error) {
      Alert.alert('Login Error', String(error));
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text>Installation ID: {installationId || 'Loading...'}</Text>
      <Text>Last notification: {lastNotification || 'None'}</Text>
      <Button title="Login User" onPress={handleLogin} />
    </View>
  );
}
```
