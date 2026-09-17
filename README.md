# Push Platform React Native SDK

TypeScript SDK for integrating Push Platform's push notification service into React Native applications.

## Features

- 📱 **Cross-platform**: iOS and Android support
- 🔔 **All push types**: Normal push, silent/data-only push, VoIP/call push (iOS)
- 🎯 **Type-safe**: Full TypeScript support with strict typing
- 🔐 **Secure**: No token values exposed to JavaScript layer
- 🔄 **Event deduplication**: Automatic deduplication via event_id/call_id
- ⚡ **Modern architecture**: Native SDK wrappers with zero business logic duplication
- 🔌 **Autolinking**: Automatic native module linking (React Native 0.60+)

## Requirements

- React Native 0.68.0 or higher
- iOS 13.0 or higher
- Android API level 26 (Android 8.0) or higher
- TypeScript 4.5 or higher (recommended)

## Installation

```bash
npm install @pushplatform/react-native
```

### iOS Setup

```bash
cd ios && pod install && cd ..
```

### Android Setup

No additional setup required — autolinking handles Gradle configuration automatically.

## Quick Start

```typescript
import PushPlatform from '@pushplatform/react-native';

// Initialize SDK
await PushPlatform.initialize({
  apiKey: 'your-api-key',
  appId: 'your-app-id',
  environment: 'production',
  debugMode: false,
});

// Get installation ID
const installationId = await PushPlatform.getInstallationId();

// Login user
await PushPlatform.login('user-123');

// Listen for notifications
const subscription = PushPlatform.onNotificationReceived((context) => {
  console.log('Notification received:', context.notification);
  console.log('Foreground:', context.foreground);
});

// Listen for notification opens
PushPlatform.onNotificationOpened((context) => {
  console.log('Notification opened:', context.notification);
  if (context.actionId) {
    console.log('Action clicked:', context.actionId);
  }
});

// Cleanup
subscription.remove();
```

## Documentation

- [Quick Start Guide](docs/QUICK_START.md) — Installation and setup instructions
- [API Reference](docs/API.md) — Complete API documentation
- [Troubleshooting](docs/TROUBLESHOOTING.md) — Common issues and solutions
- [Migration Guide](docs/MIGRATION.md) — Migrating from other push providers

## Architecture

This SDK wraps native iOS (Swift) and Android (Kotlin) SDKs with a unified TypeScript interface. All push notification business logic remains in the native layer per architectural design — the JavaScript bridge only handles event forwarding and API exposure.

- **iOS**: Wraps `PushPlatformSDK` (Swift) via RCTBridgeModule
- **Android**: Wraps `sdk-android` (Kotlin) via ReactContextBaseJavaModule
- **TypeScript**: Type-safe event emitters and Promise-based API

## Security

- Push tokens are never exposed to JavaScript layer
- All token registration handled by native SDKs
- VoIP/CallKit logic remains entirely in Swift (iOS)
- Event callbacks provide registration status only (no token values)

## Event Deduplication

The SDK provides universal event deduplication via `event_id` and `call_id` fields, enabling migration compatibility with any legacy push provider. Native SDKs handle deduplication automatically — duplicate events are filtered before reaching JavaScript.

## Support

- [GitHub Issues](https://github.com/pushplatform/react-native/issues)
- [Documentation](https://docs.pushplatform.example)

## License

MIT

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.
