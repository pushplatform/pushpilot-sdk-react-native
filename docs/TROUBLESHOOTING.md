# Troubleshooting — React Native SDK 2.0.1

## Native installation

Install `@pushplatform/react-native@2.0.1` and follow [INSTALLATION.md](INSTALLATION.md).
The native iOS and Android dependencies must both be 2.0.1. Rebuild the native app
after upgrading; restarting Metro does not update native code. Expo requires a
native development or production build; Expo Go does not contain the bridge.

For bare iOS, pin both pods in the Podfile:

```ruby
pod 'PushPlatformExtension', :git => 'https://github.com/pushplatform/pushpilot-sdk-ios.git', :tag => 'v2.0.1'
pod 'PushPlatformSDK', :git => 'https://github.com/pushplatform/pushpilot-sdk-ios.git', :tag => 'v2.0.1'
```

Update an existing installation with `bundle exec pod update PushPlatform PushPlatformSDK PushPlatformExtension --repo-update`.
The Expo plugin configures bundled iOS sources automatically. The Notification Service
Extension imports `PushPlatformExtension`; the main app imports `PushPlatformSDK`.
Android uses the bundled Maven repository at `native/android/maven`, configured as
shown in the installation guide. Keep `google()` and `mavenCentral()` for transitive
dependencies. The RN Android bridge requires API 26 or later.

## Initialization

```typescript
import PushPlatform from '@pushplatform/react-native';

await PushPlatform.initialize({
  applicationId: '00000000-0000-4000-8000-000000000000',
  url: 'https://api.pushpilot.ru',
  debugMode: true,
});
const installationId = await PushPlatform.getInstallationId();
const granted = await PushPlatform.requestPermissions();
```

Use the PushPilot application UUID. Keep the permanent send key on your backend.
Check connectivity, server URL and the native registration response. Concurrent
initializations for the same configuration share one operation; changing application,
server or environment in the same process is rejected. Notification listeners may
be registered before initialization; early events are queued for the corresponding
JS listener. Await initialization before accessing installation state.

## Notification delivery and opens

On iOS, check Push Notifications, APNs environment, provisioning and AppDelegate
callback forwarding. NSE receipts require the same App Group in the app and extension
entitlements and signing profiles. On Android, check the Firebase project,
`google-services.json`, notification permission and channel settings. A host-owned
FirebaseMessagingService must forward messages and refreshed tokens to the native SDK.

JS callbacks require a running JS runtime; native receipt processing and presentation
do not require JS to be loaded. Foreground presentation uses `onNotificationWillDisplay`
and the configured fallback; see [API.md](API.md). Wait until navigation is ready
before handling an open and remove listeners when their owner unmounts. Custom
Android Activities must forward notification intents as described in
[MIGRATION_2.md](MIGRATION_2.md).

## Incoming calls

The host owns PushKit, CallKit, signalling and media. Report a real incoming iOS
VoIP push to CallKit natively before completing PushKit's callback; do not wait
for JS or a socket connection. Android calling UI and its permissions also belong
to the host. Use `notification_type: "voip"`, a short TTL and a call deadline.
Send cancellations through signalling or background transport. See the native
forwarding examples and device test matrix in [MIGRATION_2.md](MIGRATION_2.md).

## Duplicates and diagnostics

PushPilot deduplication covers its own processing. Another provider may still display
the same event independently. Route each recipient/event through one provider or
coordinate deduplication in the host before display. Avoid duplicate listeners.

Use Xcode device logs, `adb logcat` and server delivery records. Include package/native
versions, OS version, application ID, event ID and a minimal reproduction in
[an issue](https://github.com/pushplatform/pushpilot-sdk-react-native/issues).
Remove tokens, private keys and user data from shared logs.
