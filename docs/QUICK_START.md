# Quick Start

Install `@pushplatform/react-native` 2.0.1:

```sh
npm install @pushplatform/react-native@2.0.1
```

The package bridges to Android `sdk-android` 2.0.1 and iOS `PushPlatformSDK` 2.0.1. Android resolves the AAR from `native/android/maven` inside the npm package. iOS autolinking uses the public git-tag pins from the installation guide; the same sources are also in `native/ios` for the Expo plugin. Application developers do not need private Git access or Maven Local.

Complete the platform setup in [INSTALLATION.md](INSTALLATION.md):

- **Expo:** install `expo-dev-client`, add `@pushplatform/react-native` to the Expo plugins with the PushPilot application UUID, APNs environment and Firebase config, then run `npx expo prebuild` and `npx expo run:android` / `npx expo run:ios`. Use a development build. Expo Go does not include this native bridge.
- **Bare React Native:** autolinking connects the bridge; pin both iOS pods to the public `v2.0.1` git tag. Add the bundled Maven repository to the Android repositories, then run `pod install`.

Initialize once during app startup. Notification listeners may be registered before initialization; early native events are queued for the corresponding JS listener. Await initialization before accessing installation state:

```tsx
import PushPlatform from '@pushplatform/react-native';

export async function startPushPlatform() {
  const registration = PushPlatform.onRegistrationUpdated(() => {
    console.info('APNs/FCM token registration updated');
  });

  await PushPlatform.initialize('00000000-0000-4000-8000-000000000000');

  const opened = PushPlatform.onNotificationOpened((context) => {
    console.info('Opened', context.notification.id);
  });

  const installationId = await PushPlatform.getInstallationId();
  const permissionGranted = await PushPlatform.requestPermissions();

  return { installationId, permissionGranted, registration, opened };
}
```

`applicationId` is the PushPilot application UUID, not the iOS bundle identifier or Android application id. No secret key is sent. With no URL the SDK uses https://api.pushpilot.ru. Pass `{ applicationId, url }` to use another server. The native SDK registers APNs/FCM tokens when the operating system provides them; `getDeviceToken()` exposes the ordinary device token after initialization.

On Android, use the application's real `google-services.json`. On iOS, use the APNs environment and signing profile for the build.

See the [API reference](API.md) and [troubleshooting guide](TROUBLESHOOTING.md) for details.
