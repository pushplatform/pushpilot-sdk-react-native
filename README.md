# Push Platform React Native SDK

React Native SDK for Push Platform - TypeScript bridge for iOS and Android native SDKs.

## Installation

```bash
npm install @pushplatform/react-native
```

### iOS Setup

```bash
cd ios && pod install && cd ..
```

### Android Setup

No additional setup required (autolinking via Gradle).

## Quick Start

```typescript
import { PushPlatform } from '@pushplatform/react-native';

// Initialize SDK
await PushPlatform.initialize({
  apiKey: 'your-api-key',
  environment: 'production',
  debug: false,
});

// Request permissions
const granted = await PushPlatform.requestPermissions();

// Listen for notifications
PushPlatform.onNotificationReceived((context) => {
  console.log('Notification received:', context.notification);
});

PushPlatform.onNotificationOpened((context) => {
  console.log('Notification opened:', context.notification);
  // Navigate based on deep link
});

// Login user
await PushPlatform.login('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

## Documentation

- [Quick Start Guide](./docs/QUICK_START.md)
- [API Reference](./docs/API.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Migration Guide](./docs/MIGRATION.md)

## Features

- ✅ Normal push notifications
- ✅ Silent/data-only push
- ✅ iOS VoIP push (CallKit integration in native Swift)
- ✅ Android high-priority call push
- ✅ Foreground/background/terminated notification handling
- ✅ Event deduplication (universal migration compatibility)
- ✅ User login/logout
- ✅ TypeScript support with strict types
- ✅ Autolinking (React Native 0.60+)

## Requirements

- React Native ≥ 0.68.0
- iOS ≥ 13.0
- Android ≥ API 26 (Android 8.0)

## License

MIT
